import type { PageMeta } from './types';

export const pilotMeta: PageMeta = {
  title: 'Pilot programme | ClaimsFlow',
  description:
    'Be one of our first pilot partners: 60–90 days on one class of business, starting with motor claims. See what is included and apply.',
};

export const pilotPage = {
  title: 'Try ClaimsFlow on your own claims, on a small scale',
  lead: 'A 60–90 day pilot on one class of business, starting with motor claims. Low cost, priced in USD, and measured against your current way of working.',
  note: 'ClaimsFlow is in development, and these will be our first pilots. You would be working directly with the team building it, and your feedback will shape the product.',
  included: {
    title: "What's included",
    items: [
      'Checklist configuration for one class of business',
      'Email intake from your claims inbox, plus the secure portal',
      'Document sorting, extraction, completeness checks and flags',
      'Claim summaries and missing-documents drafts for handlers',
      'The manager dashboard, and Excel or CSV export',
      'Training and direct support for your pilot team',
    ],
  },
  timeline: {
    title: 'The plan, week by week',
    lead: 'Twelve weeks is the full plan. It can finish sooner if we have what we need to judge the results.',
    phases: [
      {
        weeks: 'Weeks 1–2',
        title: 'Setup and checklist configuration',
        body: 'We agree the scope and hosting, connect your inbox and configure your checklist. We also record your baseline.',
        span: 2,
      },
      {
        weeks: 'Weeks 3–10',
        title: 'Live on one class of business',
        body: 'Your team uses ClaimsFlow on real claims, alongside your current process. We check in regularly and make adjustments.',
        span: 8,
      },
      {
        weeks: 'Weeks 11–12',
        title: 'Review',
        body: 'We go through the results with you, including what did not work, and you decide what comes next.',
        span: 2,
      },
    ],
  },
  needs: {
    title: 'What we need from you',
    items: [
      'A named pilot lead in your claims team',
      'A small group of handlers willing to use it and tell us what they think',
      'Access to a claims inbox, or a forwarding rule from it',
      'Your current document requirements for the chosen class',
      'A conversation with your IT and compliance teams about hosting and data',
    ],
  },
  measures: {
    title: 'How we measure success',
    lead: 'Three measures, compared with your baseline. We report what we find, whatever it shows.',
    items: [
      { title: 'Time to a complete file', body: 'From first notification to complete file.' },
      { title: 'Follow-up requests', body: 'How many it takes per claim to get everything in.' },
      { title: 'Handler time per file', body: 'Time spent on the document work for each file.' },
    ],
  },
  form: {
    title: 'Apply for the pilot programme',
    lead: 'Tell us a little about your claims. We will come back to you to talk it through.',
    submit: 'Send application',
    submitting: 'Sending application',
    successTitle: 'Application sent',
    successBody: 'Thank you. We will be in touch to talk through your pilot.',
    errorTitle: 'Your application was not sent',
    errorBody: 'Try again, or email us directly at',
    consent:
      'I agree that VisynTech may use these details to respond to my application and contact me about the pilot programme.',
    classes: ['Motor', 'Funeral or life', 'Medical', 'Property', 'Agriculture', 'Other'],
    volumes: [
      'Fewer than 100 a month',
      '100 to 500 a month',
      '500 to 2,000 a month',
      'More than 2,000 a month',
      'Not sure',
    ],
  },
};
