// Must stay the first import. Modules evaluate in import order, so this
// carries the pre-rename storage keys over to their mintoo_* names before any
// store below reads them. Move it down and carts, saved addresses and admin
// sessions all look empty on the first load after the rename.
import './lib/storageMigration';

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

const container = document.getElementById('root')!;

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Tells the watchdog in index.html that React mounted, so it does not clear the
// service worker and reload. Set after render() rather than inside a component
// so it is true for every screen the app can show, including the closed-shop and
// operating-hours gates.
container.setAttribute('data-app-ready', '1');
