import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/Container';
import { Photo } from '@/components/Photo';
import { classes } from '@/content/home';
import type { PhotoId } from '@/content/photos';

const groupPhotos: PhotoId[] = ['kombis', 'flood-aerial', 'maize'];

export function ClassesOfLoss() {
  return (
    <section aria-labelledby="classes-title" className="pt-section">
      <Container className="grid gap-5 pb-10 sm:pb-14 lg:grid-cols-12 lg:items-end">
        <h2 id="classes-title" className="text-display-lg lg:col-span-8">
          {classes.title}
        </h2>
        <div className="lg:col-span-4">
          <p className="text-lead text-muted">{classes.lead}</p>
          <p className="mt-3">
            <Link to={classes.link.to} className="text-link">
              {classes.link.label}
            </Link>
          </p>
        </div>
      </Container>
      <ul className="grid md:grid-cols-3">
        {classes.groups.map(({ title, items }, index) => {
          const photo = groupPhotos[index];
          return (
            <li key={title} className="ink relative isolate min-h-[30rem] lg:min-h-[38rem]">
              <Photo
                id={photo}
                alt=""
                sizes="(min-width: 768px) 34vw, 100vw"
                className="absolute inset-0 -z-20 size-full object-cover"
              />
              <div aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
              <div className="flex h-full min-h-[inherit] flex-col justify-end p-6 sm:p-8">
                <h3 className="text-display-lg">{title}</h3>
                <ul className="mt-4 space-y-1.5 text-small md:min-h-[10.5rem]">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        aria-hidden="true"
                        strokeWidth={3}
                        className="mt-0.5 size-4 shrink-0 text-primary"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
