import { flagsMock as data } from '@/content/samples';
import { cn } from '@/lib/cn';
import { StatusIcon } from '../Icons';
import { MockWindow } from '../MockWindow';

export function FlagsMock() {
  return (
    <MockWindow title={data.title}>
      <ul className="space-y-2 p-3 sm:p-4">
        {data.items.map((item) => (
          <li
            key={item.title}
            className={cn(
              'flex gap-2.5 rounded-md p-3',
              item.tone === 'danger' ? 'bg-danger-soft' : 'bg-warn-soft',
            )}
          >
            <StatusIcon status={item.tone} className="mt-0.5" />
            <div>
              <p className="text-small font-semibold">{item.title}</p>
              <p className="mt-0.5 text-caption">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-caption text-muted">{data.footer}</p>
    </MockWindow>
  );
}
