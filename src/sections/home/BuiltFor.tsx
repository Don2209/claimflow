import { SignalLow } from 'lucide-react';
import { Photo } from '@/components/Photo';
import { Section } from '@/components/Section';
import { builtFor } from '@/content/home';
import { cn } from '@/lib/cn';

function Words({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h3 className="text-display-md">{title}</h3>
      <p className="mt-3 text-muted">{body}</p>
    </>
  );
}

export function BuiltFor() {
  const { photos, handwriting, currency, documents, connections } = builtFor.items;
  const tile = 'flex flex-col overflow-hidden';
  return (
    <Section title={builtFor.title} lead={builtFor.lead}>
      <ul className="grid gap-3 md:grid-cols-6">
        {/* A phone in the hand, with the photo a claimant would really send: crooked. */}
        <li
          className={cn(
            tile,
            'ink p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-10 md:col-span-4',
          )}
        >
          <div
            aria-hidden="true"
            className="mx-auto mb-8 h-80 w-44 shrink-0 rotate-[-4deg] rounded-[1.75rem] border-[6px] border-black bg-black shadow-window sm:mb-0"
          >
            <div className="flex h-full items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#111]">
              <Photo
                id="crash-front"
                alt=""
                sizes="16rem"
                className="h-full w-full rotate-[5deg] scale-110 object-cover"
              />
            </div>
          </div>
          <div>
            <Words {...photos} />
          </div>
        </li>

        <li className={cn(tile, 'bg-sunken p-6 md:col-span-2')}>
          <div aria-hidden="true" className="sheet -rotate-1 p-4">
            <svg viewBox="0 0 240 72" className="w-full" fill="none" strokeLinecap="round">
              <path d="M2 30h236M2 66h236" stroke="#22303c" strokeOpacity="0.25" />
              <g stroke="#23457a" strokeWidth="1.6">
                <path d="M4 22c6-14 10 8 15-2s6-10 9 1 6 4 10-3 7 9 12 1 4-6 9 0 9 4 13-2 5 6 11 0" />
                <path d="M126 24c5-8 8 3 12-1s6-3 10 1 8-2 11 0" />
                <path d="M4 58c5-10 7 5 12-1s7-6 10 1 9 2 12-3 6 6 11 1 7-5 12 1" />
                <path d="M90 59c7-9 9 3 13-1s8-5 11 1 7 1 11-2 6 4 13 0 8-3 13 1" />
              </g>
            </svg>
          </div>
          <div className="mt-8">
            <Words {...handwriting} />
          </div>
        </li>

        <li className={cn(tile, 'sun p-6 md:col-span-2')}>
          <div aria-hidden="true" className="font-display font-extrabold leading-none">
            <p className="tabular flex items-baseline justify-between gap-3 text-[2.75rem]">
              <span>USD</span>
              <span>1,250</span>
            </p>
            <p className="tabular mt-1 flex items-baseline justify-between gap-3 border-t-2 border-fg pt-1 text-[2.75rem]">
              <span>EUR</span>
              <span>1,150</span>
            </p>
          </div>
          <div className="mt-8">
            <Words {...currency} />
          </div>
        </li>

        <li className={cn(tile, 'daylight bg-surface p-6 text-fg md:col-span-2')}>
          <ul className="flex flex-wrap gap-2">
            {documents.examples.map((example, index) => (
              <li
                key={example}
                className={cn(
                  'stamp text-[1.0625rem]',
                  index % 2 ? 'rotate-[1.5deg]' : 'rotate-[-1.5deg]',
                )}
              >
                {example}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Words {...documents} />
          </div>
        </li>

        <li className={cn(tile, 'ink p-6 md:col-span-2')}>
          <div aria-hidden="true" className="text-caption">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">IMG_2041.jpg</span>
              <SignalLow className="size-5 shrink-0 text-primary" />
            </div>
            <div className="mt-2 h-3 bg-fg/15">
              <div className="h-full w-2/3 bg-primary" />
            </div>
            <p className="mt-2 text-muted">Uploading on a weak signal</p>
          </div>
          <div className="mt-8">
            <Words {...connections} />
          </div>
        </li>
      </ul>
    </Section>
  );
}
