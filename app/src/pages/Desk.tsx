import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Flag, Plus, Search } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { api, type ClaimRow } from '../api';
import type { ShellContext } from '../Shell';
import { Button, inputClass, Loading, Notice, PageTitle, StageStamp, formatDate } from '../ui';

const order = ['needs_person', 'flagged', 'missing', 'ready', 'reading', 'new', 'handed_over'];

export function Desk() {
  const { meta } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClaimRow[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('');

  useEffect(() => {
    let live = true;
    const load = () =>
      api<ClaimRow[]>(`/claims?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (live) {
            setRows(data);
            setError('');
          }
        })
        .catch((err) => live && setError(err.message));
    const timer = setTimeout(load, q ? 200 : 0);
    const refresh = setInterval(load, 8000);
    return () => {
      live = false;
      clearTimeout(timer);
      clearInterval(refresh);
    };
  }, [q]);

  const counts = order.map((key) => ({ key, label: meta.stages[key], n: rows?.filter((row) => row.stage === key).length ?? 0 })).filter((item) => item.n);
  const shown = (rows ?? []).filter((row) => !stage || row.stage === stage);

  return (
    <>
      <PageTitle title="Claims desk">
        <a href="/api/export/claims.csv"><Button tabIndex={-1}><Download className="size-4" aria-hidden="true" /> CSV</Button></a>
        <a href="/api/export/claims.xlsx"><Button tabIndex={-1}><FileSpreadsheet className="size-4" aria-hidden="true" /> Excel</Button></a>
        <Link to="/claims/new"><Button variant="main" tabIndex={-1}><Plus className="size-4" aria-hidden="true" /> Open a claim</Button></Link>
      </PageTitle>
      {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input aria-label="Search claims" className={cn(inputClass, 'pl-9')} placeholder="Reference, name, policy, registration" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by stage">
          <Chip active={!stage} onClick={() => setStage('')}>All {rows ? `(${rows.length})` : ''}</Chip>
          {counts.map((item) => (
            <Chip key={item.key} active={stage === item.key} onClick={() => setStage(stage === item.key ? '' : item.key)}>{item.label} ({item.n})</Chip>
          ))}
        </div>
      </div>

      {!rows ? <Loading /> : !shown.length ? (
        <div className="rounded-sm bg-paper px-6 py-14 text-center text-paper-ink shadow-paper">
          <p className="pen text-[2.2rem] leading-none">{rows.length ? 'Nothing matches that.' : 'The desk is clear.'}</p>
          <p className="mt-2 text-small text-muted">{rows.length ? 'Try a different search or stage.' : 'Open your first claim and add its documents.'}</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {shown.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => navigate(`/claims/${row.id}`)} className="grid w-full gap-x-4 gap-y-2 rounded-sm bg-paper p-3.5 text-left text-paper-ink shadow-paper transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:grid-cols-[9.5rem_minmax(0,1.3fr)_minmax(0,1.5fr)_13.5rem] md:items-center">
                <span>
                  <span className="tabular block text-small font-bold">{row.ref}</span>
                  <span className="block text-caption text-muted">{formatDate(row.createdAt)}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{row.claimantName || 'Claimant not known yet'}</span>
                  <span className="block truncate text-caption text-muted">{[row.className ?? 'Class not chosen', row.vehicleReg, row.source].filter(Boolean).join(', ')}</span>
                </span>
                <span className="min-w-0 text-caption">
                  {row.missing.length > 0 && <span className="block truncate text-warn">Missing: {row.missing.join(', ')}</span>}
                  <span className="inline-flex items-center gap-3 text-muted">
                    {row.documents} {row.documents === 1 ? 'document' : 'documents'}
                    {row.openFlags > 0 && <span className="inline-flex items-center gap-1 font-semibold text-danger"><Flag className="size-3.5" aria-hidden="true" />{row.openFlags} {row.openFlags === 1 ? 'flag' : 'flags'}</span>}
                  </span>
                </span>
                <span className="md:text-right"><StageStamp stage={row.stage} label={row.stageLabel} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn('min-h-9 rounded-full border px-3 text-caption font-semibold transition-colors', active ? 'border-fg bg-fg text-canvas' : 'border-line-strong/50 bg-surface hover:bg-sunken')}>
      {children}
    </button>
  );
}
