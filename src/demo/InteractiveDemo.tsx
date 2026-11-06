import { m } from 'framer-motion';
import { ChevronDown, Inbox, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DocSheet } from '@/components/DocSheet';
import { StatusIcon, type ItemStatus } from '@/components/Icons';
import { SampleDataTag } from '@/components/MockWindow';
import { cn } from '@/lib/cn';
import { useReducedMotionPreference } from '@/lib/motion';
import { demoCopy as copy, scenarios, type DemoDocument, type DemoScenario } from './scenarios';

type Phase = 'idle' | 'running' | 'done';

const stepMs = 850;

function DocumentCard({
  document,
  read,
  reading,
  showFlag,
}: {
  document: DemoDocument;
  read: boolean;
  reading: boolean;
  showFlag: boolean;
}) {
  return (
    <li
      className={cn(
        'grid grid-cols-[4.25rem_minmax(0,1fr)] gap-3 rounded-lg border bg-surface p-3 transition-colors',
        reading ? 'border-accent' : 'border-line',
      )}
    >
      <div className="relative">
        <DocSheet variant={document.variant} className="aspect-[3/4]" />
        {reading && (
          <span aria-hidden="true" className="scan-line absolute inset-x-0 h-0.5 bg-accent" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-caption text-muted" title={document.file}>
          {document.file}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5">
          {read ? (
            <Badge tone="ok">{document.type}</Badge>
          ) : (
            <Badge>{reading ? copy.readingNow : copy.notRead}</Badge>
          )}
          {read && document.note && <Badge>{document.note}</Badge>}
        </p>
        <dl className="mt-2 space-y-1">
          {document.fields.map((field) => {
            const flagged = showFlag && field.flagged;
            return (
              <div
                key={field.label}
                className="flex items-baseline justify-between gap-2 text-caption"
              >
                <dt className="shrink-0 text-muted">{field.label}</dt>
                <dd className="tabular min-w-0 text-right font-medium">
                  {read ? (
                    <m.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(flagged && 'rounded-sm bg-danger-soft px-1 text-danger')}
                    >
                      {field.value}
                    </m.span>
                  ) : (
                    <>
                      <span className="sr-only">Not read yet</span>
                      <span
                        aria-hidden="true"
                        className="inline-block h-2 w-16 rounded-full bg-fg/10"
                      />
                    </>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </li>
  );
}

function SourcePanel({ scenario }: { scenario: DemoScenario }) {
  const { source } = scenario;
  const email = source.channel === 'email';
  const Icon = email ? Inbox : Upload;
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <h3 className="flex items-center gap-2 text-small font-semibold [font-stretch:100%]">
        <Icon aria-hidden="true" className="size-4 text-muted" />
        {email ? copy.emailHeading : copy.portalHeading}
      </h3>
      {email ? (
        <>
          <dl className="mt-2 space-y-0.5 text-caption">
            <div className="flex gap-2">
              <dt className="text-muted">{copy.emailFrom}</dt>
              <dd className="min-w-0 break-words">{source.from}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted">{copy.emailSubject}</dt>
              <dd className="min-w-0 font-medium">{source.subject}</dd>
            </div>
          </dl>
          <p className="mt-2 text-caption text-muted">{source.body}</p>
        </>
      ) : (
        <>
          <dl className="mt-2 text-caption">
            <div className="flex gap-2">
              <dt className="text-muted">{copy.portalBy}</dt>
              <dd className="min-w-0 font-medium">{source.uploadedBy}</dd>
            </div>
          </dl>
          <p className="mt-2 text-caption text-muted">{source.intro}</p>
        </>
      )}
    </div>
  );
}

function Results({
  scenario,
  headingRef,
  onReset,
  onNext,
}: {
  scenario: DemoScenario;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onReset: () => void;
  onNext: () => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const draftId = useId();

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-6 border-t border-line pt-6"
    >
      <h3 ref={headingRef} tabIndex={-1} className="text-display-sm focus:outline-none">
        {copy.resultsHeading}
      </h3>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <section
          aria-label={copy.summaryHeading}
          className="rounded-lg border border-line bg-surface p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-small font-semibold [font-stretch:100%]">{copy.summaryHeading}</h4>
            <SampleDataTag />
          </div>
          <p className="mt-1 text-lead font-semibold">{scenario.summary.heading}</p>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            {scenario.summary.rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-2 text-small">
                <dt className="text-muted">{row.label}</dt>
                <dd className="tabular text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-3 space-y-1.5 text-small">
            <li className="flex items-start gap-2">
              <StatusIcon status="warn" className="mt-0.5" />
              <span>
                <span className="sr-only">{copy.documentsMissing}: </span>
                {scenario.missing.label}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <StatusIcon status="danger" className="mt-0.5" />
              <span>
                <span className="sr-only">{copy.documentsFlag}: </span>
                {scenario.inconsistency.title}
              </span>
            </li>
          </ul>
          <p className="mt-3 text-caption text-muted">{copy.summaryFooter}</p>
        </section>

        <section
          aria-label={copy.draftHeading}
          className="rounded-lg border border-line bg-surface p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-small font-semibold [font-stretch:100%]">{copy.draftHeading}</h4>
            <SampleDataTag />
          </div>
          <p className="mt-1 text-caption text-muted">{copy.draftNote}</p>
          <button
            type="button"
            aria-expanded={draftOpen}
            aria-controls={draftId}
            onClick={() => setDraftOpen(!draftOpen)}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-md text-small font-medium text-ok hover:underline"
          >
            {draftOpen ? copy.draftHide : copy.draftShow}
            <ChevronDown
              aria-hidden="true"
              className={cn('size-4 transition-transform', draftOpen && 'rotate-180')}
            />
          </button>
          <div id={draftId} hidden={!draftOpen} className="mt-2 border-t border-line pt-3">
            <dl className="space-y-0.5 text-caption">
              <div className="flex gap-2">
                <dt className="text-muted">{copy.draftTo}</dt>
                <dd className="min-w-0 break-words">{scenario.draft.to}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">{copy.draftSubject}</dt>
                <dd className="min-w-0 font-medium">{scenario.draft.subject}</dd>
              </div>
            </dl>
            <div className="mt-3 space-y-2 whitespace-pre-line text-small">
              {scenario.draft.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onNext}>{copy.tryAnother}</Button>
        <Button variant="secondary" onClick={onReset}>
          {copy.reset}
        </Button>
        <Button variant="secondary" to="/demo">
          {copy.book}
        </Button>
      </div>
    </m.div>
  );
}

export function InteractiveDemo() {
  const groupName = useId();
  const [scenarioId, setScenarioId] = useState<DemoScenario['id']>('motor');
  const [phase, setPhase] = useState<Phase>('idle');
  const [tick, setTick] = useState(0);
  const reduceMotion = useReducedMotionPreference();
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const runButton = useRef<HTMLButtonElement>(null);

  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  const docCount = scenario.documents.length;
  const lastTick = docCount + 2; // one per document, then the missing item, then the inconsistency

  useEffect(() => {
    if (phase !== 'running') return;
    if (tick >= lastTick) {
      setPhase('done');
      return;
    }
    const timer = setTimeout(() => setTick((value) => value + 1), stepMs);
    return () => clearTimeout(timer);
  }, [phase, tick, lastTick]);

  // The run button disappears on completion, so move focus to the results it produced.
  useEffect(() => {
    if (phase !== 'done') return;
    const heading = resultsHeading.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [phase, reduceMotion]);

  const reset = () => {
    setPhase('idle');
    setTick(0);
  };

  const run = () => {
    if (phase !== 'idle') return;
    if (reduceMotion) {
      setTick(lastTick);
      setPhase('done');
    } else {
      setPhase('running');
    }
  };

  const showMissing = tick > docCount;
  const showFlag = tick > docCount + 1;
  const isRead = (index: number) => tick > index;

  const checklistStatus = (documentId?: string): ItemStatus => {
    if (documentId) {
      const index = scenario.documents.findIndex((doc) => doc.id === documentId);
      return isRead(index) ? 'ok' : 'pending';
    }
    return showMissing ? 'warn' : 'pending';
  };

  const statusMessage =
    phase === 'running'
      ? copy.running
      : phase === 'done'
        ? `${copy.resultsHeading}: ${scenario.missing.label}. ${scenario.inconsistency.title}.`
        : '';

  return (
    <div className="rounded-xl border border-line bg-canvas p-3 shadow-card sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <fieldset>
          <legend className="text-small font-medium">{copy.chooseLabel}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {scenarios.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'relative cursor-pointer rounded-md border px-3 py-2 text-small font-medium transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
                  item.id === scenarioId
                    ? 'border-accent bg-ok-soft text-ok'
                    : 'border-line-strong text-fg hover:border-fg',
                )}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={item.id}
                  checked={item.id === scenarioId}
                  onChange={() => {
                    setScenarioId(item.id);
                    reset();
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                {item.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <SampleDataTag />
          <span className="text-caption text-muted">Ref {scenario.reference}</span>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-3">
          <SourcePanel scenario={scenario} />
          <div>
            <h3 className="sr-only">{copy.documentsHeading}</h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {scenario.documents.map((document, index) => (
                <DocumentCard
                  key={`${scenario.id}-${document.id}`}
                  document={document}
                  read={isRead(index)}
                  reading={phase === 'running' && tick === index}
                  showFlag={showFlag}
                />
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 space-y-3 lg:sticky lg:top-20">
          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="text-small font-semibold [font-stretch:100%]">
              {copy.checklistHeading}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {scenario.checklist.map((item) => {
                const status = checklistStatus(item.documentId);
                return (
                  <li key={item.label} className="flex items-center gap-2 text-small">
                    <StatusIcon status={status} />
                    <span className={cn(status === 'warn' && 'font-medium text-warn')}>
                      {item.label}
                    </span>
                    {status === 'ok' && <span className="sr-only">(received)</span>}
                    {status === 'warn' && <span className="sr-only">(missing)</span>}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4">
            <h3 className="text-small font-semibold [font-stretch:100%]">{copy.flagsHeading}</h3>
            {!showMissing && <p className="mt-2 text-caption text-muted">{copy.flagsEmpty}</p>}
            <ul className="mt-2 space-y-2 empty:hidden">
              {showMissing && (
                <m.li
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 rounded-md bg-warn-soft p-3"
                >
                  <StatusIcon status="warn" className="mt-0.5" />
                  <div>
                    <p className="text-small font-semibold">{scenario.missing.label}</p>
                    <p className="mt-0.5 text-caption">{scenario.missing.explanation}</p>
                  </div>
                </m.li>
              )}
              {showFlag && (
                <m.li
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2 rounded-md bg-danger-soft p-3"
                >
                  <StatusIcon status="danger" className="mt-0.5" />
                  <div>
                    <p className="text-small font-semibold">{scenario.inconsistency.title}</p>
                    <p className="mt-0.5 text-caption">{scenario.inconsistency.explanation}</p>
                  </div>
                </m.li>
              )}
            </ul>
          </div>

          {phase !== 'done' && (
            <Button
              ref={runButton}
              size="lg"
              onClick={run}
              aria-disabled={phase === 'running'}
              className="w-full"
            >
              {phase === 'running' ? copy.running : copy.run}
            </Button>
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>

      {phase === 'done' && (
        <Results
          key={scenario.id}
          scenario={scenario}
          headingRef={resultsHeading}
          onReset={() => {
            reset();
            requestAnimationFrame(() => runButton.current?.focus());
          }}
          onNext={() => {
            const index = scenarios.findIndex((item) => item.id === scenarioId);
            setScenarioId(scenarios[(index + 1) % scenarios.length].id);
            reset();
            requestAnimationFrame(() => runButton.current?.focus());
          }}
        />
      )}
      <p className="mt-4 text-caption text-muted">{copy.disclaimer}</p>
    </div>
  );
}
