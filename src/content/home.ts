import { t } from '@/i18n/localize';
import type { PhotoId } from './photos';
import type { PageMeta } from './types';

export const homeMeta: PageMeta = t('homeMeta', {
  title: 'ClaimsFlow | AI-assisted claims documentation for insurers',
  description:
    "ClaimsFlow reads, sorts and checks the documents behind every claim, flags what's missing or doesn't match, and hands your team a clean summary.",
});

export const hero = t('hero', {
  title: 'Stop chasing claim documents.',
  sub: "ClaimsFlow reads, sorts and checks the documents behind every claim, flags what's missing or doesn't match, and hands your team a clean summary, alongside the systems you already use.",
});

/** Words on the sample claim file in the hero. The photo is real; the file is fictional. */
export const heroFile = t('heroFile', {
  label:
    'A sample claim file: a photo of a car crushed along one side, with a handwritten note reading "Cause of loss: elephant", and a stamp reading "Police report missing".',
  note: 'Cause of loss: elephant.',
  stamp: 'Police report missing',
  tag: 'Sample data',
});

export const problem = t('problem', {
  title: 'Claims rarely stall on the decision. They stall on the paperwork.',
  cards: [
    {
      title: 'Files wait weeks for missing paperwork',
      body: 'A police report is missing. Nobody notices until the file reaches someone who needs it. Then the follow-ups begin.',
      note: 'Still waiting on the police report.',
    },
    {
      title: 'Handlers re-key data from scans and photos',
      body: 'The same name, ID and registration number get typed again from a tilted phone picture, with every chance of a slip.',
      note: 'Typed out by hand. Again.',
    },
    {
      title: 'Mismatches are caught late, or not at all',
      body: 'A quote carries a different registration from the claim form. Across a full queue, details like that are easy to miss.',
      note: 'Form says SMP 1234. Quote says SMP 1284.',
    },
  ],
});

export const howItWorks = t('howItWorks', {
  title: 'From a full inbox to a file ready for review',
  lead: 'Four steps, with your handler in charge of what happens next.',
  steps: [
    {
      title: 'Receive',
      body: 'Documents arrive through your existing claims inbox or a secure portal, and are matched to the right claim.',
    },
    {
      title: 'Read and sort',
      body: 'Each document is identified and its key details are extracted, including from phone photos and handwritten forms.',
    },
    {
      title: 'Check and flag',
      body: 'The file is checked against your checklist. Anything missing or inconsistent is flagged for review.',
    },
    {
      title: 'Summarise and export',
      body: 'Your officer gets a one-page summary. The data moves to your claims system by export or integration.',
    },
  ],
});

export const demoSection = {
  title: 'Run it on a sample claim',
  lead: 'Pick a claim type and watch the file come together. Everything here runs in your browser, on fictional documents.',
};

export const classes = t('classes', {
  title: 'Every class of loss has its own paper trail',
  lead: 'Set the documents you need for each one. These are starting points, and you decide what is required.',
  link: { label: 'See all five starter checklists', to: '/solutions/insurers' },
  groups: [
    {
      title: 'Motor',
      items: [
        'Claim form',
        'Police report',
        "Driver's licence",
        'Vehicle registration',
        'Repair quotes',
        "Assessor's report",
      ],
    },
    {
      title: 'Property',
      items: [
        'Claim form',
        'Police report, where relevant',
        'Repair quotes',
        "Assessor's report",
        'Proof of ownership',
      ],
    },
    {
      title: 'Agriculture',
      items: [
        'Claim form',
        'Field or loss report',
        "Assessor's report",
        'Supporting invoices',
        'Proof of insured interest',
      ],
    },
  ],
});

export const builtFor = t('builtFor', {
  title: 'Built for how claims really arrive',
  lead: 'Claims paperwork is rarely tidy, wherever you are. ClaimsFlow starts from that fact.',
  items: {
    photos: {
      title: 'Phone photos',
      body: 'Tilted, shadowed, taken on a car bonnet at the roadside. Photos are treated as normal input, not an exception.',
    },
    handwriting: {
      title: 'Handwritten forms',
      body: 'Details are read from handwritten claim forms, and can be checked against the original page.',
    },
    currency: {
      title: 'Invoices in more than one currency',
      body: 'Amounts keep their currency. A mix-up between a quote, an invoice and a claim form gets flagged.',
    },
    documents: {
      title: 'Local document types',
      body: 'Each insurer sets the paperwork its market requires, from burial permits to vehicle registration documents.',
      examples: [
        'Burial permit',
        'Police report',
        'Vehicle registration',
        'ID document',
        'Affidavit',
      ],
    },
    connections: {
      title: 'Slow connections',
      body: 'The portal is designed to stay light, so a broker or claimant can upload from a phone on a patchy network.',
    },
  },
});

