import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { analyticsSrc } from './lib/site';
import { MotionProvider } from './lib/motion';
import { NotFound, routes } from './routes';

const CookieNotice = lazy(() => import('./components/CookieNotice'));

export function App() {
  return (
    <MotionProvider>
      <Layout>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            {routes.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
      {analyticsSrc && (
        <Suspense fallback={null}>
          <CookieNotice />
        </Suspense>
      )}
    </MotionProvider>
  );
}
