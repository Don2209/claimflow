import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '@/components/Logo';
import { api } from '../api';
import { Button, Field, inputClass, Loading, Notice, useLoad } from '../ui';

type Form = { classes: { id: string; name: string }[]; testOnly: boolean };
const today = () => new Date().toISOString().slice(0, 10);

/** Where a client starts their own claim. Everything they need to do is on this page and the next one. */
export function PublicClaim() {
  const navigate = useNavigate();
  const { data, error: loadError } = useLoad(() => api<Form>('/public/claim-form'));
  const [values, setValues] = useState({ claimant_name: '', contact_email: '', class_id: '', policy_number: '', vehicle_reg: '', loss_date: '', notes: '', website: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => setValues({ ...values, [key]: event.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api<{ token: string }>('/public/claims', { body: { ...values, class_id: values.class_id || null, consent } });
      navigate(`/upload/${token}?new=1`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="ink min-h-dvh bg-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <header className="mb-5"><p className="inline-flex items-center gap-2 font-display text-[1.6rem] font-extrabold text-fg"><LogoMark /> ClaimsFlow</p></header>
        <main className="daylight bg-paper p-5 text-paper-ink shadow-window sm:p-7">
          <h1 className="font-display text-display-sm font-extrabold">Start your claim</h1>
          <p className="mb-4 mt-1 text-small text-muted">Tell us the basics. On the next page you will see which documents are needed, and you can upload them from your phone.</p>
          {loadError && !data ? <Notice tone="danger">{loadError}</Notice> : !data ? <Loading /> : (
            <form onSubmit={submit} className="grid gap-4">
              {data.testOnly && <Notice><strong>Test service: use fictional details and documents only.</strong> Please do not enter real personal details or real claims.</Notice>}
              {error && <Notice tone="danger">{error}</Notice>}
              <Field label="Your full name"><input required autoComplete="name" className={inputClass} value={values.claimant_name} onChange={set('claimant_name')} /></Field>
              <Field label="Your email" hint="So the claims team can contact you."><input required type="email" autoComplete="email" className={inputClass} value={values.contact_email} onChange={set('contact_email')} /></Field>
              <Field label="Type of claim">
                <select className={inputClass} value={values.class_id} onChange={set('class_id')}>
                  <option value="">Not sure</option>
                  {data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="Date it happened"><input required type="date" max={today()} className={inputClass} value={values.loss_date} onChange={set('loss_date')} /></Field>
              <Field label="Policy number" hint="If you have it."><input className={inputClass} value={values.policy_number} onChange={set('policy_number')} /></Field>
              <Field label="Vehicle registration" hint="For vehicle claims."><input className={inputClass} value={values.vehicle_reg} onChange={set('vehicle_reg')} /></Field>
              <Field label="What happened" hint="A sentence or two is fine."><textarea maxLength={2000} className={`${inputClass} min-h-24`} value={values.notes} onChange={set('notes')} /></Field>
              {/* Left empty by people, and filled in by spam bots. */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label>Website<input tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} /></label>
              </div>
              <label className="flex items-start gap-2.5 text-small">
                <input required type="checkbox" className="mt-1 size-4 shrink-0 accent-[rgb(var(--accent))]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I agree that my details and documents go to the claims team, and that an AI service helps sort and read them. A person makes every decision on my claim.</span>
              </label>
              <div><Button type="submit" variant="main" busy={busy} className="w-full sm:w-auto">Continue to documents</Button></div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
