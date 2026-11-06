import { lazy, type ComponentType } from 'react';

const marker = 'data-deferred-hydration';

/** Put on an element wrapping the deferred boundary. Its presence means the HTML was prerendered. */
export const deferredMarker = { [marker]: '' };

/** Resolves on first sign of a person using the page, or when the browser is idle after a wait. */
function whenPageIsInUse(): Promise<void> {
  return new Promise((resolve) => {
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    const done = () => {
      events.forEach((name) => window.removeEventListener(name, done));
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 9000);
    events.forEach((name) => window.addEventListener(name, done, { passive: true, once: true }));
  });
}

/**
 * React.lazy that holds back hydration of prerendered, below-the-fold content until it is likely
 * to be needed. The HTML is already on screen. In-site navigation loads straight away.
 */
export function deferredLazy<T extends ComponentType>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    if (typeof document !== 'undefined' && document.querySelector(`[${marker}]`)) {
      await whenPageIsInUse();
    }
    return load();
  });
}
