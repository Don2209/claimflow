import { dashboardMock as data } from '@/content/samples';
import { MockWindow } from '../MockWindow';

export function DashboardMock() {
  const max = Math.max(...data.bars.map((bar) => bar.value));

  return (
    <MockWindow title={data.title}>
      <div className="p-4 sm:p-5">
        <dl className="grid grid-cols-3 gap-3 border-b border-line pb-4">
          {data.tiles.map((tile) => (
            <div key={tile.label}>
              <dd className="tabular text-display-sm font-semibold">{tile.value}</dd>
              <dt className="mt-0.5 text-caption text-muted">{tile.label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-caption font-medium">{data.chartTitle}</p>
            <ul className="mt-2.5 space-y-2">
              {data.bars.map((bar) => (
                <li key={bar.label}>
                  <div className="flex justify-between gap-2 text-caption">
                    <span className="text-muted">{bar.label}</span>
                    <span className="tabular font-medium">{bar.value}</span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-1 h-1.5 rounded-r-[3px] bg-fg/70"
                    style={{ width: `${(bar.value / max) * 100}%` }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-caption font-medium">{data.waitingTitle}</p>
            <ul className="mt-2.5 divide-y divide-line">
              {data.waiting.map((row) => (
                <li key={row.ref} className="flex items-baseline justify-between gap-2 py-1.5">
                  <span className="min-w-0">
                    <span className="block text-caption font-medium">{row.ref}</span>
                    <span className="block text-caption text-muted">{row.missing}</span>
                  </span>
                  <span className="tabular shrink-0 text-caption font-medium text-warn">
                    {row.days}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}
