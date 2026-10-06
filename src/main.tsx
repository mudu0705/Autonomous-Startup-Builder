import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully handle preview environment WebSocket connection rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      typeof reason === 'string'
        ? reason
        : reason instanceof Error
        ? reason.message
        : String(reason || '');

    if (
      msg.includes('WebSocket closed without opened') ||
      msg.includes('failed to connect to websocket')
    ) {
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.info(
        '[AI Studio Preview] Dev WebSocket connection closed by preview proxy or iframe. Application is running normally.'
      );
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
