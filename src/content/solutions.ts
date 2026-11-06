import type { PhotoId } from './photos';
import type { PageMeta, Cta } from './types';
import { ctas } from './site';

export interface SolutionPage {
  path: string;
  meta: PageMeta;
  title: string;
  lead: string;
  outcomes: { title: string; body: string }[];
  mock: 'builder' | 'portal' | 'summary';
  mockTitle: string;
  mockBody: string;
  photo: PhotoId;
  checklists?: { title: string; items: string[] }[];
  checklistIntro?: { title: string; lead: string };
  steps: { title: string; items: string[] };
  cta: { title: string; body: string; primary: Cta; secondary: Cta };
}

export const insurers: SolutionPage = {
  path: '/solutions/insurers',
  photo: 'jacaranda-tower',
  meta: {
    title: 'For insurers | ClaimsFlow',
    description:
      'Faster complete files and fewer follow-ups for motor, funeral and life, medical, property and agriculture claims, with checklists you control.',
  },
  title: 'Complete files sooner, with fewer follow-ups',
  lead: 'Set the documents you need for each class of business. ClaimsFlow checks every incoming file against them and shows your handlers what is outstanding.',
  outcomes: [
    {
      title: 'Know what is missing early',
      body: 'Handlers see the gaps as soon as documents arrive, not when the file reaches review.',
    },
    {
      title: 'Fewer follow-ups',
      body: 'One clear request lists everything outstanding, instead of a chain of separate emails.',
    },
    {
      title: 'A clear view for managers',
      body: 'See which claims are waiting, for how long, and where incomplete files are coming from.',
    },
  ],
  mock: 'builder',
  mockTitle: 'Your rules, not ours',
  mockBody:
    'Each insurer builds its own checklists. Change a requirement and it applies to new claims in that class.',
  checklistIntro: {
    title: 'A checklist for each class of business',
    lead: 'Starting points only. You decide what is required.',
  },
  checklists: [
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
      title: 'Funeral and life',
      items: [
        'Claim form',
        'Death certificate',
        'Burial permit',
        'ID documents',
        'Affidavit, where needed',
      ],
    },
    {
      title: 'Medical',
      items: ['Claim form', 'Medical report', 'Invoices and receipts', 'Membership details'],
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
  steps: {
    title: 'What changes for your team',
    items: [
      'Your inbox keeps working. Documents are sorted and matched to claims as they arrive.',
      'Your handlers review flags and approve requests, instead of hunting through attachments.',
      'Your officers get the same one-page summary on every file.',
      'Your claims system stays in place, and receives data by export or integration.',
    ],
  },
  cta: {
    title: 'Start with motor claims.',
    body: 'A 60–90 day pilot on one class of business, on your own claims.',
    primary: ctas.pilot,
    secondary: ctas.demo,
  },
};

export const brokers: SolutionPage = {
  path: '/solutions/brokers',
  photo: 'kombis',
  meta: {
    title: 'For brokers | ClaimsFlow',
    description:
      'One place to submit and track claim documents for your clients, and see what is missing before the insurer asks.',
  },
  title: 'See what is missing before the insurer asks',
  lead: 'One place to submit claim documents for your clients and to track each one, so you can give a straight answer when a client calls.',
  outcomes: [
    {
      title: 'One place to submit',
      body: 'Enter the policy or claim reference and upload against the insurer’s checklist.',
    },
    {
      title: 'Always know the status',
      body: 'Items tick off as documents land, and outstanding items stay in plain view.',
    },
    {
      title: 'Fewer back-and-forth emails',
      body: 'You know what is needed from the start, so you can gather it from your client in one go.',
    },
  ],
  mock: 'portal',
  mockTitle: 'A checklist, not a guessing game',
  mockBody:
    'The portal shows what the insurer needs for this claim. Photos taken on a phone are accepted, so your client can send what they have.',
  steps: {
    title: 'How it fits your day',
    items: [
      'Your client sends you documents however they normally do.',
      'You upload them against the claim, from a computer or a phone.',
      'You see at once what is complete and what is still outstanding.',
      'The insurer’s team reviews the file and makes every decision on the claim.',
    ],
  },
  cta: {
    title: 'Interested? Tell us which insurers you work with.',
    body: 'Our first pilots start with insurers. We would be glad to talk through how the portal could work for your clients.',
    primary: ctas.demo,
    secondary: ctas.pilot,
  },
};

export const lossAdjusters: SolutionPage = {
  path: '/solutions/loss-adjusters',
  photo: 'mechanic',
  meta: {
    title: 'For loss adjusters | ClaimsFlow',
    description:
      'Assemble and check document bundles faster, with consistent summaries to start your reports from.',
  },
  title: 'Assemble and check the bundle faster',
  lead: 'Spend your time on the loss, not on sorting attachments. ClaimsFlow organises the documents and gives you a consistent summary to start your report from.',
  outcomes: [
    {
      title: 'A sorted bundle',
      body: 'Every document labelled and in its place, with its key details extracted.',
    },
    {
      title: 'Inconsistencies in view',
      body: "Quotes that differ from the assessor's report, or details that do not match, are flagged for you to weigh up.",
    },
    {
      title: 'Consistent summaries',
      body: 'The same layout on every file, so reports start from a familiar place.',
    },
  ],
  mock: 'summary',
  mockTitle: 'Start your report with the facts in one place',
  mockBody:
    'Parties, dates, amounts and open flags on one page, each linked back to its source document. Your professional judgement stays yours.',
  steps: {
    title: 'How it fits your work',
    items: [
      'Documents come in from the insurer, broker or claimant.',
      'ClaimsFlow sorts them and checks them against the checklist for that class.',
      'You review the flags, look at the originals and draw your own conclusions.',
      'You export the summary and details to use in your report.',
    ],
  },
  cta: {
    title: 'See how it would handle a typical bundle.',
    body: 'A short demo, using sample claims.',
    primary: ctas.demo,
    secondary: ctas.pilot,
  },
};

export const solutionPages = { insurers, brokers, lossAdjusters };
