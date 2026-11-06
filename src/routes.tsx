import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface SiteRoute {
  path: string;
  Component: LazyExoticComponent<ComponentType>;
}

export const routes: SiteRoute[] = [
  { path: '/', Component: lazy(() => import('./pages/Home')) },
  { path: '/product', Component: lazy(() => import('./pages/Product')) },
  { path: '/solutions/insurers', Component: lazy(() => import('./pages/SolutionInsurers')) },
  { path: '/solutions/brokers', Component: lazy(() => import('./pages/SolutionBrokers')) },
  {
    path: '/solutions/loss-adjusters',
    Component: lazy(() => import('./pages/SolutionLossAdjusters')),
  },
  { path: '/security', Component: lazy(() => import('./pages/Security')) },
  { path: '/pilot', Component: lazy(() => import('./pages/Pilot')) },
  { path: '/about', Component: lazy(() => import('./pages/About')) },
  { path: '/demo', Component: lazy(() => import('./pages/Demo')) },
  { path: '/faq', Component: lazy(() => import('./pages/Faq')) },
  { path: '/privacy', Component: lazy(() => import('./pages/Privacy')) },
  { path: '/terms', Component: lazy(() => import('./pages/Terms')) },
  { path: '/credits', Component: lazy(() => import('./pages/Credits')) },
];

export const NotFound = lazy(() => import('./pages/NotFound'));

/** Keeps the current page on screen while the next page's code loads. */
export const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };
