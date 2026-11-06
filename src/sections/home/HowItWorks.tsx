import { FileText, Mail, Upload } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { DocSheet } from '@/components/DocSheet';
import { StatusIcon } from '@/components/Icons';
import { Section } from '@/components/Section';
import { howItWorks } from '@/content/home';
import { cn } from '@/lib/cn';
import { useInView } from '@/lib/useInView';

/** Wraps a part of a visual so it steps in, in order, once the section is on screen. */
function Beat({
  show,
  i,
  className,
  children,
}: {
  show: boolean;
  i: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(show ? 'step-in' : 'beat-waiting', className)}
      style={{ '--i': i } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function ReceiveVisual({ show }: { show: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center gap-2 text-caption">
      <Beat
        show={show}
        i={0}
        className="flex items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-2"
      >
        <Mail className="size-4 text-muted" />
        Claims inbox
      </Beat>
      <Beat
        show={show}
        i={1}
        className="flex items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-2"
      >
        <Upload className="size-4 text-muted" />
        Secure portal
      </Beat>
      <Beat
        show={show}
        i={2}
        className="flex items-center gap-2 rounded-md bg-ok-soft px-2.5 py-2 font-medium text-ok"
      >
        <FileText className="size-4" />
        Matched to claim
      </Beat>
    </div>
  );
}

function SortVisual({ show }: { show: boolean }) {
  return (
    <div className="flex h-full items-center justify-center gap-3">
      <div className="relative w-20">
        <DocSheet variant="handwritten" className="aspect-[3/4]" />
        {show && (
          <span className="scan-line absolute inset-x-0 h-0.5 bg-accent [animation-iteration-count:4]" />
        )}
      </div>
      <div className="space-y-1.5">
        <Beat show={show} i={3}>
          <Badge tone="ok">Claim form</Badge>
        </Beat>
        <Beat show={show} i={4} className="tabular text-micro text-muted">
          SMP 1234
        </Beat>
        <Beat show={show} i={5} className="tabular text-micro text-muted">
          14 Mar 2030
        </Beat>
      </div>
    </div>
  );
}

function CheckVisual({ show }: { show: boolean }) {
  const rows = [
    { label: 'Claim form', status: 'ok' },
    { label: 'Licence', status: 'ok' },
    { label: 'Repair quote', status: 'danger' },
    { label: 'Police report', status: 'warn' },
  ] as const;
  return (
    <div className="flex h-full flex-col justify-center gap-2 text-caption">
      {rows.map((row, index) => (
        <div key={row.label} className="flex items-center gap-2">
          <Beat
            show={show}
            i={index * 1.5}
            className="inline-flex size-4 items-center justify-center"
          >
            <StatusIcon status={row.status} />
          </Beat>
          {row.label}
        </div>
      ))}
    </div>
  );
}

function SummaryVisual({ show }: { show: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <Beat
        show={show}
        i={1}
        className="w-full max-w-44 rounded-md border border-line bg-canvas p-2.5 text-micro"
      >
        <p className="font-semibold">Claim summary</p>
        <div className="mt-1.5 space-y-1">
          {[100, 80, 90].map((width, index) => (
            <Beat key={width} show={show} i={2 + index}>
              <div className="h-1 rounded-full bg-fg/20" style={{ width: `${width}%` }} />
            </Beat>
          ))}
        </div>
        <Beat show={show} i={5} className="mt-2 flex gap-1">
          <Badge tone="ok">CSV</Badge>
          <Badge tone="ok">Excel</Badge>
        </Beat>
      </Beat>
    </div>
  );
}

const visuals = [ReceiveVisual, SortVisual, CheckVisual, SummaryVisual];

export function HowItWorks() {
  const { ref, inView } = useInView<HTMLOListElement>(0.2);

  return (
    <Section title={howItWorks.title} lead={howItWorks.lead}>
      <ol ref={ref} className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {howItWorks.steps.map((step, index) => {
          const Visual = visuals[index];
          return (
            <li key={step.title} className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="tabular shrink-0 text-display-lg text-accent">{index + 1}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-px flex-1 bg-line-strong',
                    index === 3 && 'lg:hidden',
                    'max-sm:hidden',
                  )}
                />
              </div>
              <h3 className="mt-4 text-display-sm">{step.title}</h3>
              <p className="mt-2 text-muted lg:min-h-[7.5rem]">{step.body}</p>
              <div aria-hidden="true" className="mt-5 h-44 bg-sunken p-4">
                <Visual show={inView} />
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
