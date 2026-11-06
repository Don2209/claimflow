import { ArrowLeft, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { api, type Claim } from '../api';
import { Button, formatDate, Loading, Notice, useLoad } from '../ui';

/** The same layout every time, so an officer knows where to look. */
export function SummaryPage() {
  const { id } = useParams();
  const { data: claim, error } = useLoad(() => api<Claim>(`/claims/${id}?refresh=1`), [id]);
  if (error) return <div className="p-6"><Notice tone="danger">{error}</Notice></div>;
  if (!claim) return <div className="px-6"><Loading /></div>;
  const flags = claim.flags.filter((flag) => flag.status === 'open');
  const docLink = (documentId: string, children: React.ReactNode) =>
    claim.documents.some((doc) => doc.id === documentId) ? <a className="text-link" target="_blank" rel="noreferrer" href={`/api/documents/${documentId}/file`}>{children}</a> : children;

  return (
    <div className="min-h-dvh bg-sunken/60 p-3 print:bg-white print:p-0 sm:p-6">
      <div className="mx-auto mb-3 flex max-w-[50rem] justify-between gap-2 print:hidden">
        <Link to={`/claims/${claim.id}`}><Button tabIndex={-1}><ArrowLeft className="size-4" aria-hidden="true" /> Back to the file</Button></Link>
        <Button variant="main" onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" /> Print or save as PDF</Button>
      </div>
      <main className="mx-auto max-w-[50rem] bg-paper p-6 text-small text-paper-ink shadow-paper print:max-w-none print:p-0 print:shadow-none sm:p-9">
        <header className="flex items-start justify-between gap-4 border-b-2 border-paper-ink pb-3">
          <div>
            <h1 className="tabular font-display text-[2.1rem] font-extrabold leading-none">{claim.ref}</h1>
            <p className="mt-1">{claim.className ?? 'Class not chosen'}. {claim.stageLabel}.</p>
          </div>
          <Logo />
        </header>
        <Part title="What happened"><p>{claim.summary?.overview ?? 'The documents have not been reviewed yet.'}</p></Part>
        <div className="grid gap-x-8 sm:grid-cols-2 print:grid-cols-2">
          <Part title="Parties">
            <Table rows={[['Claimant', claim.claimantName], ...(claim.summary?.parties ?? []).filter((p) => p.name !== claim.claimantName).map((p) => [p.role, p.name] as [string, string])]} />
          </Part>
          <Part title="Policy">
            <Table rows={[['Policy number', claim.policyNumber], ['Registration', claim.vehicleReg], ['Period', claim.policyStart || claim.policyEnd ? `${claim.policyStart} to ${claim.policyEnd}` : ''], ['Broker or branch', claim.source]]} />
          </Part>
          <Part title="Dates">
            <Table rows={[['Date of loss', claim.lossDate], ...(claim.summary?.dates ?? []).filter((d) => d.value !== claim.lossDate).map((d) => [d.label, docLink(d.document_id, d.value)] as [string, React.ReactNode])]} />
          </Part>
          <Part title="Amounts">
            {claim.summary?.amounts.length ? <Table rows={claim.summary.amounts.map((a) => [a.label, docLink(a.document_id, a.value)])} /> : <p className="text-muted">None found.</p>}
          </Part>
        </div>
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
        <Part title={`Flags to check (${flags.length})`}>
          {flags.length ? <ul className="grid gap-1.5">{flags.map((flag) => <li key={flag.id}><strong>{flag.title}</strong> {flag.detail}</li>)}</ul> : <p className="text-muted">None open.</p>}
        </Part>
        <p className="mt-5 border-t border-line pt-2 text-caption text-muted">Prepared by ClaimsFlow on {formatDate(new Date().toISOString())}. AI-assisted: check details against the source documents. A person makes every decision on this claim.</p>
      </main>
    </div>
  );
}

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="mb-1 font-display text-[1.25rem] font-extrabold">{title}</h2>
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
