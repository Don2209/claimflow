import { draftMock as data } from '@/content/samples';
import { Button } from '../Button';
import { MockWindow } from '../MockWindow';

export function MissingDocsEmailMock() {
  return (
    <MockWindow title={data.title}>
      <div className="p-4 sm:p-5">
        <dl className="space-y-1 border-b border-line pb-3 text-caption">
          <div className="flex gap-2">
            <dt className="text-muted">To</dt>
            <dd className="min-w-0 break-words">{data.to}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Subject</dt>
            <dd className="min-w-0 font-medium">{data.subject}</dd>
          </div>
        </dl>
        <div className="mt-3 space-y-2 text-small">
          {data.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2">
          <Button tabIndex={-1} className="pointer-events-none">
            {data.approve}
          </Button>
          <Button tabIndex={-1} variant="secondary" className="pointer-events-none">
            {data.edit}
          </Button>
        </div>
      </div>
    </MockWindow>
  );
}
