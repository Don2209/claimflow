import type { PageMeta } from './types';

export const securityMeta: PageMeta = {
  title: 'Security and data protection | ClaimsFlow',
  description:
    'How ClaimsFlow approaches hosting, encryption, access, audit trails and data retention, with data protection law in mind.',
};

export const securityPage = {
  title: 'Claims files hold sensitive information. Here is how we treat it.',
  lead: 'Plain English on how ClaimsFlow is being designed. It is in development, so ask us what is in place today when you evaluate it.',
  principle: {
    title: 'People stay in charge',
    body: 'ClaimsFlow is AI-assisted, and human-in-the-loop by design. It reads, checks and flags. It does not approve, reject or settle a claim, and it does not send a request unless a handler approves it.',
  },
  hosting: {
    title: 'Hosting where you need it',
    lead: 'Different insurers have different requirements. We will work out the right option with you.',
    options: [
      {
        title: 'Cloud',
        body: 'The simplest way to start. We run it for you, and we will tell you where the data sits.',
      },
      {
        title: 'In-country',
        body: 'For insurers that need claims data hosted within the country.',
      },
      {
        title: 'On-premises',
        body: 'Runs on your own servers, under your own IT and security controls.',
      },
    ],
  },
  controls: {
    title: 'The controls that matter',
    items: [
      {
        title: 'Encryption',
        body: 'Data is encrypted in transit and at rest.',
        icon: 'lock',
      },
      {
        title: 'Role-based access',
        body: 'Handlers, managers, brokers and claimants each see only what their role allows.',
        icon: 'users',
      },
      {
        title: 'Full audit trail',
        body: 'Every action is recorded: who viewed, changed, approved or exported what, and when.',
        icon: 'history',
      },
      {
        title: 'Data retention controls',
        body: 'You set how long documents and data are kept, in line with your own policies and legal duties.',
        icon: 'calendar',
      },
    ],
  },
  law: {
    title: 'Data protection law',
    paragraphs: [
      'Claims files contain personal information, and medical and funeral claims can contain especially sensitive information. In-country hosting, access controls, audit trails and retention settings are there to support your obligations.',
      "Data protection law differs by country, so we look at the rules that apply to you with each insurer. We started from Zimbabwe's Cyber and Data Protection Act. Elsewhere that means rules such as the EU and UK GDPR, South Africa's POPIA, and the Data Protection Acts of Nigeria and Kenya.",
      'Using ClaimsFlow does not on its own make an insurer compliant. As the organisation responsible for your data, your compliance and legal teams should review the setup, and we will give them the information they need.',
    ],
  },
  training: {
    title: 'Your data does not train AI without your written consent',
    body: 'We do not use customer data to train AI models unless you have agreed to it in writing.',
  },
  ask: {
    title: 'Ask us for our security overview.',
    body: 'We will share what your IT, risk and compliance teams need, and answer their questions directly.',
    button: 'Ask for the security overview',
  },
};
