import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { api, type Claim } from '../api';
import { QuoteCompare } from '../QuoteCompare';
import { Button, formatDate, Loading, Notice, useLoad } from '../ui';

const coverTone = { inside: 'text-ok', early: 'text-danger', outside: 'text-danger', unknown: 'text-muted' };
const coverWord = { inside: 'Dates inside cover', early: 'Soon after cover began', outside: 'Dates outside cover', unknown: 'Cover dates unknown' };
const gap = (days: number) => (days === 0 ? 'same day' : days === 1 ? '1 day later' : `${days} days later`);

/** The same order every time, so an officer knows where to look: the position first, then the proof. */
export function SummaryPage() {
  const { id } = useParams();
  const { data: claim, error } = useLoad(() => api<Claim>(`/claims/${id}?refresh=1`), [id]);
  if (error) return <div className="p-6"><Notice tone="danger">{error}</Notice></div>;
  if (!claim) return <div className="px-6"><Loading /></div>;
  const { insights } = claim;
  const flags = claim.flags.filter((flag) => flag.status === 'open');
  const required = claim.checklist.filter((item) => item.required);
  const missing = required.filter((item) => !item.documentIds.length);
  const nextSteps = claim.summary?.next_steps ?? [];
  const docLink = (documentId: string, children: React.ReactNode) =>
    claim.documents.some((doc) => doc.id === documentId) ? <a className="text-link" target="_blank" rel="noreferrer" href={`/api/documents/${documentId}/file`}>{children}</a> : children;

  return (
    <div className="min-h-dvh bg-sunken/60 p-3 print:bg-white print:p-0 sm:p-6">
      <div className="mx-auto mb-3 flex max-w-[56rem] justify-between gap-2 print:hidden">
        <Link to={`/claims/${claim.id}`}><Button tabIndex={-1}><ArrowLeft className="size-4" aria-hidden="true" /> Back to the file</Button></Link>
        <Button variant="main" onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" /> Print or save as PDF</Button>
      </div>
      <main className="mx-auto max-w-[56rem] bg-paper p-5 text-small text-paper-ink shadow-paper print:max-w-none print:p-0 print:shadow-none sm:p-9">
        <header className="flex items-start justify-between gap-4 border-b-2 border-paper-ink pb-3">
          <div className="min-w-0">
            <h1 className="font-display text-[2.4rem] font-extrabold leading-none sm:text-[3rem]">{claim.claimantName || 'Claimant not known yet'}</h1>
            <p className="mt-1.5"><span className="tabular font-semibold">{claim.ref}</span>. {claim.className ?? 'Class not chosen'}. {claim.stageLabel}.</p>
          </div>
          <Logo />
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-line pb-4 sm:grid-cols-4 print:grid-cols-4">
          <Glance label="Claim value" value={insights.value.text || 'Not known yet'} note={insights.value.source ? `From ${insights.value.source}` : undefined} />
          <Glance label="Required documents" value={required.length ? `${required.length - missing.length} of ${required.length}` : 'No checklist'} note={missing.length ? `Missing: ${missing.map((item) => item.label).join(', ')}` : required.length ? 'All in the file' : undefined} tone={missing.length ? 'text-danger' : required.length ? 'text-ok' : undefined} />
          <Glance label="Flags to check" value={String(flags.length)} note={flags.length ? `${flags.filter((flag) => flag.severity === 'attention').length} need attention` : 'None open'} tone={flags.length ? 'text-danger' : 'text-ok'} />
          <Glance label="Cover" value={coverWord[insights.cover.state]} tone={coverTone[insights.cover.state]} note={insights.sumInsured ? `Sum insured ${insights.sumInsured.text}` : undefined} />
        </dl>

        <Part title="What happened"><p className="max-w-[65ch] text-body">{claim.summary?.overview ?? 'The documents have not been reviewed yet.'}</p></Part>

        {nextSteps.length > 0 && (
          <Part title="Next steps to consider">
            <ol className="grid max-w-[70ch] list-decimal gap-1 pl-5">{nextSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          </Part>
        )}

        {flags.length > 0 && (
          <Part title={`Flags to check (${flags.length})`}>
            <ul className="grid gap-1.5">{flags.map((flag) => <li key={flag.id} className={cn('border-l-4 pl-2.5', flag.severity === 'attention' ? 'border-danger' : 'border-line-strong')}><strong>{flag.title}</strong> {flag.detail}</li>)}</ul>
          </Part>
        )}

        {insights.comparison.quotes.length > 0 && (
          <Part title={insights.comparison.quotes.length === 1 ? 'The quote' : `${insights.comparison.quotes.length} quotes compared`}>
            <QuoteCompare insights={insights} docLink={docLink} />
          </Part>
        )}

        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Part title="Timeline">
            {insights.timeline.length ? (
              <ol className="grid">
                {insights.timeline.map((event, index) => (
                  <li key={event.date} className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2 pb-2">
                    <span className={cn('z-10 mt-1.5 size-2.5 rounded-full', event.isLoss ? 'bg-danger' : 'bg-line-strong')} aria-hidden="true" />
                    {index < insights.timeline.length - 1 && <span className="absolute bottom-0 left-[0.28rem] top-3 w-px bg-line-strong/50" aria-hidden="true" />}
                    <div className="min-w-0">
                      <p className={cn(event.isLoss && 'font-bold')}><span className="tabular font-semibold">{docLink(event.documentId, event.date)}</span>{event.daysAfterPrevious !== null && <span className="text-caption text-muted"> ({gap(event.daysAfterPrevious)})</span>}</p>
                      <p className="text-muted">{event.labels.join(', ')}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="text-muted">No dates found yet.</p>}
            {insights.daysToOpen !== null && insights.daysToOpen > 0 && <p className="mt-1 text-caption text-muted">The claim reached ClaimsFlow {insights.daysToOpen} days after the loss.</p>}
          </Part>
          <div>
            <Part title="Cover check">
              <p className={cn('font-medium', insights.cover.state !== 'inside' && coverTone[insights.cover.state])}>{insights.cover.text}</p>
              {insights.sumInsured && <p className={cn('mt-1', insights.sumInsured.over && 'font-medium text-danger')}>Sum insured {insights.sumInsured.text}{insights.sumInsured.over ? `, which is below the claim value of ${insights.value.text}.` : '.'}</p>}
              <p className="mt-1 text-caption text-muted">Dates and amounts only, not a decision on cover.</p>
            </Part>
            <Part title="People and contact">
              <Table rows={[
                ['Claimant', claim.claimantName],
                ['Email', claim.contactEmail && <a className="text-link" href={`mailto:${claim.contactEmail}`}>{claim.contactEmail}</a>],
                ['Phone', claim.contactPhone && <a className="text-link" href={`tel:${claim.contactPhone.replace(/[^+\d]/g, '')}`}>{claim.contactPhone}</a>],
                ...(claim.summary?.parties ?? []).filter((p) => p.name !== claim.claimantName).map((p) => [p.role, p.name] as [string, string]),
              ]} />
              {!claim.contactEmail && !claim.contactPhone && <p className="mt-1 font-medium text-danger">No email or phone was found in the documents.</p>}
            </Part>
            <Part title="Policy">
              <Table rows={[['Policy number', claim.policyNumber], ['Registration', claim.vehicleReg], ['Period', claim.policyStart || claim.policyEnd ? `${claim.policyStart || '?'} to ${claim.policyEnd || '?'}` : ''], ['Broker or source', claim.source]]} />
            </Part>
          </div>
        </div>

        {(claim.summary?.amounts.length ?? 0) > 0 && (
          <Part title="Amounts in the file">
            <Table rows={claim.summary!.amounts.map((a) => [a.label, docLink(a.document_id, a.value)])} />
          </Part>
        )}

        {insights.recheck.length > 0 && (
          <Part title="Read these yourself">
            <p className="mb-1 text-muted">The AI noted a problem reading these, so check what it found against the document.</p>
            <ul className="grid gap-1">{insights.recheck.map((item) => <li key={item.documentId}><strong>{docLink(item.documentId, item.filename)}</strong> {item.issues.join(' ')}</li>)}</ul>
          </Part>
        )}

        <Part title={`Documents (${claim.documents.length})`}>
          <ul className="grid gap-x-8 gap-y-0.5 sm:grid-cols-2 print:grid-cols-2">
            {claim.documents.map((doc) => (
              <li key={doc.id} className="min-w-0 break-words">
                {docLink(doc.id, doc.typeLabel ?? doc.filename)}
                <span className="text-caption text-muted"> {[doc.typeLabel ? doc.filename : '', doc.language && doc.language !== 'English' ? `in ${doc.language}, summarised in English` : '', doc.handwritten ? 'has handwriting' : ''].filter(Boolean).join(', ')}</span>
              </li>
            ))}
          </ul>
        </Part>

        {claim.checklist.length > 0 && (
          <Part title="Checklist">
            <ul className="grid gap-x-8 gap-y-0.5 sm:grid-cols-2 print:grid-cols-2">
              {claim.checklist.map((item) => (
                <li key={item.type}>
                  <strong className={item.documentIds.length ? 'text-ok' : item.required ? 'text-danger' : 'text-muted'}>{item.documentIds.length ? 'In file' : item.required ? 'Missing' : 'Optional'}</strong>{' '}
                  {item.documentIds.length ? docLink(item.documentIds[0], item.label) : item.label}
                </li>
              ))}
            </ul>
          </Part>
        )}

        <p className="mt-5 border-t border-line pt-2 text-caption text-muted">Prepared by ClaimsFlow on {formatDate(new Date().toISOString())}. AI-assisted: check details against the source documents. A person makes every decision on this claim.</p>
      </main>
    </div>
  );
}

function Glance({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className={cn('tabular font-display text-[1.5rem] font-extrabold leading-tight', tone)}>{value}</dd>
      {note && <dd className="text-caption text-muted">{note}</dd>}
    </div>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-1.5 font-display text-[1.4rem] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Table({ rows }: { rows: [string, React.ReactNode][] }) {
  const kept = rows.filter(([, value]) => value);
  if (!kept.length) return <p className="text-muted">Not known yet.</p>;
  return (
    <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-0.5">
      {kept.map(([label, value], index) => (
        <div key={`${label}${index}`} className="contents"><dt className="text-muted">{label}</dt><dd className="break-words font-medium">{value}</dd></div>
      ))}
    </dl>
  );
}
