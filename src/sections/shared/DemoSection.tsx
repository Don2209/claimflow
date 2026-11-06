import { Suspense, lazy } from 'react';
import { Section } from '@/components/Section';

const InteractiveDemo = lazy(() =>
  import('@/demo/InteractiveDemo').then((module) => ({ default: module.InteractiveDemo })),
);

export function DemoSection({ title, lead }: { title: string; lead: string }) {
  return (
    <Section id="try-it" tone="ink" title={title} lead={lead}>
      <Suspense
        fallback={<div className="min-h-[40rem] rounded-xl border border-line bg-canvas" />}
      >
        <InteractiveDemo />
      </Suspense>
    </Section>
  );
}
