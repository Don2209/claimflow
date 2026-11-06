import { queueMock as data } from '@/content/samples';
import { Badge } from '../Badge';
import { MockWindow } from '../MockWindow';

export function ClaimsQueueMock() {
  return (
    <MockWindow title={data.title}>
      <table className="w-full text-left text-caption">
        <thead className="sr-only sm:not-sr-only">
          <tr className="text-muted">
            {data.columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`px-4 pb-1 pt-3 font-medium ${index === 1 ? 'hidden sm:table-cell' : ''}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.ref} className="border-t border-line">
              <td className="px-4 py-2.5">
                <span className="block font-medium">{row.ref}</span>
                <span className="block text-muted">{row.name}</span>
              </td>
              <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{row.sender}</td>
              <td className="px-4 py-2.5">
                <Badge tone={row.tone}>{row.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </MockWindow>
  );
}
