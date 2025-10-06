const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const keytar = require('keytar');

let mainWindow;
const store = new Store({ name: 'settings' });
const SERVICE_NAME = 'CheckoutChampion';
const SHOW_LOGIN_POPUP_ALWAYS = true; // keep login browser visible for debugging/visibility

const LOGIN_TARGETS = [
  {
    name: 'CRM',
    url: 'https://crm.checkoutchamp.com/',
    isLoginUrl: (url) => /login/i.test(url) || /signin/i.test(url),
  },
  {
    name: 'App',
    url: 'https://app.checkoutchamp.com/login',
    isLoginUrl: (url) => /\/login(\b|\/|\?)/i.test(url),
  },
];

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 680,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hiddenInset',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
    icon: path.join(__dirname, 'favicon.png'),
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      devTools: true,
      spellcheck: false,
    },
  });

  mainWindow.removeMenu();

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock && typeof app.dock.setIcon === 'function') {
    try { app.dock.setIcon(path.join(__dirname, 'favicon.png')); } catch {}
  }
  // Ensure proper taskbar grouping/icon on Windows
  if (process.platform === 'win32') {
    try { app.setAppUserModelId('com.checkout.champion'); } catch {}
  }
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

async function runAutoLoginFlow(credentials) {
  const { username, password } = credentials;
  const popup = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Signing in…',
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    show: true,
    icon: path.join(__dirname, 'favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  try {
    for (const target of LOGIN_TARGETS) {
      await popup.loadURL(target.url);
      await popup.webContents.executeJavaScript(`(async () => {
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        function findUsernameInput() {
          const exact = document.querySelector('input[placeholder="Username"]');
          if (exact) return exact;
          const cands = [
            'input[type=email]',
            'input[name=email]',
            'input[name=username]',
            'input[id*=email i]',
            'input[id*=user i]',
            'input[placeholder*=email i]',
            'input[placeholder*=user i]'
          ];
          for (const sel of cands) {
            const el = document.querySelector(sel);
            if (el) return el;
          }
          const inputs = Array.from(document.querySelectorAll('input'));
          return inputs.find(i => /email|user/i.test(i.name+i.id+i.placeholder)) || null;
        }

        function findPasswordInput() {
          const exact = document.querySelector('input[placeholder="Password"]');
          if (exact) return exact;
          const el = document.querySelector('input[type=password]');
          if (el) return el;
          const inputs = Array.from(document.querySelectorAll('input'));
          return inputs.find(i => /pass/i.test(i.name+i.id+i.placeholder)) || null;
        }

        function findSubmitButton() {
          const specific = document.querySelector('button.checkout-champ-login');
          if (specific) return specific;
          const btns = Array.from(document.querySelectorAll('button, input[type=submit]'));
          const byText = btns.find(b => /log\s*in|sign\s*in|submit/i.test(b.textContent || b.value || ''));
          return byText || btns.find(b => b.type === 'submit') || null;
        }

        function findRememberCheckbox() {
          const cands = [
            'input[type=checkbox][name=remember]',
            'input#remember',
            'input[id*=remember i]',
            'input[name*=remember i]',
            'input[aria-label*=remember i]'
          ];
          for (const sel of cands) {
            const el = document.querySelector(sel);
            if (el) return el;
          }
          // Try matching label text
          const labels = Array.from(document.querySelectorAll('label'));
          const label = labels.find(l => /remember/i.test(l.textContent || ''));
          if (label) {
            const forId = label.getAttribute('for');
            if (forId) {
              const input = document.getElementById(forId);
              if (input && input.type === 'checkbox') return input;
            }
            const nested = label.querySelector('input[type=checkbox]');
            if (nested) return nested;
          }
          return null;
        }

        const u = findUsernameInput();
        const p = findPasswordInput();
        if (!u || !p) {
          const form = document.querySelector('form');
          if (!form) return { ok: false, reason: 'no-form' };
        }

        if (u) { u.focus(); u.value = ${JSON.stringify(username)}; u.dispatchEvent(new Event('input', { bubbles: true })); }
        if (p) { p.focus(); p.value = ${JSON.stringify(password)}; p.dispatchEvent(new Event('input', { bubbles: true })); }

        const r = findRememberCheckbox();
        if (r && !r.checked) { r.click(); r.dispatchEvent(new Event('change', { bubbles: true })); }

        const submit = findSubmitButton() || document.querySelector('form');
        if (submit) {
          if (submit.tagName === 'FORM') submit.requestSubmit ? submit.requestSubmit() : submit.submit();
          else submit.click();
        } else {
          document.activeElement && document.activeElement.form && (document.activeElement.form.requestSubmit ? document.activeElement.form.requestSubmit() : document.activeElement.form.submit());
        }

        const start = Date.now();
        let lastUrl = location.href;
        while (Date.now() - start < 15000) {
          await sleep(500);
          const url = location.href;
          if (url !== lastUrl) lastUrl = url;
          const hasPw = !!document.querySelector('input[type=password]');
          const hasError = !!document.querySelector('[role=alert], .error, .alert-danger, .invalid-feedback');
          if (!hasPw && !/login|signin/i.test(url)) return { ok: true };
          if (hasError) return { ok: false, reason: 'form-error' };
        }
        return { ok: false, reason: 'timeout' };
      })();`, { timeout: 20000 });
    }
    if (!SHOW_LOGIN_POPUP_ALWAYS) popup.close();
    return { ok: true };
  } catch (err) {
    if (!SHOW_LOGIN_POPUP_ALWAYS) popup.close();
    return { ok: false, message: err?.message || String(err) };
  }
}

