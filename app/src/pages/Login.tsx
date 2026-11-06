import { useState, type FormEvent } from 'react';
import { LogoMark } from '@/components/Logo';
import jacaranda from '../../../public/photos/jacaranda-wide-1600.webp';
import { api, type User } from '../api';
import { Button, Field, inputClass, Notice } from '../ui';

export function Login({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onSignedIn(await api<User>('/login', { body: { email, password } }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="ink relative grid min-h-dvh place-items-center overflow-hidden bg-canvas p-4">
      <img src={jacaranda} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <form onSubmit={submit} className="daylight relative w-full max-w-sm -rotate-[0.6deg] bg-paper p-6 text-paper-ink shadow-window sm:p-8">
        <p className="inline-flex items-center gap-2 font-display text-[1.8rem] font-extrabold"><LogoMark /> ClaimsFlow</p>
        <h1 className="pen mb-5 mt-1 text-[1.9rem] leading-none">Morning. Who's on the desk?</h1>
        <div className="grid gap-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="Work email">
            <input className={inputClass} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" variant="main" busy={busy} className="w-full">Sign in</Button>
          <p className="text-center text-small">Making a claim? <a className="text-link font-semibold" href="/claim">Start it here</a></p>
        </div>
      </form>
    </main>
  );
}
