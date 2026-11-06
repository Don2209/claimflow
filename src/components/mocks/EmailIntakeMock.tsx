import { Paperclip } from 'lucide-react';
import { intakeMock as data } from '@/content/samples';
import { Badge } from '../Badge';
import { MockWindow } from '../MockWindow';

export function EmailIntakeMock() {
  return (
    <MockWindow title={data.title}>
      <ul className="divide-y divide-line">
        {data.emails.map((email) => (
          <li key={email.subject} className="p-4">
            <p className="truncate text-caption text-muted">{email.from}</p>
            <p className="mt-0.5 text-small font-medium">{email.subject}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="inline-flex items-center gap-1 text-caption text-muted">
                <Paperclip aria-hidden="true" className="size-3.5" />
                {email.attachments} attachments
              </span>
              <Badge tone="ok">
                {data.matchedLabel} {email.match}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </MockWindow>
  );
}
