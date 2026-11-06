import type { DocVariant } from '@/components/DocSheet';

/** All people, references and documents below are fictional, and labelled as sample data on screen. */
export interface DemoField {
  label: string;
  value: string;
  /** Highlighted in red when the inconsistency is flagged. */
  flagged?: boolean;
}

export interface DemoDocument {
  id: string;
  file: string;
  type: string;
  variant: DocVariant;
  note?: string;
  fields: DemoField[];
}

export interface DemoScenario {
  id: 'motor' | 'funeral' | 'medical';
  name: string;
  reference: string;
  source:
    | { channel: 'email'; from: string; subject: string; body: string }
    | { channel: 'portal'; uploadedBy: string; intro: string };
  documents: DemoDocument[];
  checklist: { label: string; documentId?: string }[];
  missing: { label: string; explanation: string };
  inconsistency: { title: string; explanation: string };
  summary: { heading: string; rows: { label: string; value: string }[] };
  draft: { to: string; subject: string; body: string[] };
}

export const scenarios: DemoScenario[] = [
  {
    id: 'motor',
    name: 'Motor (comprehensive)',
    reference: 'SMPL-M-20418',
    source: {
      channel: 'email',
      from: 'claims@sample-broker.example',
      subject: 'Claim docs for Farai Specimen, policy SMPL-POL-7731',
      body: 'Good day. Please find the documents for this accident claim attached. Photos taken on the client’s phone.',
    },
    documents: [
      {
        id: 'form',
        file: 'IMG_2041.jpg',
        type: 'Claim form',
        variant: 'handwritten',
        note: 'Handwritten',
        fields: [
          { label: 'Name', value: 'Farai Specimen' },
          { label: 'ID', value: 'ID-000000-00' },
          { label: 'Reg number', value: 'SMP 1234', flagged: true },
          { label: 'Date of loss', value: '14 Mar 2030' },
        ],
      },
      {
        id: 'licence',
        file: 'licence_scan.pdf',
        type: "Driver's licence",
        variant: 'card',
        fields: [
          { label: 'Name', value: 'Farai Specimen' },
          { label: 'ID', value: 'ID-000000-00' },
        ],
      },
      {
        id: 'regbook',
        file: 'vehicle_reg.jpg',
        type: 'Vehicle registration',
        variant: 'certificate',
        note: 'Phone photo',
        fields: [
          { label: 'Reg number', value: 'SMP 1234' },
          { label: 'Owner', value: 'Farai Specimen' },
        ],
      },
      {
        id: 'quote',
        file: 'quote_sample_panel.pdf',
        type: 'Repair quote',
        variant: 'table',
        fields: [
          { label: 'Reg number', value: 'SMP 1284', flagged: true },
          { label: 'Amount', value: 'USD 1,250.00' },
        ],
      },
      {
        id: 'assessor',
        file: 'assessor_report.pdf',
        type: "Assessor's report",
        variant: 'letter',
        fields: [
          { label: 'Reg number', value: 'SMP 1234' },
          { label: 'Assessed', value: 'USD 1,250.00' },
        ],
      },
    ],
    checklist: [
      { label: 'Claim form', documentId: 'form' },
      { label: "Driver's licence", documentId: 'licence' },
      { label: 'Vehicle registration', documentId: 'regbook' },
      { label: 'Repair quote', documentId: 'quote' },
      { label: "Assessor's report", documentId: 'assessor' },
      { label: 'Police report' },
    ],
    missing: {
      label: 'Police report missing',
      explanation:
        'This checklist requires a police report for an accident claim. None was found in the email.',
    },
    inconsistency: {
      title: 'Registration number differs',
      explanation:
        'SMP 1234 on the claim form and vehicle registration, but SMP 1284 on the repair quote. It could be a typing slip. A handler should check.',
    },
    summary: {
      heading: 'SMPL-M-20418, motor comprehensive',
      rows: [
        { label: 'Claimant', value: 'Farai Specimen' },
        { label: 'Policy', value: 'SMPL-POL-7731' },
        { label: 'Vehicle', value: 'SMP 1234' },
        { label: 'Date of loss', value: '14 Mar 2030' },
        { label: 'Repair quote', value: 'USD 1,250.00' },
        { label: 'Documents', value: '5 of 6 received' },
      ],
    },
    draft: {
      to: 'claims@sample-broker.example',
      subject: 'Documents needed for claim SMPL-M-20418',
      body: [
        'Good day,',
        'Thank you for the documents for claim SMPL-M-20418 (Farai Specimen). To continue, we still need:',
        '1. The police report for this accident.',
        '2. Confirmation of the vehicle registration. The repair quote shows SMP 1284, and the claim form shows SMP 1234. Please ask the panel beater to correct the quote if needed.',
        'Kind regards,\nClaims team, Sample Mutual Insurance',
      ],
    },
  },
  {
    id: 'funeral',
    name: 'Funeral',
    reference: 'SMPL-F-10377',
    source: {
      channel: 'portal',
      uploadedBy: 'Sample Brokers, on behalf of Rudo Example',
      intro: 'Uploaded through the secure portal against the policy reference.',
    },
    documents: [
      {
        id: 'form',
        file: 'claim_form.jpg',
        type: 'Claim form',
        variant: 'handwritten',
        note: 'Handwritten',
        fields: [
          { label: 'Deceased', value: 'Tawanda Example' },
          { label: 'ID', value: 'ID-111111-00', flagged: true },
          { label: 'Claimant', value: 'Rudo Example' },
          { label: 'Date of death', value: '02 Feb 2030' },
        ],
      },
      {
        id: 'certificate',
        file: 'death_cert.pdf',
        type: 'Death certificate',
        variant: 'certificate',
        fields: [
          { label: 'Deceased', value: 'Tawanda Example' },
          { label: 'ID', value: 'ID-111117-00', flagged: true },
          { label: 'Date of death', value: '02 Feb 2030' },
        ],
      },
      {
        id: 'nationalid',
        file: 'id_rudo.jpg',
        type: 'ID document (claimant)',
        variant: 'card',
        note: 'Phone photo',
        fields: [
          { label: 'Name', value: 'Rudo Example' },
          { label: 'ID', value: 'ID-222222-00' },
        ],
      },
      {
        id: 'invoice',
        file: 'funeral_invoice.pdf',
        type: 'Funeral invoice',
        variant: 'table',
        fields: [
          { label: 'Supplier', value: 'Sample Funeral Services' },
          { label: 'Amount', value: 'USD 1,850.00' },
        ],
      },
    ],
    checklist: [
      { label: 'Claim form', documentId: 'form' },
      { label: 'Death certificate', documentId: 'certificate' },
      { label: 'ID document (claimant)', documentId: 'nationalid' },
      { label: 'Funeral invoice', documentId: 'invoice' },
      { label: 'Burial permit' },
    ],
    missing: {
      label: 'Burial permit missing',
      explanation:
        'This checklist requires a burial permit for funeral claims. None has been uploaded.',
    },
    inconsistency: {
      title: 'ID number differs',
      explanation:
        "The deceased's ID differs on the claim form (ID-111111-00) and the death certificate (ID-111117-00). A handler should check the original.",
    },
    summary: {
      heading: 'SMPL-F-10377, funeral',
      rows: [
        { label: 'Deceased', value: 'Tawanda Example' },
        { label: 'Claimant', value: 'Rudo Example' },
        { label: 'Date of death', value: '02 Feb 2030' },
        { label: 'Funeral invoice', value: 'USD 1,850.00' },
        { label: 'Documents', value: '4 of 5 received' },
      ],
    },
    draft: {
      to: 'support@sample-brokers.example',
      subject: 'Documents needed for claim SMPL-F-10377',
      body: [
        'Good day,',
        'We are sorry for the family’s loss. Thank you for the documents for claim SMPL-F-10377. To continue, we still need:',
        '1. A copy of the burial permit.',
        "2. A clear copy of the deceased's ID document, as the ID number differs between the claim form and the death certificate.",
        'Kind regards,\nClaims team, Sample Mutual Insurance',
      ],
    },
  },
  {
    id: 'medical',
    name: 'Medical',
    reference: 'SMPL-H-55102',
    source: {
      channel: 'email',
      from: 'accounts@sample-clinic.example',
      subject: 'Claim for member SMPL-MBR-3301, Nyasha Placeholder',
      body: 'Please find the claim documents for the above member, including the invoice and the doctor’s report.',
    },
    documents: [
      {
        id: 'form',
        file: 'member_claim_form.pdf',
        type: 'Claim form',
        variant: 'form',
        fields: [
          { label: 'Member', value: 'Nyasha Placeholder' },
          { label: 'Member no.', value: 'SMPL-MBR-3301' },
          { label: 'Date of service', value: '21 Apr 2030' },
          { label: 'Amount', value: 'USD 340.00', flagged: true },
        ],
      },
      {
        id: 'report',
        file: 'medical_report.jpg',
        type: 'Medical report',
        variant: 'letter',
        note: 'Scan',
        fields: [
          { label: 'Patient', value: 'Nyasha Placeholder' },
          { label: 'Date of service', value: '21 Apr 2030' },
        ],
      },
      {
        id: 'invoice',
        file: 'invoice_sample_clinic.pdf',
        type: 'Invoice',
        variant: 'table',
        fields: [
          { label: 'Provider', value: 'Sample Clinic' },
          { label: 'Amount', value: 'EUR 340.00', flagged: true },
        ],
      },
      {
        id: 'membership',
        file: 'member_card.jpg',
        type: 'Membership card',
        variant: 'card',
        note: 'Phone photo',
        fields: [
          { label: 'Member', value: 'Nyasha Placeholder' },
          { label: 'Member no.', value: 'SMPL-MBR-3301' },
        ],
      },
    ],
    checklist: [
      { label: 'Claim form', documentId: 'form' },
      { label: 'Medical report', documentId: 'report' },
      { label: 'Invoice', documentId: 'invoice' },
      { label: 'Membership card', documentId: 'membership' },
      { label: 'Proof of payment' },
    ],
    missing: {
      label: 'Proof of payment missing',
      explanation: 'This checklist requires proof of payment for refund claims. None was attached.',
    },
    inconsistency: {
      title: 'Currency mismatch',
      explanation:
        'The claim form states USD 340.00, but the invoice total is EUR 340.00. A handler should confirm which is right before this goes further.',
    },
    summary: {
      heading: 'SMPL-H-55102, medical',
      rows: [
        { label: 'Member', value: 'Nyasha Placeholder' },
        { label: 'Member no.', value: 'SMPL-MBR-3301' },
        { label: 'Provider', value: 'Sample Clinic' },
        { label: 'Date of service', value: '21 Apr 2030' },
        { label: 'Amount', value: 'USD or EUR 340.00, to confirm' },
        { label: 'Documents', value: '4 of 5 received' },
      ],
    },
    draft: {
      to: 'accounts@sample-clinic.example',
      subject: 'Documents needed for claim SMPL-H-55102',
      body: [
        'Good day,',
        'Thank you for the documents for claim SMPL-H-55102. To continue, we still need:',
        '1. Proof of payment for this invoice.',
        '2. Confirmation of the currency. The claim form shows USD 340.00, and the invoice shows EUR 340.00.',
        'Kind regards,\nClaims team, Sample Mutual Medical Fund',
      ],
    },
  },
];

