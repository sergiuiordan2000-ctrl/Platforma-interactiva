import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { removeLegacyStorage } from './services/legacyStorageCleanup';

// Faza 5.7: cheile vechi ale prototipului se șterg din browser înainte de pornirea aplicației (D10-5)
removeLegacyStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
