import { m } from 'framer-motion';
import { Mail, Paperclip, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/Badge';
import { DocSheet } from '@/components/DocSheet';
import { StatusIcon, type ItemStatus } from '@/components/Icons';
import { MockWindow } from '@/components/MockWindow';
import { heroMock as data } from '@/content/samples';
import { cn } from '@/lib/cn';
import { useReducedMotionPreference } from '@/lib/motion';

const docCount = data.documents.length;
const missingStep = docCount + 1;
const finalStep = docCount + 2;
const stepMs = 800;

const tilts = [-2.2, 1.6, -1.2, 2];

function PaneTitle({ children }: { children: string }) {
  return <p className="mb-2.5 text-caption font-semibold">{children}</p>;
}

export function HeroMock() {
  const reduceMotion = useReducedMotionPreference();
  const [step, setStep] = useState(0);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStep(finalStep);
      return;
    }
    setStep(0);
    // Plays once and rests on the end state, so nothing keeps moving while people read.
    const timers = Array.from({ length: finalStep }, (_, index) =>
      setTimeout(() => setStep(index + 1), 900 + index * stepMs),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, runId]);

  const checklistStatus = (index: number): ItemStatus => {
    if (index < docCount) return step > index ? 'ok' : 'pending';
    return step >= missingStep ? 'warn' : 'pending';
  };

  return (
    <div>
      <MockWindow
        title={data.windowTitle}
        className="shadow-window"
        label={`Animated illustration using sample data. Documents for a motor claim arrive by email, are sorted by type and ticked off a checklist. ${data.missing.label}. ${data.mismatch.label}.`}
      >
        <div
          aria-hidden="true"
          className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1.15fr)]"
        >
          {/* Inbox */}
          <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <PaneTitle>{data.inboxTitle}</PaneTitle>
            <div className="rounded-md border border-line p-3">
              <p className="flex items-center gap-1.5 truncate text-caption text-muted">
                <Mail className="size-3.5 shrink-0" />
                {data.emailFrom}
              </p>
              <p className="mt-1 text-caption font-medium">{data.emailSubject}</p>
              <ul className="mt-2.5 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
                {data.documents.map((doc, index) => (
                  <li
                    key={doc.file}
                    className={cn(
                      'flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-micro transition-colors duration-300',
                      step > index ? 'bg-ok-soft text-ok' : 'bg-fg/[0.06] text-muted',
                    )}
                  >
                    <Paperclip className="size-3 shrink-0" />
                    <span className="truncate">{doc.file}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sorted stacks */}
          <div className="border-b border-line bg-sunken/50 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <PaneTitle>{data.stacksTitle}</PaneTitle>
            <ul className="grid grid-cols-4 gap-2 lg:grid-cols-2 lg:gap-x-5 lg:gap-y-4">
              {data.documents.map((doc, index) => (
                <li key={doc.label} className="min-w-0">
                  <div className="relative mx-auto aspect-[4/5] w-full max-w-[6.5rem] rounded-[3px] border border-dashed border-line-strong">
                    <m.div
                      initial={false}
                      animate={
                        step > index
                          ? { opacity: 1, x: 0, y: 0, rotate: tilts[index] }
                          : { opacity: 0, x: -36, y: -14, rotate: -10 }
                      }
                      transition={{ type: 'spring', stiffness: 170, damping: 19 }}
                      className="absolute inset-0"
                    >
                      <DocSheet variant={doc.variant} className="h-full" />
                    </m.div>
                  </div>
                  <p
                    className={cn(
                      'mt-1.5 text-center text-micro font-medium leading-tight transition-colors duration-300',
                      step > index ? 'text-ok' : 'text-muted',
                    )}
                  >
                    {doc.label}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Checklist and flags. Space for the flags is reserved so nothing shifts. */}
          <div className="p-4 sm:p-5">
            <PaneTitle>{data.checklistTitle}</PaneTitle>
            <ul className="space-y-1.5">
              {data.checklist.map((item, index) => {
                const status = checklistStatus(index);
                return (
                  <li key={item} className="flex items-center gap-2 text-caption">
                    <m.span
                      key={status}
                      initial={status === 'pending' ? false : { scale: 0.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      className="inline-flex"
                    >
                      <StatusIcon status={status} />
                    </m.span>
                    <span className={cn(status === 'warn' && 'font-medium text-warn')}>{item}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 space-y-2">
              <m.div
                initial={false}
                animate={step >= missingStep ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                className="rounded-md bg-warn-soft p-2.5"
              >
                <p className="flex items-center gap-1.5 text-caption font-semibold">
                  <StatusIcon status="warn" />
                  {data.missing.label}
                </p>
                <p className="mt-1 text-micro">{data.missing.body}</p>
              </m.div>
              <m.div
                initial={false}
                animate={step >= finalStep ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                className="rounded-md bg-danger-soft p-2.5"
              >
                <p className="flex items-start gap-1.5 text-caption font-semibold">
                  <StatusIcon status="danger" className="mt-px" />
                  {data.mismatch.label}
                </p>
                <p className="mt-1 flex flex-wrap gap-1 text-micro">
                  <Badge className="bg-surface/70 text-fg">{data.mismatch.from}</Badge>
                  <Badge className="bg-surface/70 text-fg">{data.mismatch.to}</Badge>
                </p>
              </m.div>
            </div>
          </div>
        </div>
      </MockWindow>
      {!reduceMotion && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setRunId((id) => id + 1)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-caption font-medium text-muted transition-colors hover:text-fg"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            {data.replay}
          </button>
        </div>
      )}
    </div>
  );
}
