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
      const res = await window.auth.login({
        username: email.value.trim(),
        password: password.value,
        remember: remember.checked,
      });
      if (!res?.ok) { setError(res?.message || 'Login failed'); setLoading(false); return; }
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
      const res = await window.auth.loginWithSaved();
      if (!res?.ok) { setError(res?.message || 'Login failed'); setLoading(false); return; }
      setLoading(false);
      toLoggedIn();
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

