import { useEffect, useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api';
import type { ShellContext } from '../Shell';
import { Button, Field, formatTime, inputClass, Notice, PageTitle, Sheet } from '../ui';

export function Settings() {
  const { user, meta } = useOutletContext<ShellContext>();
  return (
    <>
      <PageTitle title="Settings" />
      <div className="grid max-w-3xl gap-4">
        {user.role === 'manager' && (
          <>
            <Connections meta={meta} />
            <Retention />
          </>
        )}
        <Password />
      </div>
    </>
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
          <dd>{status(meta.ai, 'Key added', 'No key yet')}. Each document is sent to Anthropic's Claude to be read.
          <div className="mt-2"><Button busy={busy} onClick={() => { setBusy(true); void api('/settings/test-ai', { method: 'POST' }).then(setResult).catch((err) => setResult({ ok: false, message: err.message })).finally(() => setBusy(false)); }}>Test the AI connection</Button></div>
          {result && <div className="mt-2"><Notice tone={result.ok ? 'ok' : 'danger'}>{result.message}</Notice></div>}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Sending email</dt>
          <dd>{status(meta.sending, 'Set up', 'Not set up')}. {meta.sending ? 'Approved requests are sent from the claims address.' : 'Approved requests open in the handler\'s own email until mail settings are added.'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Claims inbox</dt>
          <dd>
            {meta.inbox ? (
              <>{status(!meta.inbox.lastError, `Watching ${meta.inbox.address}`, `Problem with ${meta.inbox.address}`)}. {meta.inbox.lastError ?? (meta.inbox.lastCheck ? `Last checked ${formatTime(meta.inbox.lastCheck)}.` : 'First check is under way.')}</>
            ) : <>{status(false, '', 'Not connected')}. Add the inbox settings on the server, and new email attachments will land on the right claim.</>}
          </dd>
        </div>
      </dl>
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
