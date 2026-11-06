import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import type { Cta } from '@/content/types';
import { useId } from 'react';

/** A closing call to action, on a full-width yellow band. */
export function CtaBand({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: Cta;
  secondary?: Cta;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="sun mt-16 py-16 sm:mt-24 sm:py-24">
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2 id={headingId} className="text-display-lg">
            {title}
          </h2>
          <p className="mt-4 text-lead text-muted">{body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button to={primary.to} size="lg" className="max-sm:w-full">
            {primary.label}
          </Button>
          {secondary && (
            <Button to={secondary.to} size="lg" variant="secondary" className="max-sm:w-full">
              {secondary.label}
            </Button>
          )}
        </div>
      </Container>
    </section>
  );
}
