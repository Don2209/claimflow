import { t } from '@/i18n/localize';

/**
 * Fictional data shown inside the product mocks. Every value is invented.
 * Use obviously fake names and "SMP"/"SMPL" references when editing.
 */
export const samples = {
  claimRef: 'SMPL-M-20418',
  claimant: 'Farai Specimen',
  policy: 'SMPL-POL-7731',
  regOnForm: 'SMP 1234',
  regOnQuote: 'SMP 1284',
  sender: 'claims@sample-broker.example',
  insurer: 'Sample Mutual Insurance',
};

export const heroMock = t('heroMock', {
  windowTitle: `Claim ${samples.claimRef}, motor comprehensive`,
  emailFrom: samples.sender,
  emailSubject: `Claim docs for ${samples.claimant}`,
  documents: [
    { file: 'IMG_2041.jpg', label: 'Claim form', variant: 'handwritten' },
    { file: 'licence_scan.pdf', label: "Driver's licence", variant: 'card' },
    { file: 'vehicle_reg.jpg', label: 'Vehicle registration', variant: 'certificate' },
    { file: 'quote_panel.pdf', label: 'Repair quote', variant: 'table' },
  ] as const,
  checklist: [
    'Claim form',
    "Driver's licence",
    'Vehicle registration',
    'Repair quote',
    'Police report',
  ],
  missing: {
    label: 'Police report missing',
    body: 'Required for this class. A request is drafted for your handler.',
  },
  mismatch: {
    label: 'Registration number differs between quote and claim form',
    from: `${samples.regOnForm} on claim form`,
    to: `${samples.regOnQuote} on quote`,
  },
  inboxTitle: 'Inbox',
  stacksTitle: 'Sorted',
  checklistTitle: 'Checklist',
  replay: 'Replay the animation',
  caption: 'Illustration using sample data. Your people review every flag.',
});

export const queueMock = {
  title: 'Claims queue',
  columns: ['Claim', 'Sender', 'Status'],
  rows: [
    {
      ref: 'SMPL-M-20418',
      name: 'F. Specimen',
      sender: 'Sample Brokers',
      status: '1 missing, 1 flag',
      tone: 'danger',
    },
    { ref: 'SMPL-M-20417', name: 'R. Example', sender: 'Direct', status: 'Complete', tone: 'ok' },
    {
      ref: 'SMPL-M-20415',
      name: 'N. Placeholder',
      sender: 'Demo Brokers',
      status: '2 missing',
      tone: 'warn',
    },
    {
      ref: 'SMPL-M-20412',
      name: 'T. Fictional',
      sender: 'Sample Brokers',
      status: 'Complete',
      tone: 'ok',
    },
  ],
} as const;

export const portalMock = {
  title: 'Secure portal',
  reference: samples.claimRef,
  intro: 'Documents needed for your claim',
  items: [
    { label: 'Claim form', status: 'ok', note: 'Received' },
    { label: "Driver's licence", status: 'ok', note: 'Received' },
    { label: 'Vehicle registration', status: 'ok', note: 'Received' },
    { label: 'Police report', status: 'warn', note: 'Still needed' },
    { label: 'Repair quotes', status: 'pending', note: 'Uploading' },
  ],
  upload: 'Take a photo or choose a file',
} as const;

export const intakeMock = {
  title: 'Claims inbox',
  emails: [
    {
      from: samples.sender,
      subject: 'Docs for F Specimen, reg SMP 1234',
      attachments: 4,
      match: samples.claimRef,
    },
    {
      from: 'adjuster@sample-loss.example',
      subject: "Assessor's report SMPL-M-20417",
      attachments: 1,
      match: 'SMPL-M-20417',
    },
    {
      from: 'r.example@mail.example',
      subject: 'my car claim photos',
      attachments: 3,
      match: 'SMPL-M-20415',
    },
  ],
  matchedLabel: 'Matched to',
};

export const classifyMock = {
  title: `Documents on ${samples.claimRef}`,
  docs: [
    { label: 'Claim form', variant: 'handwritten' },
    { label: "Driver's licence", variant: 'card' },
    { label: 'Vehicle registration', variant: 'certificate' },
    { label: 'Repair quote', variant: 'table' },
    { label: "Assessor's report", variant: 'letter' },
    { label: 'Affidavit', variant: 'form' },
  ],
} as const;

