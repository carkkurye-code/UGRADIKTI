import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

// Handle Google OAuth Popup callback if running inside popup
if (typeof window !== 'undefined' && window.opener && (window.location.hash.includes('id_token=') || window.location.hash.includes('error='))) {
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const idToken = params.get('id_token');
    const error = params.get('error_description') || params.get('error');

    if (idToken) {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', idToken }, window.location.origin);
    } else if (error) {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error }, window.location.origin);
    }
  } catch (e) {
    // Ignore postMessage notice
  }
  setTimeout(() => {
    try {
      window.close();
    } catch (e) {}
  }, 100);
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
