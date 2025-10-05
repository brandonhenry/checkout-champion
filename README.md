# Checkout Champion

Enhanced checkout champ experience

## Run

```bash
npm install
npm run start
```

## Features

- Dual-site sign-in to Checkout CRM and Checkout Champ
- Secure storage: username in app store; password in OS keychain via keytar
- Context isolation; no Node globals in the DOM

## Files

- `main.js` – app window + automated login popup and IPC
- `preload.js` – exposes `window.auth` APIs
- `renderer/` – UI (HTML, CSS, JS)

## Targets

- CRM: https://crm.checkoutchamp.com/
- App: https://app.checkoutchamp.com/login
