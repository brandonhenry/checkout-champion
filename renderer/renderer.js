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
  const crmLoadProducts = document.getElementById('crm-load-products');
  const crmViewProducts = document.getElementById('crm-view-products');
  const crmLoadCampaigns = document.getElementById('crm-load-campaigns');
  const crmViewCampaigns = document.getElementById('crm-view-campaigns');
  const appBack = document.getElementById('app-back');
  const appForward = document.getElementById('app-forward');
  const appReload = document.getElementById('app-reload');
  const appOpen = document.getElementById('app-open');
  const appDevtools = document.getElementById('app-devtools');
  const appLoadFunnel = document.getElementById('app-load-funnel');
  const appViewFunnels = document.getElementById('app-view-funnels');
  const funnelModal = document.getElementById('funnel-modal');
  const funnelUrlInput = document.getElementById('funnel-url');
  const funnelCancel = document.getElementById('funnel-cancel');
  const funnelLoad = document.getElementById('funnel-load');
  const reloadBoth = document.getElementById('reload-both');
  const qaOpen = document.getElementById('qa-open');
  const tabCrm = document.getElementById('tab-crm');
  const tabApp = document.getElementById('tab-app');
  const webviewCols = [...document.querySelectorAll('.webview-grid .webview-col')];

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
    // Prefill password if available in secure storage
    try {
      const savedPassword = await window.auth.getPassword();
      if (savedPassword) password.value = savedPassword;
    } catch {}
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

  qaOpen?.addEventListener('click', async () => {
    try { await window.qa.open(); } catch {}
  });

  // Nav toggle behavior (collapsed by default)
  function setNavCollapsed(scope, collapsed){
    const wrapper = document.querySelector(`.nav-controls .nav-controls-content[data-scope="${scope}"]`)?.parentElement;
    if (!wrapper) return;
    wrapper.classList.toggle('collapsed', !!collapsed);
    const toggleBtn = wrapper.querySelector('.nav-toggle');
    if (toggleBtn) toggleBtn.textContent = collapsed ? 'Show Navigation' : 'Hide Navigation';
  }

  document.querySelectorAll('.nav-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const scope = btn.getAttribute('data-target');
      const wrapper = btn.closest('.nav-controls');
      const nowCollapsed = !wrapper.classList.contains('collapsed');
      setNavCollapsed(scope, nowCollapsed);
      try { localStorage.setItem(`navCollapsed:${scope}`, JSON.stringify(nowCollapsed)); } catch {}
    });
  });

  // default collapsed unless user previously expanded
  ['crm','app'].forEach(scope => {
    let collapsed = true;
    try {
      const saved = localStorage.getItem(`navCollapsed:${scope}`);
      if (saved !== null) collapsed = JSON.parse(saved);
    } catch {}
    setNavCollapsed(scope, collapsed);
  });

  async function refreshProductsButton(){
    try {
      const has = await window.products.has();
      if (crmViewProducts){
        crmViewProducts.style.display = has ? 'block' : 'none';
        crmViewProducts.classList.toggle('rainbow', has);
      }
    } catch {}
  }

  await refreshProductsButton();

  crmViewProducts?.addEventListener('click', async () => {
    try { await window.products.openViewer(); } catch {}
  });

  crmLoadProducts?.addEventListener('click', async () => {
    if (!viewCrm) return;
    try {
      // Ensure we're on products listing page
      const targetUrl = 'https://crm.checkoutchamp.com/crm/products/';
      try {
        const current = await viewCrm.getURL();
        if (!/\/crm\/products\/?/i.test(current || '')) {
          viewCrm.src = targetUrl;
        }
      } catch { viewCrm.src = targetUrl; }

      // wait for load
      await new Promise((resolve) => {
        const onStop = () => { viewCrm.removeEventListener('did-stop-loading', onStop); resolve(); };
        viewCrm.addEventListener('did-stop-loading', onStop);
      });

      // small delay to allow dynamic content to render
      await new Promise(r => setTimeout(r, 2000));

      // scrape table rows into products
      const items = await viewCrm.executeJavaScript(`(() => {
        function text(el){ return (el?.textContent || '').trim(); }
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        const out = [];
        for (const r of rows){
          const id = text(r.querySelector('[colkey="productId"]'));
          const img = r.querySelector('[colkey="productImg"] img')?.getAttribute('src') || '';
          const name = text(r.querySelector('[colkey="name"]'));
          const sku = text(r.querySelector('[colkey="sku"]'));
          const msrp = text(r.querySelector('[colkey="msrp"]'));
          const cost = text(r.querySelector('[colkey="cost"]'));
          const editHref = r.querySelector('a[href*="/crm/products/edit/"]')?.getAttribute('href') || '';
          const dupHref = r.querySelector('a[href*="/crm/products/add/?duplicateId="]')?.getAttribute('href') || '';
          if (id || name){
            out.push({
              id,
              name,
              sku,
              msrp,
              cost,
              image: img,
              editUrl: editHref ? new URL(editHref, location.origin).toString() : '',
              duplicateUrl: dupHref ? new URL(dupHref, location.origin).toString() : '',
            });
          }
        }
        return out;
      })();`);

      await window.products.save(items || []);
      await refreshProductsButton();
      alert(`Loaded ${items?.length || 0} products`);
    } catch (e) {
      alert('Failed to load products');
    }
  });

  // Campaigns: refresh/View wiring
  async function refreshCampaignsButton(){
    try {
      const has = await window.campaigns.has();
      if (crmViewCampaigns){
        crmViewCampaigns.style.display = has ? 'block' : 'none';
        crmViewCampaigns.classList.toggle('rainbow', has);
      }
    } catch {}
  }

  await refreshCampaignsButton();
  // Funnels: refresh/View wiring
  async function refreshFunnelsButton(){
    try {
      const has = await window.funnels.has();
      if (appViewFunnels){
        appViewFunnels.style.display = has ? 'block' : 'none';
        appViewFunnels.classList.toggle('rainbow', has);
      }
    } catch {}
  }

  await refreshFunnelsButton();


  crmViewCampaigns?.addEventListener('click', async () => {
    try { await window.campaigns.openViewer(); } catch {}
  });

  crmLoadCampaigns?.addEventListener('click', async () => {
    if (!viewCrm) return;
    try {
      // Ensure we're on campaigns listing page
      const targetUrl = 'https://crm.checkoutchamp.com/crm/campaigns/';
      try {
        const current = await viewCrm.getURL();
        if (!/\/crm\/campaigns\/?/i.test(current || '')) {
          viewCrm.src = targetUrl;
        }
      } catch { viewCrm.src = targetUrl; }

      // wait for load
      await new Promise((resolve) => {
        const onStop = () => { viewCrm.removeEventListener('did-stop-loading', onStop); resolve(); };
        viewCrm.addEventListener('did-stop-loading', onStop);
      });

      // small delay to allow dynamic content to render
      await new Promise(r => setTimeout(r, 2000));

      // scrape table rows into campaigns
      const items = await viewCrm.executeJavaScript(`(() => {
        function text(el){ return (el?.textContent || '').trim(); }
        const rows = Array.from(document.querySelectorAll('table tbody tr'));
        const out = [];
        for (const r of rows){
          const id = text(r.querySelector('[colkey="campaignId"]'));
          const name = text(r.querySelector('[colkey="campaignName"]'));
          const type = text(r.querySelector('[colkey="campaignType"]'));
          const currency = text(r.querySelector('[colkey="currency"]'));
          const offers = text(r.querySelector('[colkey="offersCnt"]'));
          const upsells = text(r.querySelector('[colkey="upsellsCnt"]'));
          const editHref = r.querySelector('a[href*="/crm/campaigns/edit/?campaignId="]')?.getAttribute('href') || '';
          if (id || name){
            out.push({
              id,
              name,
              type,
              currency,
              offers,
              upsells,
              editUrl: editHref ? new URL(editHref, location.origin).toString() : '',
            });
          }
        }
        return out;
      })();`);

      await window.campaigns.save(items || []);
      await refreshCampaignsButton();
      alert(`Loaded ${items?.length || 0} campaigns`);
    } catch (e) {
      alert('Failed to load campaigns');
    }
  });

  function setActiveTab(target){
    const isCrm = target === 'crm';
    // First col is CRM, second is App (per index.html order)
    const crmCol = webviewCols[0];
    const appCol = webviewCols[1];
    if (crmCol && appCol){
      crmCol.classList.toggle('hidden', !isCrm);
      appCol.classList.toggle('hidden', isCrm);
    }
    tabCrm?.classList.toggle('active', isCrm);
    tabApp?.classList.toggle('active', !isCrm);
  }

  tabCrm?.addEventListener('click', () => setActiveTab('crm'));
  tabApp?.addEventListener('click', () => setActiveTab('app'));
  // default to CRM visible
  setActiveTab('crm');
  // expose for automations
  window.setActiveTab = setActiveTab;

  // Funnel modal helpers
  function openFunnelModal(prefill = ''){
    if (!funnelModal) return;
    try {
      funnelUrlInput.value = prefill || '';
      funnelModal.hidden = false;
      setTimeout(() => { try { funnelUrlInput.focus(); funnelUrlInput.select(); } catch {} }, 0);
    } catch {}
  }
  function closeFunnelModal(){
    if (!funnelModal) return;
    try { funnelModal.hidden = true; } catch {}
  }

  // Open modal on button
  appLoadFunnel?.addEventListener('click', async () => {
    // Ensure we're on funnels listing page first (load funnels)
    try {
      if (viewApp) {
        const targetUrl = 'https://app.checkoutchamp.com/funnels';
        try {
          const current = await viewApp.getURL();
          if (!/\/funnels(\b|\/|\?|$)/i.test(current || '')) viewApp.src = targetUrl;
        } catch { viewApp.src = targetUrl; }
        // wait for load
        await new Promise((resolve) => {
          const onStop = () => { viewApp.removeEventListener('did-stop-loading', onStop); resolve(); };
          viewApp.addEventListener('did-stop-loading', onStop);
        });
        // small delay for dynamic render (increased to 5s)
        await new Promise(r => setTimeout(r, 5000));
        // scrape funnels from provided table structure
        const items = await viewApp.executeJavaScript(`(() => {
          function text(el){ return (el?.textContent || '').trim(); }
          const rows = Array.from(document.querySelectorAll('table.funnel-list-view-table tr.funnel-list-view-tdr'));
          const out = [];
          for (const r of rows){
            const id = text(r.querySelector('.funnel-list-view-td:nth-child(1) h6'));
            const name = text(r.querySelector('.funnel-list-view-td:nth-child(2) h6'));
            const user = text(r.querySelector('.funnel-list-view-td:nth-child(3) h6'));
            const domain = text(r.querySelector('.funnel-list-view-td:nth-child(4) h6'));
            const pages = text(r.querySelector('.funnel-list-view-td:nth-child(5) h6'));
            const created = text(r.querySelector('.funnel-list-view-td:nth-child(6) h6'));
            const published = text(r.querySelector('.funnel-list-view-td:nth-child(7) h6'));
            const status = text(r.querySelector('.funnel-list-view-td:nth-child(8) h6'));
            const liveAnchor = r.querySelector('.funnel-list-view-td:nth-child(9) a[href]');
            const liveUrl = liveAnchor ? new URL(liveAnchor.getAttribute('href'), location.origin).toString() : '';
            const editBtn = r.querySelector('.funnel-list-view-td:nth-child(9) .btn.btn-edit-color');
            out.push({ id, name, user, domain, pages, created, published, status, liveUrl, hasEdit: !!editBtn });
          }
          return out;
        })();`);
        await window.funnels.save(items || []);
        // update view button
        try {
          const has = await window.funnels.has();
          if (appViewFunnels){ appViewFunnels.style.display = has ? 'block' : 'none'; appViewFunnels.classList.toggle('rainbow', has); }
        } catch {}
        alert(`Loaded ${items?.length || 0} funnels`);
        setActiveTab('app');
      }
    } catch {
      openFunnelModal();
    }
  });

  appViewFunnels?.addEventListener('click', async () => {
    try { await window.funnels.openViewer(); } catch {}
  });
  // Cancel closes modal
  funnelCancel?.addEventListener('click', closeFunnelModal);
  // Submit loads URL
  funnelLoad?.addEventListener('click', () => {
    try {
      let url = (funnelUrlInput?.value || '').trim();
      if (!url) { closeFunnelModal(); return; }
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      try {
        const u = new URL(url);
        if (viewApp) {
          viewApp.src = u.toString();
          setActiveTab('app');
        }
        closeFunnelModal();
      } catch {}
    } catch {}
  });
  // Enter key submits
  funnelUrlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); funnelLoad?.click(); }
    if (e.key === 'Escape') { e.preventDefault(); closeFunnelModal(); }
  });
});

async function automateInWebview(view, { username, password }, opts = {}) {
  if (!view) return;
  await new Promise((resolve) => {
    if (view.isLoading()) {
      const onStop = () => { view.removeEventListener('did-stop-loading', onStop); resolve(); };
      view.addEventListener('did-stop-loading', onStop);
    } else resolve();
  });
  try {
    // If required, ensure we're on a login page and the username input exists; otherwise skip
    if (opts && opts.requireLoginPath) {
      const checks = await view.executeJavaScript(`(() => {
        const href = location.href || '';
        const pathname = (location.pathname || '').toLowerCase();
        const isLoginUrl = /\/login(\b|\/|\?)/i.test(pathname) || /login|signin/i.test(href);
        const hasUsername = !!(document.querySelector('input[placeholder="Username"]')
          || document.querySelector('input[type=email]')
          || document.querySelector('input[name=email]')
          || document.querySelector('input[name=username]')
          || Array.from(document.querySelectorAll('input')).find(i => /email|user/i.test((i.name||'')+(i.id||'')+(i.placeholder||''))));
        return { isLoginUrl, hasUsername };
      })();`);
      if (!checks?.isLoginUrl || !checks?.hasUsername) return; // already logged in or not on login page; skip
    }
  } catch {}
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

