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
});

contextBridge.exposeInMainWorld('embedded', {
  navigate: (url) => ipcRenderer.invoke('embedded:navigate', url),
});


