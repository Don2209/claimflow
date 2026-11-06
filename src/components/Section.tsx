import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

type Tone = 'canvas' | 'surface' | 'sunken' | 'ink' | 'sun';

const tones: Record<Tone, string> = {
  canvas: '',
  surface: 'bg-surface',
  sunken: 'bg-sunken',
  ink: 'ink',
  sun: 'sun',
};

interface SectionProps {
  title?: ReactNode;
  lead?: ReactNode;
  tone?: Tone;
  id?: string;
  className?: string;
  /** Visually smaller heading, for long pages with many sections. */
  compact?: boolean;
  children?: ReactNode;
}

export function Section({
  title,
  lead,
  tone = 'canvas',
  id,
  className,
  compact,
  children,
}: SectionProps) {
  const headingId = useId();

  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn('py-section', tones[tone], className)}
    >
      <Container>
        {title && (
          <div className="mb-10 max-w-5xl sm:mb-14">
            <h2 id={headingId} className={compact ? 'text-display-md' : 'text-display-lg'}>
              {title}
            </h2>
            {lead && <p className="mt-5 max-w-prose text-lead text-muted">{lead}</p>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}
