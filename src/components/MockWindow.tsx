import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Badge } from './Badge';

export function SampleDataTag() {
  return <Badge className="shrink-0">Sample data</Badge>;
}

/** Frame for custom-built product UI. Every mock is labelled as sample data. */
export function MockWindow({
  title,
  label,
  className,
  children,
}: {
  title: string;
  /** Describes the mock for screen readers. */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure
      aria-label={label ?? `Illustration of the ClaimsFlow screen: ${title}. Sample data.`}
      className={cn(
        'overflow-hidden rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-line bg-sunken/60 px-3 py-2 sm:px-4">
        <span className="min-w-0 text-caption font-medium">{title}</span>
        <SampleDataTag />
      </figcaption>
      {children}
    </figure>
  );
}
