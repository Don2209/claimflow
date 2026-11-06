import { extractMock as data } from '@/content/samples';
import { Badge } from '../Badge';
import { DocSheet } from '../DocSheet';
import { MockWindow } from '../MockWindow';

export function ExtractMock() {
  return (
    <MockWindow title={data.title}>
      <div className="grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="bg-sunken/50 p-5">
          <DocSheet variant="handwritten" className="mx-auto aspect-[3/4] max-w-44" />
        </div>
        <div className="p-4 sm:p-5">
          <Badge>{data.source}</Badge>
          <dl className="mt-3 space-y-2.5">
            {data.fields.map((field) => (
              <div key={field.label}>
                <dt className="text-caption text-muted">{field.label}</dt>
                <dd className="tabular text-small font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </MockWindow>
  );
}
