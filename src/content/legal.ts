import type { PageMeta } from './types';

export interface LegalDocument {
  path: string;
  meta: PageMeta;
  title: string;
  notice: string;
  sections: { title: string; body: string }[];
}

const notice =
  'This is a plain-language draft that has not yet had legal review. If you have a question, write to us at rufaro@visyntech.co.zw.';

export const privacy: LegalDocument = {
  path: '/privacy',
  meta: {
    title: 'Privacy | ClaimsFlow',
    description: 'How ClaimsFlow handles the details you send through this website.',
  },
  title: 'Privacy notice',
  notice,
  sections: [
    {
      title: 'Who we are',
      body: 'ClaimsFlow is a product of VisynTech (Visyn Technologies), based in Harare, Zimbabwe. For anything about your data, write to rufaro@visyntech.co.zw.',
    },
    {
      title: 'What we collect',
      body: 'The details you send us through the demo and pilot forms: your name, work email, phone number, company, role, country, time zone and message.',
    },
    {
      title: 'Why we use it',
      body: 'To reply to your request and talk with you about a demo or pilot. We do not use these details for anything else.',
    },
    {
      title: 'Who we share it with',
      body: 'We do not sell your details. The services that host this website or deliver your message may process them on our behalf, and those services can be in other countries.',
    },
    {
      title: 'How long we keep it',
      body: 'Only for as long as we need them to deal with your request. Ask us at any time and we will delete them.',
    },
    {
      title: 'Your rights',
      body: 'Depending on where you live, data protection law may let you see, correct or delete the details we hold about you. Write to us and we will help.',
    },
    {
      title: 'Cookies and analytics',
      body: 'Analytics are off. This site remembers your light or dark choice in your own browser, and it sets no tracking cookies.',
    },
  ],
};

export const terms: LegalDocument = {
  path: '/terms',
  meta: {
    title: 'Terms | ClaimsFlow',
    description: 'The terms for using the ClaimsFlow website.',
  },
  title: 'Terms of use',
  notice,
  sections: [
    {
      title: 'About these terms',
      body: 'These terms apply when you use this website, which is run by VisynTech (Visyn Technologies).',
    },
    {
      title: 'Using this website',
      body: 'You are welcome to read this website and try the interactive demo. Please do not try to disrupt the site or misuse it.',
    },
    {
      title: 'Sample data',
      body: 'Sample claims, names, numbers and documents on this website are fictional. Photographs are illustrative and do not show our customers or their claims.',
    },
    {
      title: 'Product status',
      body: 'ClaimsFlow is in development. The interactive demo runs on prepared sample documents, and descriptions of the product may change before release.',
    },
    {
      title: 'Intellectual property',
      body: 'The words and design of this website belong to VisynTech, apart from the photographs, which belong to the people named on the photo credits page.',
    },
    {
      title: 'Liability',
      body: 'This website is general information, not professional or legal advice. A separate agreement would cover any pilot or use of the product.',
    },
    {
      title: 'Governing law',
      body: 'We are based in Zimbabwe. The governing law will be confirmed when these terms are finalised.',
    },
  ],
};
