import { contact } from '@/content/site';
import { formEndpoint } from './site';

export type FormKind = 'demo-request' | 'pilot-application';

/** 'sent' went to the endpoint. 'email' opened the visitor's email app, ready to send. */
export type FormResult = 'sent' | 'email';

const subjects: Record<FormKind, string> = {
  'demo-request': 'ClaimsFlow demo request',
  'pilot-application': 'ClaimsFlow pilot application',
};

/**
 * Posts a form as JSON to VITE_FORM_ENDPOINT, and throws when it cannot be delivered.
 * With no endpoint set, opens a ready-written email instead, so no enquiry is ever lost.
 * Adds the visitor's time zone, since people can write in from any country.
 */
export async function submitForm(
  kind: FormKind,
  values: Record<string, unknown>,
): Promise<FormResult> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!formEndpoint) {
    const body = Object.entries({ ...values, timeZone })
      .filter(([, value]) => value !== '' && value !== undefined)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('\n');
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subjects[kind])}&body=${encodeURIComponent(body)}`;
    return 'email';
  }

  const response = await fetch(formEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ form: kind, timeZone, ...values }),
  });
  if (!response.ok) throw new Error(`Form endpoint responded with ${response.status}`);
  return 'sent';
}
