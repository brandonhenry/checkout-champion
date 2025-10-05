const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  name: 'Checkout Champion',
  version: '0.1.0',
});


