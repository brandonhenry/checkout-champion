window.addEventListener('DOMContentLoaded', async () => {
  const versionEl = document.getElementById('version');
  if (versionEl && window.appInfo) versionEl.textContent = window.appInfo.version;

  const authView = document.getElementById('auth-view');
  const appView = document.getElementById('app-view');
  const form = document.getElementById('login-form');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const remember = document.getElementById('remember');
  const error = document.getElementById('error');
  const signin = document.getElementById('signin');
  const signinSaved = document.getElementById('signinSaved');
  const signout = document.getElementById('signout');
  const viewCrm = document.getElementById('webview-crm');
  const viewApp = document.getElementById('webview-app');
  const crmBack = document.getElementById('crm-back');
  const crmForward = document.getElementById('crm-forward');
  const crmReload = document.getElementById('crm-reload');
  const crmOpen = document.getElementById('crm-open');
  const crmDevtools = document.getElementById('crm-devtools');
  const appBack = document.getElementById('app-back');
  const appForward = document.getElementById('app-forward');
  const appReload = document.getElementById('app-reload');
  const appOpen = document.getElementById('app-open');
  const appDevtools = document.getElementById('app-devtools');
  const reloadBoth = document.getElementById('reload-both');

  function setLoading(loading) {
    signin.disabled = loading;
    signinSaved.disabled = loading;
    form.querySelectorAll('input').forEach(i => i.disabled = loading);
    signin.textContent = loading ? 'Signing in…' : 'Sign In';
  }

  function setError(msg) {
    if (!msg) { error.hidden = true; error.textContent = ''; return; }
    error.hidden = false; error.textContent = msg;
  }

  function toLoggedIn() {
    document.body.classList.add('logged-in');
  }

  function toLoggedOut() {
    document.body.classList.remove('logged-in');
    // Keep both visible; controls will hide via CSS when not logged in
  }

  try {
    const saved = await window.auth.getSaved();
    if (saved?.username) {
      email.value = saved.username;
      remember.checked = !!saved.remember;
    }
    if (signinSaved) signinSaved.disabled = !saved?.hasPassword;
  } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      if (viewApp) viewApp.src = 'https://app.checkoutchamp.com/login';
      if (viewCrm) viewCrm.src = 'https://crm.checkoutchamp.com/';
      const creds = { username: email.value.trim(), password: password.value };
      await Promise.all([
        automateInWebview(viewApp, creds),
        automateInWebview(viewCrm, creds),
      ]);
      await Promise.all([
        waitUntilLoggedIn(viewApp),
        waitUntilLoggedIn(viewCrm),
      ]);
      try { await window.auth.save({ username: creds.username, password: creds.password, remember: !!remember.checked }); } catch {}
      if (signinSaved) signinSaved.disabled = !remember.checked;
      setLoading(false);
      toLoggedIn();
    } catch (err) {
      setLoading(false);
      setError('Login error');
    }
  });

  signinSaved.addEventListener('click', async () => {
    setError('');
    setLoading(true);
    try {
      const saved = await window.auth.getSaved();
      const pwd = await window.auth.getPassword();
      const username = saved?.username || '';
      if (!username || !pwd) throw new Error('No saved credentials');
      await new Promise(r => setTimeout(r, 100));
      if (viewApp) viewApp.src = 'https://app.checkoutchamp.com/login';
      if (viewCrm) viewCrm.src = 'https://crm.checkoutchamp.com/';
      const creds = { username, password: pwd };
      await Promise.all([
        automateInWebview(viewApp, creds),
        automateInWebview(viewCrm, creds),
      ]);
      await Promise.all([
        waitUntilLoggedIn(viewApp),
        waitUntilLoggedIn(viewCrm),
      ]);
      setLoading(false);
      toLoggedIn();
    } catch (err) {
      setLoading(false);
      setError(err?.message || 'Login error');
    }
  });

  signout?.addEventListener('click', async () => {
    await window.auth.clear();
    if (signinSaved) signinSaved.disabled = true;
    toLoggedOut();
  });

  // Sidebar controls wiring
  function attachNavHandlers(prefix, view){
    const back = document.getElementById(`${prefix}-back`);
    const forward = document.getElementById(`${prefix}-forward`);
    const reload = document.getElementById(`${prefix}-reload`);
    const open = document.getElementById(`${prefix}-open`);
    const devtools = document.getElementById(`${prefix}-devtools`);
    if (!view) return;
    back?.addEventListener('click', () => { try { view.goBack(); } catch {} });
    forward?.addEventListener('click', () => { try { view.goForward(); } catch {} });
    reload?.addEventListener('click', () => { try { view.reload(); } catch {} });
    open?.addEventListener('click', async () => {
      try {
        const url = await view.getURL();
        if (url) window.open(url, '_blank');
      } catch {}
    });
    devtools?.addEventListener('click', () => {
      try {
        if (view.isDevToolsOpened && view.isDevToolsOpened()) view.closeDevTools();
        else view.openDevTools();
      } catch {}
    });
  }

  attachNavHandlers('crm', viewCrm);
  attachNavHandlers('app', viewApp);
  reloadBoth?.addEventListener('click', () => { try { viewCrm?.reload(); viewApp?.reload(); } catch {} });
});

