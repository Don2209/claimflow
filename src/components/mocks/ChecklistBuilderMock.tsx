import { GripVertical, Plus } from 'lucide-react';
import { builderMock as data } from '@/content/samples';
import { cn } from '@/lib/cn';
import { MockWindow } from '../MockWindow';

export function ChecklistBuilderMock() {
  return (
    <MockWindow title={data.title}>
      <div className="grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="flex gap-1 overflow-hidden border-b border-line p-2 max-sm:flex-wrap sm:block sm:space-y-0.5 sm:border-b-0 sm:border-r">
          {data.classes.map((name) => (
            <li
              key={name}
              className={cn(
                'rounded-sm px-2 py-1.5 text-caption',
                name === data.activeClass ? 'bg-ok-soft font-medium text-ok' : 'text-muted',
              )}
            >
              {name}
            </li>
          ))}
        </ul>
        <div className="p-3 sm:p-4">
          <ul className="space-y-1.5">
            {data.items.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 rounded-md border border-line px-2 py-2 text-caption"
              >
                <GripVertical aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 font-medium">{item.label}</span>
                <span
                  className={cn(
                    'shrink-0 rounded-sm px-1.5 py-0.5 text-micro',
                    item.required ? 'bg-fg text-canvas' : 'border border-line-strong text-muted',
                  )}
                >
                  {item.required ? data.requiredLabel : data.optionalLabel}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 inline-flex items-center gap-1.5 text-caption font-medium text-ok">
            <Plus aria-hidden="true" className="size-3.5" />
            {data.add}
          </p>
        </div>
      </div>
    </MockWindow>
  );
}