export const extractMock = {
  title: 'Claim form, page 1',
  fields: [
    { label: 'Claimant', value: samples.claimant },
    { label: 'ID number', value: 'ID-000000-00' },
    { label: 'Vehicle registration', value: samples.regOnForm },
    { label: 'Date of loss', value: '14 Mar 2030' },
    { label: 'Amount claimed', value: 'USD 1,250.00' },
  ],
  source: 'Read from handwriting',
};

export const builderMock = {
  title: 'Checklist builder',
  classes: [
    'Motor comprehensive',
    'Third party',
    'Funeral and life',
    'Medical',
    'Property',
    'Agriculture',
  ],
  activeClass: 'Motor comprehensive',
  items: [
    { label: 'Claim form', required: true },
    { label: 'Police report', required: true },
    { label: "Driver's licence", required: true },
    { label: 'Vehicle registration', required: true },
    { label: 'Repair quotes', required: true },
    { label: "Assessor's report", required: false },
  ],
  requiredLabel: 'Required',
  optionalLabel: 'Optional',
  add: 'Add a document',
};

export const flagsMock = {
  title: 'Flags for review',
  items: [
    {
      tone: 'danger',
      title: 'Registration number differs',
      body: `${samples.regOnForm} on the claim form, ${samples.regOnQuote} on the repair quote.`,
    },
    {
      tone: 'danger',
      title: 'Currency mismatch',
      body: 'Claim form states USD. Invoice total is in EUR.',
    },
    {
      tone: 'warn',
      title: 'Loss date to check',
      body: 'Date of loss falls after the policy end date shown on the schedule.',
    },
    {
      tone: 'warn',
      title: 'Supplier seen before',
      body: 'The same quote reference appears on another claim.',
    },
  ],
  footer: 'Flags only. A person decides.',
} as const;

export const draftMock = {
  title: 'Draft for approval',
  to: samples.sender,
  subject: `Documents needed for claim ${samples.claimRef}`,
  body: [
    'Good day,',
    `We have received your documents for claim ${samples.claimRef}. To continue, we still need the police report.`,
    'Please also confirm the vehicle registration, as it differs between the claim form and the repair quote.',
  ],
  approve: 'Approve and send',
  edit: 'Edit',
};

export const summaryMock = {
  title: 'Claim summary',
  heading: `${samples.claimRef}, motor comprehensive`,
  rows: [
    { label: 'Claimant', value: samples.claimant },
    { label: 'Policy', value: samples.policy },
    { label: 'Vehicle', value: samples.regOnForm },
    { label: 'Date of loss', value: '14 Mar 2030' },
    { label: 'Repair quote', value: 'USD 1,250.00' },
  ],
  statuses: [
    { status: 'ok', label: '5 of 6 documents received' },
    { status: 'warn', label: 'Police report missing' },
    { status: 'danger', label: 'Registration differs on quote' },
  ],
  footer: 'Prepared for review. No decision has been made.',
} as const;

export const exportMock = {
  title: 'Export',
  file: 'claims_export_sample.csv',
  columns: ['Claim', 'Claimant', 'Reg', 'Amount'],
  rows: [
    ['SMPL-M-20418', 'F. Specimen', 'SMP 1234', 'USD 1,250.00'],
    ['SMPL-M-20417', 'R. Example', 'SMP 5678', 'USD 480.00'],
    ['SMPL-M-20412', 'T. Fictional', 'SMP 9012', 'EUR 960.00'],
  ],
  actions: ['Excel', 'CSV', 'Claims system'],
};

export const dashboardMock = {
  title: 'Manager dashboard',
  tiles: [
    { label: 'Waiting on documents', value: '24' },
    { label: 'Longest wait', value: '18 days' },
    { label: 'Ready for review', value: '11' },
  ],
  chartTitle: 'Files received incomplete, by sender',
  bars: [
    { label: 'Sample Brokers', value: 12 },
    { label: 'North branch', value: 8 },
    { label: 'Demo Brokers', value: 5 },
    { label: 'South branch', value: 3 },
  ],
  waitingTitle: 'Longest waiting',
  waiting: [
    { ref: 'SMPL-M-20391', missing: 'Police report', days: '18 days' },
    { ref: 'SMPL-M-20398', missing: "Assessor's report", days: '12 days' },
    { ref: 'SMPL-M-20404', missing: 'Repair quotes', days: '7 days' },
  ],
};
