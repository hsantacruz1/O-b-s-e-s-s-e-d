import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource/playfair-display/latin-500-italic.css';
import '@fontsource/caveat/latin-700.css';
import './styles/app.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support + installability. Skipped inside iframes/previews where service workers aren't available.
if ('serviceWorker' in navigator && import.meta.env.PROD && window.self === window.top) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}
