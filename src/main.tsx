import { createRoot } from 'react-dom/client';
import { applyMotionClass } from './state/motion';
import App from './ui/App';
import './ui/styles.css';

// Honour prefers-reduced-motion (or a stored override) before the first paint.
applyMotionClass();

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(<App />);

// Offline support only in production builds; a dev service worker would serve stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch(() => {
      // The game runs fine without offline caching.
    });
  });
}
