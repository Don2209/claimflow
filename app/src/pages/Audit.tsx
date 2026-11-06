import { api } from '../api';
import { formatTime, Loading, Notice, PageTitle, Sheet, useLoad } from '../ui';

type Row = { id: number; at: string; actor: string; action: string; claim_ref: string | null; detail: string };

export function Audit() {
  const { data, error } = useLoad(() => api<Row[]>('/audit'));
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <Loading />;
  return (
    <>
      <PageTitle title="Audit trail" />
      <Sheet>
        <p className="mb-3 text-caption text-muted">The latest 500 actions. Entries cannot be edited, including by managers.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-small">
            <thead className="text-caption text-muted"><tr><th className="py-1.5 pr-4 font-semibold">When</th><th className="pr-4 font-semibold">Who</th><th className="pr-4 font-semibold">What</th><th className="pr-4 font-semibold">Claim</th><th className="font-semibold">Detail</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="tabular whitespace-nowrap py-1.5 pr-4">{formatTime(row.at)}</td>
                  <td className="pr-4 py-1.5">{row.actor}</td>
                  <td className="pr-4 py-1.5">{row.action}</td>
                  <td className="tabular whitespace-nowrap pr-4 py-1.5">{row.claim_ref}</td>
                  <td className="py-1.5 text-muted">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>
    </>
  );
}
