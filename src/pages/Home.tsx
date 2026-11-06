import { Suspense } from 'react';
import { Seo } from '@/components/Seo';
import { homeMeta } from '@/content/home';
import { deferredLazy, deferredMarker } from '@/lib/deferredLazy';
import { Hero } from '@/sections/home/Hero';
import { Problem } from '@/sections/home/Problem';

const BelowFold = deferredLazy(() => import('@/sections/home/BelowFold'));

export default function Home() {
  return (
    <>
      <Seo {...homeMeta} path="/" />
      <Hero />
      <Problem />
      <div {...deferredMarker}>
        <Suspense fallback={<div className="min-h-screen" />}>
          <BelowFold />
        </Suspense>
      </div>
    </>
  );
}
