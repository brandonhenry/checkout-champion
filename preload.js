const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Checkout Champion',
  version: '0.1.0',
});

contextBridge.exposeInMainWorld('auth', {
  getSaved: () => ipcRenderer.invoke('auth:getSaved'),
  clear: () => ipcRenderer.invoke('auth:clear'),
  login: (payload) => ipcRenderer.invoke('auth:login', payload),
  loginWithSaved: () => ipcRenderer.invoke('auth:loginWithSaved'),
  save: (payload) => ipcRenderer.invoke('auth:save', payload),
  getPassword: () => ipcRenderer.invoke('auth:getPassword'),
});

contextBridge.exposeInMainWorld('embedded', {
  navigate: (url) => ipcRenderer.invoke('embedded:navigate', url),
});

contextBridge.exposeInMainWorld('products', {
  save: (items) => ipcRenderer.invoke('products:save', items),
  get: () => ipcRenderer.invoke('products:get'),
  has: () => ipcRenderer.invoke('products:has'),
  openViewer: () => ipcRenderer.invoke('products:openViewer'),
});


contextBridge.exposeInMainWorld('qa', {
  open: () => ipcRenderer.invoke('qa:open')
});


contextBridge.exposeInMainWorld('campaigns', {
  save: (items) => ipcRenderer.invoke('campaigns:save', items),
  get: () => ipcRenderer.invoke('campaigns:get'),
  has: () => ipcRenderer.invoke('campaigns:has'),
  openViewer: () => ipcRenderer.invoke('campaigns:openViewer'),
});

contextBridge.exposeInMainWorld('funnels', {
  save: (items) => ipcRenderer.invoke('funnels:save', items),
  get: () => ipcRenderer.invoke('funnels:get'),
  has: () => ipcRenderer.invoke('funnels:has'),
  openViewer: () => ipcRenderer.invoke('funnels:openViewer'),
});


