import { LazyMotion, MotionConfig, type FeatureBundle } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

let features: FeatureBundle | undefined;

/**
 * Fetches Framer Motion's animation engine. Called before hydrating, because loading it
 * afterwards would update context while lazy sections are still hydrating.
 */
export async function preloadMotion() {
  features = (await import('./motion-features')).default;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={features!} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

/** Like Framer's useReducedMotion, but starts false so hydration matches the prerendered HTML. */
export function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}
