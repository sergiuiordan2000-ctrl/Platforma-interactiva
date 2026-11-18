import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { removeLegacyStorage } from './services/legacyStorageCleanup';
import { registerServiceWorker } from './services/pwaRegister';

// Faza 5.7: cheile vechi ale prototipului se șterg din browser înainte de pornirea aplicației (D10-5)
removeLegacyStorage();

// Lotul PWA: aplicația instalabilă; service worker-ul numai în producție (public/sw.js)
registerServiceWorker(import.meta.env.PROD);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
