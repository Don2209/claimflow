import { Writable } from 'node:stream';
import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { HelmetProvider, type HelmetServerState } from 'react-helmet-async';
import { StaticRouter } from 'react-router-dom/server';
import { App } from './App';
import { preloadMotion } from './lib/motion';
import { basePath, languages, translatedRoutes as translated } from './i18n/languages';
import { routerFuture, routes } from './routes';

export const routePaths = routes.map((route) => route.path);
export const translatedRoutes = translated;
export const languageCodes = languages
  .filter((language) => language.reviewed)
  .map((language) => language.code);

/** Renders one route to HTML for scripts/prerender.mjs, waiting for all lazy chunks. */
export async function render(url: string): Promise<{ html: string; head: string }> {
  await preloadMotion();
  const helmetContext: { helmet?: HelmetServerState } = {};

  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
      final(callback) {
        const { helmet } = helmetContext;
        const head = helmet
          ? [helmet.title, helmet.meta, helmet.link].map((part) => part.toString()).join('\n    ')
          : '';
        resolve({ html, head });
        callback();
      },
    });

    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <HelmetProvider context={helmetContext}>
          <StaticRouter
            basename={basePath || '/'}
            location={`${basePath}${url}`}
            future={routerFuture}
          >
            <App />
          </StaticRouter>
        </HelmetProvider>
      </StrictMode>,
      {
        onAllReady: () => pipe(sink),
        onShellError: reject,
        onError: reject,
      },
    );
  });
}
