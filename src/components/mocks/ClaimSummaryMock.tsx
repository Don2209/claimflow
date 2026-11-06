import { summaryMock as data } from '@/content/samples';
import { StatusIcon } from '../Icons';
import { MockWindow } from '../MockWindow';

export function ClaimSummaryMock() {
  return (
    <MockWindow title={data.title}>
      <div className="p-4 sm:p-5">
        <p className="font-semibold">{data.heading}</p>
        <dl className="mt-3 divide-y divide-line border-y border-line">
          {data.rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-2 text-small">
              <dt className="text-muted">{row.label}</dt>
              <dd className="tabular text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-3 space-y-1.5">
          {data.statuses.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-small">
              <StatusIcon status={item.status} />
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-caption text-muted">{data.footer}</p>
      </div>
    </MockWindow>
  );
}
