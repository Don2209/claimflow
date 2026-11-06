import { Print } from '@/components/Print';
import { Section } from '@/components/Section';
import type { PhotoId } from '@/content/photos';
import { problem } from '@/content/home';
import { cn } from '@/lib/cn';

const rows: {
  photo: PhotoId;
  tilt: number;
  photoClass: string;
  textClass: string;
  sizes: string;
}[] = [
  {
    photo: 'cabinets',
    tilt: -1.5,
    photoClass: 'lg:col-span-7',
    textClass: 'lg:col-span-4 lg:col-start-9',
    sizes: '(min-width: 1024px) 55vw, 100vw',
  },
  {
    photo: 'sign',
    tilt: 2,
    photoClass: 'lg:col-span-5 lg:col-start-7 lg:order-2',
    textClass: 'lg:col-span-5 lg:col-start-1',
    sizes: '(min-width: 1024px) 40vw, 100vw',
  },
  {
    photo: 'crash-close',
    tilt: -1,
    photoClass: 'lg:col-span-8',
    textClass: 'lg:col-span-3 lg:col-start-10',
    sizes: '(min-width: 1024px) 60vw, 100vw',
  },
];

export function Problem() {
  return (
    <Section tone="sun" title={problem.title}>
      <ul className="space-y-16 lg:space-y-24">
        {problem.cards.map((card, index) => {
          const row = rows[index];
          return (
            <li key={card.title} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
              <div className={cn('min-w-0', row.photoClass)}>
                <Print
                  id={row.photo}
                  sizes={row.sizes}
                  tilt={row.tilt}
                  frameClassName="aspect-[3/2]"
                  note={card.note}
                />
              </div>
              <div className={row.textClass}>
                <h3 className="text-display-md">{card.title}</h3>
                <p className="mt-4 text-lead text-muted">{card.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
