import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, Copy, ExternalLink, FileText, Image as ImageIcon, LoaderCircle, Mail, Printer, RotateCw, Send, Trash2, X } from 'lucide-react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { api, uploadFiles, type Claim, type Doc, type Flag } from '../api';
import { ClaimFields, type ClaimValues } from '../ClaimForm';
import type { ShellContext } from '../Shell';
import { QuoteCompare } from '../QuoteCompare';
import { Button, DropZone, Field, formatDate, formatTime, inputClass, Loading, Notice, Sheet, StageStamp, useLoad } from '../ui';

export function ClaimFile() {
  const { id } = useParams();
  const { user, meta } = useOutletContext<ShellContext>();
  const navigate = useNavigate();
  const { data: claim, setData, error, reload } = useLoad(() => api<Claim>(`/claims/${id}`), [id]);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  // Watch for progress without logging each check as someone viewing the claim.
  useEffect(() => {
    if (!claim || claim.stage !== 'reading') return;
    const timer = setInterval(() => void api<Claim>(`/claims/${id}?refresh=1`).then(setData).catch(() => undefined), 2500);
    return () => clearInterval(timer);
  }, [claim?.stage, id, setData]);

  if (error && !claim) return <Notice tone="danger">{error}</Notice>;
  if (!claim) return <Loading />;

  const act = async (run: () => Promise<Claim>) => {
    setActionError('');
    try {
      setData(await run());
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  async function addFiles(files: File[]) {
    if (!files.length) return;
    setProgress(0);
    setActionError('');
    setNotice('');
    try {
      const result = await uploadFiles(`/claims/${id}/documents`, files, setProgress, {}, meta.directUploads ? `claim-${id}` : undefined);
      if (result.rejected.length) setActionError(result.rejected.join(' '));
      await reload();
    } catch (err) {
      setActionError((err as Error).message);
    }
    setProgress(null);
  }

  const missing = claim.checklist.filter((item) => item.required && !item.documentIds.length);
  const openFlags = claim.flags.filter((flag) => flag.status === 'open');
  const doc = claim.documents.find((item) => item.id === openDoc);

  return (
    <>
      <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-small font-semibold text-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden="true" /> Claims desk</Link>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="tabular font-display text-display-sm font-extrabold sm:text-[2.75rem]">{claim.ref}</h1>
          <p className="text-small text-muted">
            {[claim.claimantName || 'Claimant not known yet', claim.className ?? 'Class not chosen', claim.vehicleReg].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StageStamp stage={claim.stage} label={claim.stageLabel} large />
          <Link to={`/claims/${claim.id}/summary`}><Button tabIndex={-1}><Printer className="size-4" aria-hidden="true" /> Claim summary</Button></Link>
          <Button
            variant={claim.handedOverAt ? 'quiet' : 'main'}
            onClick={() => act(() => api(`/claims/${id}/handover`, { body: { handedOver: !claim.handedOverAt } }))}
          >
            {claim.handedOverAt ? 'Reopen file' : 'Hand to claims officer'}
          </Button>
        </div>
      </header>

      <div className="mb-4 grid gap-2">
        {actionError && <Notice tone="danger">{actionError}</Notice>}
        {notice && <Notice tone="ok">{notice}</Notice>}
        {!claim.classId && <Notice>Choose a class of business under Claim details, so this file has a checklist.</Notice>}
        {claim.analysisStatus === 'failed' && <Notice tone="danger">The file could not be reviewed: {claim.analysisError} <button type="button" className="font-semibold underline" onClick={() => act(async () => { await api(`/claims/${id}/review`, { method: 'POST' }); return api(`/claims/${id}?refresh=1`); })}>Try again</button></Notice>}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="order-2 grid gap-4 lg:order-none">
          <Sheet title="Checklist" aside={claim.checklist.length > 0 && <span className="text-caption text-muted">{claim.checklist.filter((i) => i.documentIds.length).length} of {claim.checklist.length} in the file</span>}>
            {!claim.checklist.length ? <p className="text-small text-muted">No checklist yet.</p> : (
              <ul className="grid gap-1">
                {claim.checklist.map((item) => {
                  const have = item.documentIds.length > 0;
                  return (
                    <li key={item.type} className="flex min-h-9 items-center gap-2.5 text-small">
                      <span className={cn('grid size-6 shrink-0 place-items-center rounded-sm border-2', have ? 'border-ok bg-ok-soft text-ok' : item.required ? 'border-danger text-danger' : 'border-line text-muted')}>
                        {have ? <Check className="size-4" strokeWidth={3} aria-label="Received" /> : item.required ? <X className="size-3.5" strokeWidth={3} aria-label="Missing" /> : <span className="sr-only">Optional, not received</span>}
                      </span>
                      <span className={cn('min-w-0 flex-1', !have && !item.required && 'text-muted')}>{item.label}{!item.required && <span className="text-muted"> (optional)</span>}</span>
                      {have && <button type="button" className="text-caption font-semibold text-accent underline" onClick={() => setOpenDoc(item.documentIds[0])}>Open</button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Sheet>

          <Sheet title="Documents">
            <ul className="mb-3 grid gap-2">
              {claim.documents.map((item) => <DocRow key={item.id} doc={item} onOpen={() => setOpenDoc(item.id)} />)}
            </ul>
            <DropZone label="Add documents" busy={progress !== null} progress={progress ?? 0} onFiles={addFiles} />
          </Sheet>

          <Sheet title="Upload link" >
            <p className="mb-3 text-small text-muted">Send this to the broker or claimant. They can see the checklist and add documents, and nothing else.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void navigator.clipboard.writeText(claim.portalLink).then(() => setNotice('Upload link copied.'), () => setActionError(claim.portalLink))}><Copy className="size-4" aria-hidden="true" /> Copy link</Button>
              <a href={claim.portalLink} target="_blank" rel="noreferrer"><Button tabIndex={-1}><ExternalLink className="size-4" aria-hidden="true" /> Preview</Button></a>
              <Button onClick={() => { if (window.confirm('Replace this link? The old one will stop working straight away.')) void act(() => api(`/claims/${id}/portal`, { method: 'POST' })); }}><RotateCw className="size-4" aria-hidden="true" /> Replace</Button>
            </div>
          </Sheet>
        </div>

        <div className="order-1 grid gap-4 lg:order-none">
          <Sheet title="What the file says" aside={claim.analysedAt && <span className="text-caption text-muted">Reviewed {formatTime(claim.analysedAt)}</span>}>
            {claim.summary ? <p className="text-body">{claim.summary.overview}</p> : <p className="text-small text-muted">{claim.stage === 'reading' ? 'Reading the documents now.' : 'A summary appears once documents have been read.'}</p>}
          </Sheet>

          <Sheet title={openFlags.length ? `Flags for you to check (${openFlags.length})` : 'Flags'}>
            {!claim.flags.length && <p className="text-small text-muted">Nothing flagged so far.</p>}
            <ul className="grid gap-2.5">
              {claim.flags.map((flag) => (
                <FlagRow key={flag.id} flag={flag} docs={claim.documents} onOpenDoc={setOpenDoc} onChange={(status, note) => act(() => api(`/flags/${flag.id}`, { method: 'PATCH', body: { status, note } }))} />
              ))}
            </ul>
          </Sheet>

          {claim.insights.comparison.quotes.length > 1 && (
            <Sheet title={`${claim.insights.comparison.quotes.length} quotes compared`}>
              <QuoteCompare insights={claim.insights} docLink={(documentId, children) => <button type="button" className="text-left font-semibold text-accent underline" onClick={() => setOpenDoc(documentId)}>{children}</button>} />
            </Sheet>
          )}

          {(claim.summary?.next_steps?.length ?? 0) > 0 && (
            <Sheet title="Next steps to consider">
              <ol className="grid list-decimal gap-1.5 pl-5 text-small">{claim.summary!.next_steps!.map((step) => <li key={step}>{step}</li>)}</ol>
            </Sheet>
          )}

          <RequestEmail claim={claim} missing={missing.map((item) => item.label)} sending={meta.sending} setData={setData} setError={setActionError} setNotice={setNotice} />

          <Sheet title="Claim details" aside={<Button onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Button>}>
            {editing ? <EditDetails claim={claim} meta={meta} onSaved={(next) => { setData(next); setEditing(false); }} /> : (
              <dl className="grid gap-x-6 gap-y-2.5 text-small sm:grid-cols-2">
                {[
                  ['Claimant', claim.claimantName], ['Class', claim.className], ['Policy number', claim.policyNumber], ['Registration', claim.vehicleReg],
                  ['Date of loss', claim.lossDate], ['Policy period', claim.policyStart || claim.policyEnd ? `${claim.policyStart || '?'} to ${claim.policyEnd || '?'}` : ''],
                  ['Broker or branch', claim.source], ['Email for requests', claim.contactEmail], ['Phone', claim.contactPhone], ['Notes', claim.notes], ['Opened', `${formatDate(claim.createdAt)} by ${claim.createdBy}`],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0"><dt className="text-caption text-muted">{label}</dt><dd className="break-words font-medium">{value || 'Not known yet'}</dd></div>
                ))}
              </dl>
            )}
            {user.role === 'manager' && (
              <div className="mt-4 border-t border-line pt-3">
                <Button variant="danger" onClick={() => {
                  if (window.confirm(`Permanently delete ${claim.ref} and all its documents? This cannot be undone.`)) void api(`/claims/${id}`, { method: 'DELETE' }).then(() => navigate('/'), (err) => setActionError(err.message));
                }}><Trash2 className="size-4" aria-hidden="true" /> Delete claim and documents</Button>
              </div>
            )}
          </Sheet>
        </div>
      </div>

      {doc && <DocPanel doc={doc} meta={meta} onClose={() => setOpenDoc(null)} onChange={setData} />}
    </>
  );
}

function DocRow({ doc, onOpen }: { doc: Doc; onOpen: () => void }) {
  const Icon = doc.mime === 'application/pdf' ? FileText : ImageIcon;
  const busy = doc.status === 'queued' || doc.status === 'reading';
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-md border border-line p-2.5 text-left transition-colors hover:bg-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        <Icon className="size-5 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small font-semibold">{doc.typeLabel ?? (doc.status === 'failed' ? 'Could not be read' : 'Not read yet')}</span>
          <span className="block truncate text-caption text-muted">{doc.filename}</span>
        </span>
        {busy && <span className="inline-flex items-center gap-1 text-caption font-semibold text-accent"><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />{doc.status === 'queued' ? 'Waiting' : 'Reading'}</span>}
        {doc.status === 'failed' && <CircleAlert className="size-4 shrink-0 text-danger" aria-label="Failed" />}
        {doc.status === 'done' && doc.confidence === 'low' && <span className="text-caption font-semibold text-warn">Check this</span>}
        {doc.status === 'done' && doc.issues.length > 0 && doc.confidence !== 'low' && <CircleAlert className="size-4 shrink-0 text-warn" aria-label="Has reading problems" />}
      </button>
    </li>
  );
}

function FlagRow({ flag, docs, onOpenDoc, onChange }: { flag: Flag; docs: Doc[]; onOpenDoc: (id: string) => void; onChange: (status: string, note: string) => void }) {
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const open = flag.status === 'open';
  return (
    <li className={cn('border-l-4 py-1 pl-3', !open ? 'border-line opacity-70' : flag.severity === 'attention' ? 'border-danger' : 'border-warn')}>
      <p className={cn('text-small font-semibold', !open && 'line-through')}>{flag.title}</p>
      <p className="text-small text-muted">{flag.detail}</p>
      {flag.documentIds.length > 0 && (
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-caption">
          {flag.documentIds.map((id) => {
            const doc = docs.find((item) => item.id === id);
            return doc ? <button key={id} type="button" className="font-semibold text-accent underline" onClick={() => onOpenDoc(id)}>{doc.typeLabel ?? doc.filename}</button> : null;
          })}
        </p>
      )}
      {!open && <p className="mt-1 text-caption text-muted">Marked {flag.status} by {flag.resolvedBy}{flag.note ? `: ${flag.note}` : ''}. <button type="button" className="underline" onClick={() => onChange('open', '')}>Reopen</button></p>}
      {open && !noting && (
        <div className="mt-1.5 flex gap-3 text-caption font-semibold">
          <button type="button" className="underline" onClick={() => setNoting(true)}>Deal with this</button>
        </div>
      )}
      {open && noting && (
        <div className="mt-2 grid gap-2">
          <input aria-label="Your note" className={inputClass} placeholder="Your note, for the audit trail" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onChange('resolved', note)}>Sorted it</Button>
            <Button onClick={() => onChange('dismissed', note)}>Not an issue</Button>
            <Button onClick={() => setNoting(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function RequestEmail({ claim, missing, sending, setData, setError, setNotice }: { claim: Claim; missing: string[]; sending: boolean; setData: (claim: Claim) => void; setError: (m: string) => void; setNotice: (m: string) => void }) {
  const [subject, setSubject] = useState(claim.draft.subject);
  const [body, setBody] = useState(claim.draft.body);
  const [to, setTo] = useState(claim.contactEmail);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const edited = useRef(false);

  // Take in a new AI draft, unless someone has started typing here.
  useEffect(() => {
    if (!edited.current) {
      setSubject(claim.draft.subject);
      setBody(claim.draft.body);
      setTo(claim.contactEmail);
    }
  }, [claim.draft.subject, claim.draft.body, claim.contactEmail]);

  if (!missing.length && !claim.draft.body) return null;

  const fullBody = `${body}\n\nUpload the documents here:\n${claim.portalLink}`;
  const approve = async (viaOwnEmail: boolean) => {
    setBusy(true);
    setError('');
    try {
      const next = await api<Claim>(`/claims/${claim.id}/draft/approve`, { body: { subject, body, to, viaOwnEmail } });
      setData(next);
      edited.current = false;
      setOpened(false);
      setNotice(viaOwnEmail ? 'Recorded as sent.' : `Sent to ${to}.`);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };
  const type = (run: (value: string) => void) => (event: { target: { value: string } }) => {
    edited.current = true;
    run(event.target.value);
  };

  return (
    <Sheet title="Request for what is missing" aside={claim.draft.sentAt && <span className="text-caption font-semibold text-ok">Last sent {formatTime(claim.draft.sentAt)}</span>}>
      {missing.length > 0 && <p className="mb-3 text-small">Outstanding: <strong>{missing.join(', ')}</strong></p>}
      {!claim.draft.body && !edited.current ? (
        <p className="text-small text-muted">A draft appears here once the documents have been read. You can also write your own.</p>
      ) : null}
      <div className="grid gap-3">
        <Field label="To"><input className={inputClass} type="email" value={to} onChange={type(setTo)} /></Field>
        <Field label="Subject"><input className={inputClass} value={subject} onChange={type(setSubject)} /></Field>
        <Field label="Message" hint="The upload link is added below your message.">
          <textarea className={cn(inputClass, 'min-h-40')} value={body} onChange={type(setBody)} />
        </Field>
        <p className="text-caption text-muted">Nothing is sent until you approve it here.</p>
        <div className="flex flex-wrap gap-2">
          {sending && <Button variant="main" busy={busy} disabled={!to || !subject || !body} onClick={() => void approve(false)}><Send className="size-4" aria-hidden="true" /> Approve and send</Button>}
          {to && subject && body ? (
            <a href={`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`} onClick={() => setOpened(true)}>
              <Button tabIndex={-1} variant={sending ? 'quiet' : 'main'}><Mail className="size-4" aria-hidden="true" /> Open in my email</Button>
            </a>
          ) : (
            <Button disabled><Mail className="size-4" aria-hidden="true" /> Open in my email</Button>
          )}
          {(!to || !subject || !body) && <p className="basis-full text-caption text-muted">Fill in the address, subject and message to send this.</p>}
          {opened && <Button busy={busy} onClick={() => void approve(true)}><Check className="size-4" aria-hidden="true" /> I sent it</Button>}
        </div>
      </div>
    </Sheet>
  );
}

function EditDetails({ claim, meta, onSaved }: { claim: Claim; meta: ShellContext['meta']; onSaved: (claim: Claim) => void }) {
  const [values, setValues] = useState<ClaimValues>({
    class_id: claim.classId ?? '', claimant_name: claim.claimantName, contact_email: claim.contactEmail, contact_phone: claim.contactPhone, policy_number: claim.policyNumber,
    vehicle_reg: claim.vehicleReg, policy_start: claim.policyStart, policy_end: claim.policyEnd, loss_date: claim.lossDate, source: claim.source,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      setBusy(true);
      api<Claim>(`/claims/${claim.id}`, { method: 'PATCH', body: { ...values, class_id: values.class_id || null } }).then(onSaved, (err) => {
        setError(err.message);
        setBusy(false);
      });
    }}>
      {error && <Notice tone="danger">{error}</Notice>}
      <ClaimFields values={values} set={(key, value) => setValues({ ...values, [key]: value })} meta={meta} />
      <div><Button type="submit" variant="main" busy={busy}>Save details</Button></div>
    </form>
  );
}

function DocPanel({ doc, meta, onClose, onChange }: { doc: Doc; meta: ShellContext['meta']; onClose: () => void; onChange: (claim: Claim) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  const src = `/api/documents/${doc.id}/file`;
  const change = (run: () => Promise<Claim>) => run().then(onChange, (err) => setError(err.message));

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="doc-title" className="m-0 ml-auto h-dvh max-h-none w-full max-w-[72rem] bg-surface p-0 text-fg shadow-window backdrop:bg-[rgb(23_13_54/0.55)]">
      <div className="grid h-full grid-rows-[auto_1fr]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 id="doc-title" className="truncate font-display text-[1.5rem] font-extrabold">{doc.typeLabel ?? doc.filename}</h2>
          <button type="button" aria-label="Close document" onClick={() => ref.current?.close()} className="grid size-10 shrink-0 place-items-center rounded-md hover:bg-sunken"><X aria-hidden="true" /></button>
        </div>
        <div className="grid min-h-0 overflow-auto md:grid-cols-[minmax(0,1fr)_24rem] md:overflow-hidden">
          <div className="h-[55dvh] bg-sunken md:h-full">
            {doc.mime === 'application/pdf'
              ? <iframe key={page} title={doc.filename} src={`${src}#page=${page}`} className="size-full" />
              : doc.mime === 'text/plain'
                ? <iframe title={doc.filename} src={src} className="size-full bg-white" />
                : /^image\/(jpeg|png|webp)$/.test(doc.mime)
                  ? <img src={src} alt={doc.description || doc.filename} className="size-full object-contain" />
                  : (
                    <div className="grid h-full place-content-center gap-3 p-6 text-center">
                      <p className="text-small">This file can't be shown here. The details found in it are alongside.</p>
                      <div><a href={src} download={doc.filename} className="font-semibold text-accent underline">Download {doc.filename}</a></div>
                    </div>
                  )}
          </div>
          <div className="grid content-start gap-4 p-4 md:overflow-auto">
            {error && <Notice tone="danger">{error}</Notice>}
            {doc.status === 'failed' && <Notice tone="danger">{doc.error}</Notice>}
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-44 flex-1">
                <Field label="Label" hint={doc.typeSetBy === 'person' ? 'Set by a person.' : doc.typeSetBy === 'ai' ? `Sorted by AI, ${doc.confidence} confidence.` : undefined}>
                  <select className={inputClass} value={doc.docType ?? ''} onChange={(e) => change(() => api(`/documents/${doc.id}`, { method: 'PATCH', body: { docType: e.target.value } }))}>
                    {!doc.docType && <option value="">Not labelled</option>}
                    {Object.entries(meta.documentTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            {doc.description && <p className="text-small">{doc.description}</p>}
            {(doc.language || doc.handwritten) && <p className="text-caption text-muted">{[doc.language, doc.handwritten ? 'Handwritten' : ''].filter(Boolean).join(', ')}</p>}
            {doc.issues.length > 0 && <Notice>{doc.issues.join(' ')}</Notice>}
            {doc.fields.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-small font-bold">Details found</h3>
                <ul className="divide-y divide-line">
                  {doc.fields.map((field, index) => (
                    <li key={`${field.key}${index}`} className="py-2">
                      <p className="text-caption text-muted">{field.label}</p>
                      {editIndex === index ? (
                        <form className="mt-1 flex gap-2" onSubmit={(event) => {
                          event.preventDefault();
                          void change(() => api(`/documents/${doc.id}`, { method: 'PATCH', body: { field: { index, value: editValue } } })).then(() => setEditIndex(null));
                        }}>
                          <input aria-label={`Correct ${field.label}`} className={inputClass} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                          <Button type="submit">Save</Button>
                        </form>
                      ) : (
                        <p className="break-words font-semibold">
                          {field.value}
                          {field.confidence !== 'high' && <span className="ml-2 text-caption font-semibold text-warn">{field.confidence} confidence</span>}
                          {field.corrected && <span className="ml-2 text-caption font-semibold text-ok">corrected</span>}
                        </p>
                      )}
                      {editIndex !== index && (
                        <p className="mt-0.5 flex flex-wrap gap-3 text-caption">
                          <button type="button" className="font-semibold text-accent underline" title={field.quote} onClick={() => setPage(field.page)}>Page {field.page}</button>
                          <button type="button" className="underline" onClick={() => { setEditIndex(index); setEditValue(field.value); }}>Correct</button>
                        </p>
                      )}
                      {field.quote && field.quote !== field.value && editIndex !== index && <p className="mt-1 border-l-2 border-line pl-2 text-caption italic text-muted">{field.quote}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <a href={src} target="_blank" rel="noreferrer"><Button tabIndex={-1}><ExternalLink className="size-4" aria-hidden="true" /> Open file</Button></a>
              {(doc.status === 'done' || doc.status === 'failed') && meta.ai && <Button onClick={() => change(() => api(`/documents/${doc.id}/retry`, { method: 'POST' }))}><RotateCw className="size-4" aria-hidden="true" /> Read again</Button>}
              <Button variant="danger" onClick={() => {
                if (window.confirm(`Remove ${doc.filename} from this claim? This cannot be undone.`)) void change(() => api(`/documents/${doc.id}`, { method: 'DELETE' })).then(() => ref.current?.close());
              }}><Trash2 className="size-4" aria-hidden="true" /> Remove</Button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
