import { Link } from 'react-router-dom';
import { api } from '../api';
import { Loading, Notice, PageTitle, Sheet, useLoad } from '../ui';

type Data = {
  openClaims: number; handedOver: number; documentsRead: number; openFlags: number; stages: Record<string, number>;
  waiting: { id: string; ref: string; claimantName: string; source: string; missing: string[]; days: number }[];
  sources: { source: string; total: number; incomplete: number }[];
};

export function Dashboard() {
  const { data, error } = useLoad(() => api<Data>('/dashboard'));
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <Loading />;
  const figures: [string, number][] = [['Open files', data.openClaims], ['Waiting on documents', data.waiting.length], ['Open flags', data.openFlags], ['Documents read', data.documentsRead]];
  return (
    <>
      <PageTitle title="Where files are stuck" />
      <dl className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="bg-paper p-4 text-paper-ink shadow-paper">
            <dd className="tabular font-display text-[2.6rem] font-extrabold leading-none">{value}</dd>
            <dt className="mt-1 text-small text-muted">{label}</dt>
          </div>
        ))}
      </dl>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Sheet title="Waiting longest">
          {!data.waiting.length ? <p className="text-small text-muted">No file is waiting on documents.</p> : (
            <ul className="divide-y divide-line">
              {data.waiting.map((row) => (
                <li key={row.id} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 py-2.5">
                  <span className="tabular font-display text-[1.6rem] font-extrabold leading-none">{row.days}<span className="block font-sans text-caption font-normal text-muted">{row.days === 1 ? 'day' : 'days'}</span></span>
                  <span className="min-w-0">
                    <Link className="text-small font-semibold text-accent underline" to={`/claims/${row.id}`}>{row.ref}</Link>
                    <span className="text-small"> {row.claimantName}{row.source ? `, ${row.source}` : ''}</span>
                    <span className="block text-caption text-warn">Missing: {row.missing.join(', ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
        <Sheet title="Who sends incomplete files">
          {!data.sources.length ? <p className="text-small text-muted">Nothing to show yet.</p> : (
            <ul className="grid gap-3">
              {data.sources.map((row) => {
                const share = row.total ? row.incomplete / row.total : 0;
                return (
                  <li key={row.source}>
                    <p className="flex justify-between gap-3 text-small"><span className="truncate font-semibold">{row.source}</span><span className="tabular shrink-0 text-muted">{row.incomplete} of {row.total}</span></p>
                    <div className="mt-1 h-2 bg-sunken" aria-hidden="true"><div className="h-full bg-danger" style={{ width: `${Math.round(share * 100)}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Sheet>
      </div>
    </>
  );
}
