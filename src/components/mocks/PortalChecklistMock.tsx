import { Camera } from 'lucide-react';
import { Button } from '../Button';
import { StatusIcon } from '../Icons';
import { MockWindow } from '../MockWindow';
import { portalMock as data } from '@/content/samples';

export function PortalChecklistMock() {
  return (
    <MockWindow title={data.title}>
      <div className="p-4 sm:p-5">
        <p className="text-caption text-muted">Reference {data.reference}</p>
        <p className="mt-0.5 font-semibold">{data.intro}</p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {data.items.map((item) => (
            <li key={item.label} className="flex items-center gap-2.5 py-2.5 text-small">
              <StatusIcon status={item.status} />
              <span className="min-w-0 flex-1">{item.label}</span>
              <span className="text-caption text-muted">{item.note}</span>
            </li>
          ))}
        </ul>
        <div aria-hidden="true" className="mt-4">
          <Button variant="secondary" tabIndex={-1} className="pointer-events-none w-full">
            <Camera className="size-4" />
            {data.upload}
          </Button>
        </div>
      </div>
    </MockWindow>
  );
}
