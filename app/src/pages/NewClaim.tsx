import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api, uploadFiles, type Claim } from '../api';
import { ClaimFields, emptyClaim, type ClaimValues } from '../ClaimForm';
import type { ShellContext } from '../Shell';
import { Button, DropZone, Notice, PageTitle, Sheet } from '../ui';

export function NewClaim() {
  const { meta } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const [values, setValues] = useState<ClaimValues>(emptyClaim);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const claim = await api<Claim>('/claims', { body: { ...values, class_id: values.class_id || null } });
      if (files.length) {
        try {
          await uploadFiles(`/claims/${claim.id}/documents`, files, setProgress, {}, meta.directUploads ? `claim-${claim.id}` : undefined);
        } catch {
          // The claim exists, so carry on to it and let the handler add the files there.
        }
      }
      navigate(`/claims/${claim.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Open a claim" />
      <form onSubmit={submit} className="grid max-w-4xl gap-4">
        {error && <Notice tone="danger">{error}</Notice>}
        <Sheet title="The documents">
          <DropZone label="Add documents" busy={busy && files.length > 0} progress={progress} onFiles={(added) => setFiles([...files, ...added])} />
          {files.length > 0 && (
            <ul className="mt-3 grid gap-1">
              {files.map((file, index) => (
                <li key={`${file.name}${index}`} className="flex items-center justify-between gap-3 rounded-md bg-sunken/70 px-3 py-1.5 text-small">
                  <span className="truncate">{file.name}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, i) => i !== index))} className="grid size-8 place-items-center rounded-md hover:bg-surface"><X className="size-4" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
        <Sheet title="What you already know">
          <p className="mb-4 text-small text-muted">Leave blanks if you like. Blanks are filled from the documents, and anything you enter is checked against them.</p>
          <ClaimFields values={values} set={(key, value) => setValues({ ...values, [key]: value })} meta={meta} />
        </Sheet>
        <div><Button type="submit" variant="main" busy={busy}>Open claim</Button></div>
      </form>
    </>
  );
}