ipcMain.handle('auth:getSaved', async () => {
  const username = store.get('username') || '';
  const remember = !!store.get('remember');
  let hasPassword = false;
  if (username) {
    try { hasPassword = !!(await keytar.getPassword(SERVICE_NAME, username)); } catch {}
  }
  return { username, remember, hasPassword };
});

ipcMain.handle('auth:getPassword', async () => {
  const username = store.get('username') || '';
  const remember = !!store.get('remember');
  if (!username || !remember) return '';
  try { return (await keytar.getPassword(SERVICE_NAME, username)) || ''; } catch { return ''; }
});

ipcMain.handle('auth:clear', async () => {
  const username = store.get('username');
  if (username) {
    try { await keytar.deletePassword(SERVICE_NAME, username); } catch {}
  }
  store.delete('username');
  store.delete('remember');
  return { ok: true };
});

ipcMain.handle('auth:save', async (_e, payload) => {
  const { username, password, remember } = payload || {};
  if (!username) return { ok: false };
  try {
    store.set('username', username);
    store.set('remember', !!remember);
    if (remember && password) {
      await keytar.setPassword(SERVICE_NAME, username, password);
    } else {
      try { await keytar.deletePassword(SERVICE_NAME, username); } catch {}
    }
  } catch {}
  return { ok: true };
});

ipcMain.handle('auth:login', async (_e, payload) => {
  const { username, password, remember } = payload || {};
  if (!username || !password) return { ok: false, message: 'Missing credentials' };
  const result = await runAutoLoginFlow({ username, password });
  if (!result.ok) return { ok: false, message: result.message || 'Login failed' };

  try {
    store.set('username', username);
    store.set('remember', !!remember);
    if (remember) await keytar.setPassword(SERVICE_NAME, username, password);
  } catch (e) {
    // proceed even if persistence fails
  }
  return { ok: true };
});

ipcMain.handle('auth:loginWithSaved', async () => {
  const username = store.get('username');
  const remember = !!store.get('remember');
  if (!username || !remember) return { ok: false, message: 'No saved credentials' };
  let password = '';
  try { password = await keytar.getPassword(SERVICE_NAME, username) || ''; } catch {}
  if (!password) return { ok: false, message: 'Saved password missing' };
  const result = await runAutoLoginFlow({ username, password });
  if (!result.ok) return { ok: false, message: result.message || 'Login failed' };
  return { ok: true };
});

ipcMain.handle('embedded:navigate', async (_e, url) => {
  try {
    if (!mainWindow || !url) return { ok: false };
    // No-op here; navigation is handled in renderer via webview src. Keep for future needs.
    return { ok: true };
  } catch {
    return { ok: false };
  }
});


