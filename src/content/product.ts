import type { PageMeta } from './types';

export const productMeta: PageMeta = {
  title: 'Product | ClaimsFlow',
  description:
    'How ClaimsFlow receives, sorts, reads and checks claim documents, then prepares a summary and missing-documents request for your team to act on.',
};

export const productHero = {
  title: 'Everything between a new claim and a file ready for review',
  lead: 'ClaimsFlow handles the document work around a claim. It sits next to your claims system, and leaves every decision to your people.',
};

export type ProductMock =
  | 'intake'
  | 'portal'
  | 'classify'
  | 'extract'
  | 'builder'
  | 'flags'
  | 'draft'
  | 'summary'
  | 'export'
  | 'dashboard';

export interface Capability {
  id: string;
  title: string;
  lead: string;
  bullets: string[];
  mock: ProductMock;
}

export const capabilities: Capability[] = [
  {
    id: 'email',
    title: 'Receive documents by email',
    lead: 'Keep the inbox you already have.',
    bullets: [
      'Forward or connect your existing claims inbox.',
      'Each email is read and its attachments are extracted.',
      'Documents are matched to the right claim by policy number, claim number, vehicle registration or name.',
    ],
    mock: 'intake',
  },
  {
    id: 'portal',
    title: 'Or through a secure portal',
    lead: 'Brokers and claimants can see what you need.',
    bullets: [
      'They enter a policy or claim reference and see your checklist.',
      'They upload files, and phone photos are fine.',
      'Items tick off as documents land, so nobody has to phone and ask.',
    ],
    mock: 'portal',
  },
  {
    id: 'classify',
    title: 'Sort every document',
    lead: 'Know what is in the file at a glance.',
    bullets: [
      "Each document is labelled: claim form, police report, driver's licence, repair quote and so on.",
      "Covers assessor's reports, invoices, death certificates, burial permits, affidavits and medical reports too.",
      'A handler can correct a label at any time.',
    ],
    mock: 'classify',
  },
  {
    id: 'extract',
    title: 'Extract the key details',
    lead: 'Less re-keying from scans and photos.',
    bullets: [
      'Reads PDFs, scans and phone photos, including handwritten forms.',
      'Pulls out names, ID numbers, registrations, dates and amounts with their currency.',
      'Every value links back to the page it came from, so it can be checked.',
    ],
    mock: 'extract',
  },
  {
    id: 'checklist',
    title: 'Check against your own checklist',
    lead: 'Your rules, set by class of business.',
    bullets: [
      'Build a checklist for motor comprehensive, third party, funeral and life, medical, property and agriculture.',
      'Mark each document as required or optional.',
      'Spot missing documents on day one, not day ten.',
    ],
    mock: 'builder',
  },
  {
    id: 'flags',
    title: 'Flag what does not match',
    lead: 'Flags only. A person decides.',
    bullets: [
      'Names, ID numbers, registrations or dates that differ across documents.',
      "Loss dates outside the policy period, and quotes that differ from the assessor's report.",
      'Currency mix-ups, and quotes or suppliers repeated across claims.',
    ],
    mock: 'flags',
  },
  {
    id: 'request',
    title: 'Draft the missing-documents request',
    lead: 'Ready to send, once your handler approves it.',
    bullets: [
      'The email lists exactly what is outstanding on that claim.',
      'Your handler can edit it, then approve it and send it.',
      'Nothing goes out without a person approving it.',
    ],
    mock: 'draft',
  },
  {
    id: 'summary',
    title: 'One page for the claims officer',
    lead: 'The whole file, in the same layout every time.',
    bullets: [
      'Key parties, dates and amounts in one place.',
      'What is complete, what is missing and what was flagged.',
      'The officer can go straight to any source document.',
    ],
    mock: 'summary',
  },
  {
    id: 'export',
    title: 'Export to the systems you use',
    lead: 'Clean data, without replacing anything.',
    bullets: [
      'Export to Excel or CSV.',
      'Integrate with your claims system where it is technically feasible.',
      'We will look at your setup with you during the pilot.',
    ],
    mock: 'export',
  },
  {
    id: 'dashboard',
    title: 'See where files are stuck',
    lead: 'A view for the manager, not just the handler.',
    bullets: [
      'Claims waiting on documents, and how long they have waited.',
      'Which brokers or branches send incomplete files.',
      'Enough detail to have a useful conversation about it.',
    ],
    mock: 'dashboard',
  },
];

export const productDemo = {
  title: 'Try it on a sample claim',
  lead: 'A motor, funeral or medical claim, from inbox to summary. Fictional documents, running in your browser.',
};

export const productCta = {
  title: 'See it with your own checklist in mind.',
  body: 'Twenty minutes, on a claim type you handle every day.',
};
