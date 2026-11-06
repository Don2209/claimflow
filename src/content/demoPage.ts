import { t } from '@/i18n/localize';
import type { PageMeta } from './types';

export const demoMeta: PageMeta = t('demoMeta', {
  title: 'Book a 20-minute demo | ClaimsFlow',
  description:
    'Book a 20-minute ClaimsFlow demo. See how it reads, sorts and checks claim documents, and ask us anything about fit, hosting or pricing.',
});

export const demoPage = t('demoPage', {
  title: 'Book a 20-minute demo',
  lead: "We'll walk through a sample claim, then talk about the way your claims arrive.",
  replyLine: "We'll reply within one working day.",
  direct: {
    title: 'Prefer to contact us directly?',
    email: 'Email',
    phone: 'Phone',
    address: 'Postal address',
  },
  expect: {
    title: 'What to expect',
    items: [
      'A walk-through of a sample motor claim',
      'Time for your questions on hosting, security and pricing',
      'An honest view of whether a pilot makes sense for you',
    ],
  },
  form: {
    title: 'Your details',
    labels: {
      name: 'Name',
      email: 'Work email',
      phone: 'Phone',
      company: 'Company',
      role: 'Role',
      country: 'Country',
      date: 'Preferred date',
      timeWindow: 'Preferred time window',
      message: 'Message',
    },
    errors: {
      name: 'Enter your name',
      email: 'Enter a valid work email, like name@company.com',
      company: 'Enter your company name',
      role: 'Enter your role',
      country: 'Enter your country',
      date: 'Choose a preferred date',
      timeWindow: 'Choose a time window',
    },
    submit: 'Request a demo',
    submitting: 'Sending request',
    successTitle: 'Demo request sent',
    successBody: "Thank you. We'll reply within one working day.",
    errorTitle: 'Your request was not sent',
    errorBody: 'Try again, or email us directly at',
    timeWindows: ['Morning (08:00–12:00)', 'Afternoon (12:00–17:00)', 'Either'],
    timezoneNote: 'Times are in your own time zone. We receive it with your request.',
    consent: 'VisynTech will use these details only to respond to your request.',
  },
});
