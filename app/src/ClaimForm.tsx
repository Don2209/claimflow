import { type ReactNode } from 'react';
import type { Meta } from './api';
import { Field, inputClass } from './ui';

export type ClaimValues = Record<'class_id' | 'claimant_name' | 'contact_email' | 'contact_phone' | 'policy_number' | 'vehicle_reg' | 'policy_start' | 'policy_end' | 'loss_date' | 'source', string>;

export function ClaimFields({ values, set, meta, children }: { values: ClaimValues; set: (key: keyof ClaimValues, value: string) => void; meta: Meta; children?: ReactNode }) {
  const text = (key: keyof ClaimValues, label: string, hint?: string, type = 'text') => (
    <Field label={label} hint={hint}>
      <input className={inputClass} type={type} value={values[key]} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Class of business" hint="This sets the checklist.">
        <select className={inputClass} value={values.class_id} onChange={(e) => set('class_id', e.target.value)}>
          <option value="">Choose later</option>
          {meta.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      {text('claimant_name', 'Claimant')}
      {text('policy_number', 'Policy number')}
      {text('vehicle_reg', 'Vehicle registration')}
      {text('loss_date', 'Date of loss', undefined, 'date')}
      {text('source', 'Broker or branch', 'Used to show who sends incomplete files.')}
      {text('policy_start', 'Policy starts', undefined, 'date')}
      {text('policy_end', 'Policy ends', undefined, 'date')}
      {text('contact_email', 'Email for requests', 'Where the missing-documents request goes.', 'email')}
      {text('contact_phone', 'Phone')}
      {children}
    </div>
  );
}

export const emptyClaim: ClaimValues = { class_id: '', claimant_name: '', contact_email: '', contact_phone: '', policy_number: '', vehicle_reg: '', policy_start: '', policy_end: '', loss_date: '', source: '' };
