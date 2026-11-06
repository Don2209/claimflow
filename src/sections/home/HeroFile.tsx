import type { CSSProperties } from 'react';
import { DocSheet } from '@/components/DocSheet';
import { Print } from '@/components/Print';
import { heroFile } from '@/content/home';

const delay = (i: number) => ({ '--i': i }) as CSSProperties;

/** A sample claim file landing on the page: the page's single piece of load animation. */
export function HeroFile() {
  return (
    <div
      role="img"
      aria-label={heroFile.label}
      className="relative mx-auto h-[23rem] w-full max-w-[26rem] sm:h-[27rem] lg:mr-0"
    >
      <div
        className="land absolute right-0 top-0 w-[46%] rotate-[7deg]"
        style={delay(0)}
        aria-hidden="true"
      >
        <DocSheet variant="handwritten" className="aspect-[3/4]" />
      </div>
      <div className="land absolute left-0 top-[12%] w-[92%]" style={delay(1)} aria-hidden="true">
        <Print
          id="elephant-car"
          alt=""
          sizes="(min-width: 1024px) 26rem, 90vw"
          tilt={-3}
          frameClassName="aspect-[3/2]"
          note={heroFile.note}
        >
          {/* A red-pen circle around the damage. */}
          <svg
            viewBox="0 0 100 66"
            preserveAspectRatio="none"
            fill="none"
            className="absolute inset-0 size-full"
          >
            <path
              d="M57 21c15-9 34-5 39 8 4 12-9 24-27 25-16 1-29-6-29-17 0-9 8-16 22-19"
              stroke="rgb(var(--pen))"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </Print>
      </div>
      <span
        aria-hidden="true"
        className="land absolute left-0 top-[3%] bg-paper px-2 py-0.5 text-micro font-medium text-paper-ink"
        style={delay(2)}
      >
        {heroFile.tag}
      </span>
      <div
        className="thump absolute bottom-0 right-1 rotate-[-8deg] bg-paper/90 sm:bottom-2"
        aria-hidden="true"
      >
        <span className="stamp text-[1.375rem] sm:text-[1.625rem]">{heroFile.stamp}</span>
      </div>
    </div>
  );
}
