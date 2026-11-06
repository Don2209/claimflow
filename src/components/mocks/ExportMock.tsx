import { FileSpreadsheet } from 'lucide-react';
import { exportMock as data } from '@/content/samples';
import { MockWindow } from '../MockWindow';

export function ExportMock() {
  return (
    <MockWindow title={data.title}>
      <div className="p-4 sm:p-5">
        <p className="flex items-center gap-2 text-small font-medium">
          <FileSpreadsheet aria-hidden="true" className="size-4 text-ok" />
          {data.file}
        </p>
        <div className="mt-3 overflow-hidden rounded-md border border-line">
          <table className="tabular w-full table-fixed text-left text-micro sm:text-caption">
            <thead className="bg-sunken/60">
              <tr>
                {data.columns.map((column) => (
                  <th key={column} scope="col" className="px-2 py-1.5 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row[0]} className="border-t border-line">
                  {row.map((cell) => (
                    <td key={cell} className="break-words px-2 py-1.5 align-top text-muted">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {data.actions.map((action) => (
            <li
              key={action}
              className="rounded-sm border border-line-strong px-2 py-1 text-caption font-medium"
            >
              {action}
            </li>
          ))}
        </ul>
      </div>
    </MockWindow>
  );
}