async function automateInWebview(view, { username, password }) {
  if (!view) return;
  await new Promise((resolve) => {
    if (view.isLoading()) {
      const onStop = () => { view.removeEventListener('did-stop-loading', onStop); resolve(); };
      view.addEventListener('did-stop-loading', onStop);
    } else resolve();
  });
  try {
    await view.executeJavaScript(`(async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      function setReactInputValue(input, value){
        try {
          const { set } = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          set.call(input, value);
        } catch { input.value = value; }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      function q(sel){ return document.querySelector(sel); }
      function findU(){
        const exact = q('input[placeholder="Username"]');
        if (exact) return exact;
        const c = ['input[type=email]','input[name=email]','input[name=username]','input[id*=email i]','input[id*=user i]','input[placeholder*=email i]','input[placeholder*=user i]'];
        for (const sel of c){ const el=q(sel); if (el) return el; }
        const inputs=[...document.querySelectorAll('input')];
        return inputs.find(i=>/email|user/i.test(i.name+i.id+i.placeholder))||null;
      }
      function findP(){
        const exact=q('input[placeholder="Password"]');
        if (exact) return exact;
        return q('input[type=password]') || null;
      }
      function findSubmit(){
        const specific=q('button.checkout-champ-login');
        if (specific) return specific;
        const btns=[...document.querySelectorAll('button, input[type=submit]')];
        const byText=btns.find(b=>/log\\s*in|sign\\s*in|submit/i.test(b.textContent||b.value||''));
        return byText||btns.find(b=>b.type==='submit')||null;
      }
      function findRemember(){
        const c=['input[type=checkbox][name=remember]','input#remember','input[id*=remember i]','input[name*=remember i]','input[aria-label*=remember i]'];
        for (const sel of c){ const el=q(sel); if (el) return el; }
        const labels=[...document.querySelectorAll('label')];
        const label=labels.find(l=>/remember/i.test(l.textContent||''));
        if (label){
          const forId=label.getAttribute('for');
          if (forId){ const input=document.getElementById(forId); if (input&&input.type==='checkbox') return input; }
          const nested=label.querySelector('input[type=checkbox]');
          if (nested) return nested;
        }
        return null;
      }
      const u=findU();
      const p=findP();
      if (u){ u.focus(); setReactInputValue(u, ${JSON.stringify(username)}); }
      if (p){ p.focus(); setReactInputValue(p, ${JSON.stringify(password)}); }
      const r=findRemember(); if (r && !r.checked){ r.click(); r.dispatchEvent(new Event('change',{bubbles:true})); }
      const submit=findSubmit() || document.querySelector('form');
      if (submit){ if (submit.tagName==='FORM') (submit.requestSubmit?submit.requestSubmit():submit.submit()); else submit.click(); }
      return true;
    })();`, { userGesture: true });
  } catch {}
}

async function waitUntilLoggedIn(view, timeoutMs = 15000) {
  if (!view) return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Wait for loading to settle if navigating
      if (view.isLoading()) {
        await new Promise((resolve) => {
          const onStop = () => { view.removeEventListener('did-stop-loading', onStop); resolve(); };
          view.addEventListener('did-stop-loading', onStop);
        });
      }
      const stillOnLogin = await view.executeJavaScript(`(() => {
        const hasPw = !!document.querySelector('input[type=password]');
        const isLoginUrl = /login|signin/i.test(location.href);
        return hasPw || isLoginUrl;
      })();`);
      if (!stillOnLogin) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