export const systems = t('systems', {
  title: 'No rip-and-replace',
  lead: 'Keep your claims system. ClaimsFlow does the document work in front of it, and hands over clean data.',
  sources: [
    { title: 'Your claims inbox', body: 'Forward or connect it' },
    { title: 'Secure portal', body: 'For brokers and claimants' },
  ],
  middle: { title: 'ClaimsFlow', body: 'Reads, sorts, checks and summarises' },
  people: { title: 'Your claims team', body: 'Reviews and decides' },
  destination: {
    title: 'Your existing claims system',
    body: 'Excel or CSV export, or integration where feasible',
  },
});

export const humanInLoop = t('humanInLoop', {
  statement: [
    'ClaimsFlow never approves or rejects a claim.',
    'It prepares the file.',
    'Your people decide.',
  ],
  prepares: {
    title: 'What ClaimsFlow does',
    items: [
      'Sorts documents and extracts details',
      'Flags what is missing or does not match',
      'Drafts requests for your handler to approve',
      'Prepares a one-page summary',
    ],
  },
  decides: {
    title: 'What stays with your people',
    items: [
      'Whether a flag matters',
      'What gets sent, and to whom',
      'Whether a claim is approved or rejected',
      'How and when it is settled',
    ],
  },
});

export const securityTeaser = t('securityTeaser', {
  title: 'Your claims data stays under your control',
  lead: 'Built for insurers who need to answer hard questions about where data goes, whichever data protection law applies to them.',
  points: [
    { title: 'Hosting you choose', body: 'Cloud, in-country or on-premises.' },
    { title: 'Full audit trail', body: 'Every action is recorded, with who did it and when.' },
    { title: 'Role-based access', body: 'People see only what their role requires.' },
    { title: 'Encrypted', body: 'In transit and at rest.' },
  ],
  link: 'Read about security and data protection',
});

export const whoFor: {
  title: string;
  tabs: {
    id: string;
    photo: PhotoId;
    label: string;
    title: string;
    body: string;
    points: string[];
    link: { label: string; to: string };
  }[];
} = t('whoFor', {
  title: 'Who it is for',
  tabs: [
    {
      id: 'insurers',
      photo: 'jacaranda-tower',
      label: 'Insurers',
      title: 'General, life and funeral insurers',
      body: 'Set your own checklist for each class of business and spot incomplete files early, with fewer follow-ups for your handlers.',
      points: [
        'Checklists for motor, funeral and life, medical, property and agriculture',
        'A dashboard showing which claims are waiting and for how long',
        'Works alongside your claims system',
      ],
      link: { label: 'See how it works for insurers', to: '/solutions/insurers' },
    },
    {
      id: 'brokers',
      photo: 'first-street',
      label: 'Brokers',
      title: 'Brokers and underwriting managers',
      body: 'One place to submit documents for your clients, and to see what is missing before the insurer has to ask.',
      points: [
        'Upload against a policy or claim reference',
        'See the checklist tick off as documents land',
        'Phone photos are fine',
      ],
      link: { label: 'See how it works for brokers', to: '/solutions/brokers' },
    },
    {
      id: 'adjusters',
      photo: 'mechanic',
      label: 'Loss adjusters',
      title: 'Loss adjusters',
      body: 'Assemble and check the document bundle faster, and start your report from a consistent summary.',
      points: [
        'Documents sorted and labelled',
        "Quotes compared against the assessor's report",
        'The same summary format on every file',
      ],
      link: { label: 'See how it works for loss adjusters', to: '/solutions/loss-adjusters' },
    },
    {
      id: 'funds',
      photo: 'cabinets',
      label: 'TPAs and medical aid funds',
      title: 'TPAs and medical aid funds',
      body: 'Check medical claim paperwork against your own requirements, and spot currency and detail mismatches before review.',
      points: [
        'Your own document checklist for medical claims',
        'Amounts kept distinct by currency',
        'Clear summaries for the people who review',
      ],
      link: { label: 'Talk to us about your fund', to: '/demo' },
    },
  ],
});

export const pilotBand = t('pilotBand', {
  title: 'Be one of our first pilot partners.',
  body: '60–90 days, one class of business, low cost, real results on your own claims.',
  phases: [
    { label: 'Setup', weeks: 'Weeks 1–2', span: 2 },
    { label: 'Live on one class of business', weeks: 'Weeks 3–10', span: 8 },
    { label: 'Review', weeks: 'Weeks 11–12', span: 2 },
  ],
});

export const faqSection = {
  title: 'Common questions',
  link: 'See all questions',
};
