import type { ReactNode } from 'react';
import { Container } from '@/components/Container';
import { Photo } from '@/components/Photo';
import type { PhotoId } from '@/content/photos';

/** Top of an inner page: the headline on jacaranda ink, with a photo running off the right edge. */
export function PageHero({
  title,
  lead,
  photo,
  children,
}: {
  title: string;
  lead?: string;
  photo: PhotoId;
  children?: ReactNode;
}) {
  return (
    <div className="ink relative overflow-hidden">
      <Container className="relative z-10 pb-12 pt-14 sm:pb-16 sm:pt-20 lg:min-h-[34rem] lg:pb-24 lg:pt-24">
        <div className="lg:w-[56%] lg:pr-10">
          <h1 className="text-display-lg">{title}</h1>
          {lead && <p className="mt-6 max-w-xl text-lead text-muted">{lead}</p>}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </Container>
      <div className="h-64 sm:h-96 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[42%]">
        <Photo
          id={photo}
          sizes="(min-width: 1024px) 42vw, 100vw"
          priority
          className="size-full object-cover"
        />
      </div>
    </div>
  );
}
