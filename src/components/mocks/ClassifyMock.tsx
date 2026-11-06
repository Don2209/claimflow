import { classifyMock as data } from '@/content/samples';
import { Badge } from '../Badge';
import { DocSheet } from '../DocSheet';
import { MockWindow } from '../MockWindow';

export function ClassifyMock() {
  return (
    <MockWindow title={data.title}>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 bg-sunken/50 p-4 sm:grid-cols-3 sm:p-5">
        {data.docs.map((doc, index) => (
          <li key={doc.label} className="min-w-0">
            <DocSheet
              variant={doc.variant}
              className={
                index % 2 ? 'aspect-[4/5] rotate-[0.8deg]' : 'aspect-[4/5] -rotate-[0.8deg]'
              }
            />
            <Badge tone="ok" className="mt-2.5">
              {doc.label}
            </Badge>
          </li>
        ))}
      </ul>
    </MockWindow>
  );
}