export const demoCopy = {
  chooseLabel: 'Choose a sample claim',
  run: 'Run ClaimsFlow',
  running: 'Reading documents',
  reset: 'Reset',
  tryAnother: 'Try another claim type',
  book: 'Book a demo',
  emailFrom: 'From',
  emailSubject: 'Subject',
  portalBy: 'Uploaded by',
  emailHeading: 'Email received',
  portalHeading: 'Portal upload',
  documentsHeading: 'Documents',
  notRead: 'Not read yet',
  readingNow: 'Reading',
  checklistHeading: 'Checklist',
  flagsHeading: 'For your handler to review',
  flagsEmpty: 'Run ClaimsFlow to see what it flags.',
  resultsHeading: 'The file, ready for review',
  summaryHeading: 'Claim summary',
  summaryFooter: 'Prepared for review. No decision has been made.',
  documentsMissing: 'Missing',
  documentsFlag: 'Flag',
  draftHeading: 'Drafted missing-documents email',
  draftShow: 'Show the drafted email',
  draftHide: 'Hide the drafted email',
  draftNote: 'Drafted for your handler to edit and approve. Nothing is sent automatically.',
  draftTo: 'To',
  draftSubject: 'Subject',
  disclaimer: 'Sample data. All names, numbers and documents are fictional.',
};
