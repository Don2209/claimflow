import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource-variable/big-shoulders-display/wght';
import '@fontsource/reenie-beanie/400';
import '@fontsource-variable/noto-sans-ethiopic/wght';
import './styles/index.css';
import { StrictMode, startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { basePath } from './i18n/languages';
import { preloadMotion } from './lib/motion';
import { routerFuture } from './routes';

const container = document.getElementById('root')!;
const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter basename={basePath || '/'} future={routerFuture}>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

// Production pages are prerendered, so hydrate them. The dev server starts empty.
void preloadMotion().then(() => {
  if (container.firstElementChild) {
    // A transition lets the browser handle input between chunks of hydration work.
    startTransition(() => {
      hydrateRoot(container, app);
    });
  } else {
    createRoot(container).render(app);
  }
});
