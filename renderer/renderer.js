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
    authView.hidden = true;
    appView.hidden = false;
  }

  function toLoggedOut() {
    appView.hidden = true;
    authView.hidden = false;
  }

  try {
    const saved = await window.auth.getSaved();
    if (saved?.username) {
      email.value = saved.username;
      remember.checked = !!saved.remember;
    }
  } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Navigate embedded views and attempt in-view automation for both
      toLoggedIn();
      await new Promise(r => setTimeout(r, 100));
      if (viewApp) viewApp.src = 'https://app.checkoutchamp.com/login';
      if (viewCrm) viewCrm.src = 'https://crm.checkoutchamp.com/';
      const creds = { username: email.value.trim(), password: password.value };
      await Promise.all([
        automateInWebview(viewApp, creds),
        automateInWebview(viewCrm, creds),
      ]);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError('Login error');
    }
  });

  signinSaved.addEventListener('click', async () => {
    setError('');
    setLoading(true);
    try {
      toLoggedIn();
      await new Promise(r => setTimeout(r, 100));
      if (viewApp) viewApp.src = 'https://app.checkoutchamp.com/login';
      if (viewCrm) viewCrm.src = 'https://crm.checkoutchamp.com/';
      // We rely on site remember-me for saved session; no credentials here
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError('Login error');
    }
  });

  signout?.addEventListener('click', async () => {
    await window.auth.clear();
    toLoggedOut();
  });
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

