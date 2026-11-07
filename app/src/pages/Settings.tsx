import { useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, type Inbox } from '../api';
import type { ShellContext } from '../Shell';
import { Button, Field, formatTime, inputClass, Notice, PageTitle, Sheet } from '../ui';

export function Settings() {
  const { user, meta } = useOutletContext<ShellContext>();
  return (
    <>
      <PageTitle title="Settings" />
      <div className="grid max-w-3xl gap-4">
        <ClientPage />
        {user.role === 'manager' && (
          <>
            <Connections meta={meta} />
            <ClaimsInbox freePlan={meta.freeAiPlan} />
            <Retention />
          </>
        )}
        <Password />
      </div>
    </>
  );
}

function ClientPage() {
  const link = `${window.location.origin}/claim`;
  const [copied, setCopied] = useState(false);
  return (
    <Sheet title="Client claim page">
      <p className="mb-3 text-small text-muted">Clients start a claim and upload documents here themselves, with no sign-in. Their claim appears on your desk and is read automatically.</p>
      <p className="mb-3 break-all text-small font-semibold">{link}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}>{copied ? 'Link copied' : 'Copy link'}</Button>
        <a href={link} target="_blank" rel="noreferrer"><Button tabIndex={-1}>Open page</Button></a>
      </div>
    </Sheet>
  );
}

function Connections({ meta }: { meta: ShellContext['meta'] }) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const status = (ok: boolean, yes: string, no: string) => <span className={ok ? 'font-semibold text-ok' : 'font-semibold text-warn'}>{ok ? yes : no}</span>;
  return (
    <Sheet title="Connections">
      <dl className="grid gap-3 text-small">
        <div>
          <dt className="font-semibold">AI reading</dt>
          <dd>{status(meta.ai, 'Key added', 'No key yet')}. Each document is sent to {meta.aiName} to be read.
          <div className="mt-2"><Button busy={busy} onClick={() => { setBusy(true); void api('/settings/test-ai', { method: 'POST' }).then(setResult).catch((err) => setResult({ ok: false, message: err.message })).finally(() => setBusy(false)); }}>Test the AI connection</Button></div>
          {result && <div className="mt-2"><Notice tone={result.ok ? 'ok' : 'danger'}>{result.message}</Notice></div>}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Sending email</dt>
          <dd>{status(meta.sending, 'Set up', 'Not set up')}. {meta.sending ? 'Approved requests are sent from the claims address.' : 'Approved requests open in the handler\'s own email until mail settings are added.'}</dd>
        </div>
      </dl>
    </Sheet>
  );
}

