import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
// Import WebAuthn polyfill to add window.webauthn
import { create, get } from '@github/webauthn-json';

// Make sure window.webauthn is available globally with the methods the app expects
(window as any).webauthn = {
  create,
  request: get
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
