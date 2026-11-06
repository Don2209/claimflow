import { useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, type User } from '../api';
import type { ShellContext } from '../Shell';
import { Button, Field, inputClass, Loading, Notice, PageTitle, Sheet, useLoad } from '../ui';

export function Team() {
  const { user } = useOutletContext<ShellContext>();
  const { data, error, reload } = useLoad(() => api<User[]>('/users'));
  const [form, setForm] = useState({ name: '', email: '', role: 'handler', password: '' });
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState('');
  if (user.role !== 'manager') return <Notice tone="danger">Only a manager can see this page.</Notice>;
  if (error) return <Notice tone="danger">{error}</Notice>;
  if (!data) return <Loading />;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setProblem('');
    setDone('');
    try {
      await action();
      setDone(message);
      await reload();
      return true;
    } catch (err) {
      setProblem((err as Error).message);
      return false;
    }
  };
  async function add(event: FormEvent) {
    event.preventDefault();
    if (await run(() => api('/users', { body: form }), `${form.name} can now sign in. Give them their temporary password, and ask them to change it under Settings.`)) {
      setForm({ name: '', email: '', role: 'handler', password: '' });
    }
  }

  return (
    <>
      <PageTitle title="Team" />
      <div className="mb-4 grid gap-2">
        {problem && <Notice tone="danger">{problem}</Notice>}
        {done && <Notice tone="ok">{done}</Notice>}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Sheet title="Who can sign in">
          <ul className="divide-y divide-line">
            {data.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-small font-semibold">{person.name}{!person.active && <span className="font-normal text-muted"> (access removed)</span>}</span>
                  <span className="block truncate text-caption text-muted">{person.email}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <select aria-label={`Role for ${person.name}`} className={`${inputClass} w-auto`} value={person.role} onChange={(e) => void run(() => api(`/users/${person.id}`, { method: 'PATCH', body: { role: e.target.value } }), 'Role changed.')}>
                    <option value="handler">Handler</option>
                    <option value="manager">Manager</option>
                  </select>
                  <Button onClick={() => {
                    const password = window.prompt(`New temporary password for ${person.name}, at least 10 characters:`);
                    if (password) void run(() => api(`/users/${person.id}`, { method: 'PATCH', body: { password } }), 'Password replaced. They have been signed out.');
                  }}>Reset password</Button>
                  <Button variant={person.active ? 'danger' : 'quiet'} onClick={() => void run(() => api(`/users/${person.id}`, { method: 'PATCH', body: { active: !person.active } }), person.active ? 'Access removed.' : 'Access restored.')}>{person.active ? 'Remove access' : 'Restore access'}</Button>
                </span>
              </li>
            ))}
          </ul>
        </Sheet>
        <Sheet title="Add someone">
          <form onSubmit={add} className="grid gap-3">
            <Field label="Name"><input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Work email"><input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Role" hint="Managers also control the team, checklists, audit trail and settings.">
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="handler">Handler</option>
                <option value="manager">Manager</option>
              </select>
            </Field>
            <Field label="Temporary password" hint="At least 10 characters."><input required minLength={10} autoComplete="new-password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <div><Button type="submit" variant="main">Add to team</Button></div>
          </form>
        </Sheet>
      </div>
    </>
  );
}