function ClaimsInbox({ freePlan }: { freePlan: boolean }) {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [form, setForm] = useState({ user: '', password: '', host: '', port: '', mailbox: 'INBOX' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    const load = () => api<Inbox>('/settings/inbox').then(setInbox, (err) => setError(err.message));
    void load();
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
  }, []);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const edit = () => {
    if (inbox?.connected) {
      setForm({ host: inbox.host, port: String(inbox.port), user: inbox.user, password: '', mailbox: inbox.mailbox });
    }
    setEditing(true);
  };
  const run = async (action: () => Promise<Inbox>, message: string) => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      setInbox(await action());
      setSaved(message);
      setEditing(false);
      setForm((current) => ({ ...current, password: '' }));
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(() => api('/settings/inbox', { method: 'PUT', body: { ...form, port: form.port ? Number(form.port) : undefined } }), 'Connected. New email is now being watched.');
  }

  return (
    <Sheet title="Claims inbox">
      <div className="grid gap-3">
        <p className="text-small text-muted">New email in this mailbox is checked every minute. Attachments land on the matching claim, or open a new one, and are read automatically.</p>
        {freePlan && <Notice><strong>Connect a test mailbox only.</strong> Everything attached to email here goes to a free AI plan, where the provider's reviewers may read it. Do not connect a mailbox that receives real claims.</Notice>}
        {error && <Notice tone="danger">{error}</Notice>}
        {saved && <Notice tone="ok">{saved}</Notice>}
        {inbox?.connected && !editing && (
          <>
            <dl className="grid gap-x-6 gap-y-2.5 text-small sm:grid-cols-2">
              <div><dt className="text-caption text-muted">Mailbox</dt><dd className="break-words font-medium">{inbox.user}</dd></div>
              <div><dt className="text-caption text-muted">Server</dt><dd className="break-words font-medium">{inbox.host}, port {inbox.port}</dd></div>
              <div><dt className="text-caption text-muted">Folder</dt><dd className="font-medium">{inbox.mailbox}</dd></div>
              <div><dt className="text-caption text-muted">Watching mail since</dt><dd className="font-medium">{formatTime(inbox.connectedAt)}</dd></div>
              <div><dt className="text-caption text-muted">Last checked</dt><dd className="font-medium">{inbox.lastCheck ? `${formatTime(inbox.lastCheck)}, ${inbox.lastAdded} added` : 'First check is under way'}</dd></div>
            </dl>
            {inbox.lastError && <Notice tone="danger">{inbox.lastError}</Notice>}
            <p className="text-caption text-muted">Emails are marked as read once they are saved here. Older mail is left alone.</p>
            <label className="flex items-start gap-2 text-small">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-[rgb(var(--accent))]"
                checked={inbox.acknowledge}
                disabled={busy}
                onChange={(e) => void run(() => api('/settings/inbox/acknowledge', { method: 'PUT', body: { on: e.target.checked } }), e.target.checked ? 'Senders will get an automatic reply.' : 'Automatic replies are off.')}
              />
              <span>
                <span className="font-medium">Reply to senders automatically</span>
                <span className="block text-caption text-muted">Confirms the claim reference and which documents arrived, from this mailbox. Automatic messages and mailing lists never get a reply.</span>
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button busy={busy} onClick={() => void run(() => api('/settings/inbox/check', { method: 'POST' }), 'Checked.')}>Check now</Button>
              <Button onClick={edit}>Change details</Button>
              <Button variant="danger" onClick={() => { if (window.confirm('Stop watching this mailbox? Claims already created are kept.')) void run(() => api('/settings/inbox', { method: 'DELETE' }), 'Disconnected.'); }}>Disconnect</Button>
            </div>
          </>
        )}
        {inbox && (!inbox.connected || editing) && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <Field label="Email address"><input required type="email" autoComplete="off" className={inputClass} value={form.user} onChange={set('user')} /></Field>
            <Field label="Password" hint={inbox.connected ? 'Leave blank to keep the saved one.' : 'Stored encrypted, and never shown again.'}>
              <input type="password" autoComplete="new-password" required={!inbox.connected} className={inputClass} value={form.password} onChange={set('password')} />
            </Field>
            <p className="text-caption text-muted sm:col-span-2">ClaimsFlow finds your mail server by itself. Gmail and Yahoo need an app password, not your normal one. Microsoft 365 usually blocks this kind of sign-in, so forward claims to a separate mailbox and connect that one.</p>
            <details className="text-small sm:col-span-2">
              <summary className="cursor-pointer font-semibold">More options, only if connecting fails</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="IMAP server" hint="Blank to find it."><input className={inputClass} value={form.host} onChange={set('host')} /></Field>
                <Field label="Port" hint="Blank to find it."><input type="number" className={inputClass} value={form.port} onChange={set('port')} /></Field>
                <Field label="Folder"><input className={inputClass} value={form.mailbox} onChange={set('mailbox')} /></Field>
              </div>
            </details>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" variant="main" busy={busy}>Connect</Button>
              {editing && <Button onClick={() => setEditing(false)}>Cancel</Button>}
            </div>
          </form>
        )}
      </div>
    </Sheet>
  );
}

function Retention() {
  const [days, setDays] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api('/settings').then((data) => setDays(String(data.retentionDays || '')), (err) => setError(err.message));
  }, []);
  return (
    <Sheet title="How long files are kept">
      <form className="grid gap-3" onSubmit={(event) => {
        event.preventDefault();
        const retentionDays = Number(days || 0);
        if (retentionDays && !window.confirm(`Permanently delete every file handed over more than ${retentionDays} days ago, now and from here on?`)) return;
        api('/settings', { method: 'PUT', body: { retentionDays } }).then(() => { setMessage('Saved.'); setError(''); }, (err) => setError(err.message));
      }}>
        {error && <Notice tone="danger">{error}</Notice>}
        {message && <Notice tone="ok">{message}</Notice>}
        <Field label="Days to keep a file after it is handed over" hint="Leave blank to keep files until someone deletes them. Set this in line with your own legal duties. The audit trail keeps a record that a file existed.">
          <input className={`${inputClass} max-w-40`} type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        <div><Button type="submit">Save</Button></div>
      </form>
    </Sheet>
  );
}

function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await api('/me/password', { body: { current, next } });
      setCurrent('');
      setNext('');
      setMessage('Password changed.');
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <Sheet title="Your password">
      <form className="grid max-w-sm gap-3" onSubmit={submit}>
        {error && <Notice tone="danger">{error}</Notice>}
        {message && <Notice tone="ok">{message}</Notice>}
        <Field label="Current password"><input required type="password" autoComplete="current-password" className={inputClass} value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password" hint="At least 10 characters."><input required minLength={10} type="password" autoComplete="new-password" className={inputClass} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <div><Button type="submit">Change password</Button></div>
      </form>
    </Sheet>
  );
}
