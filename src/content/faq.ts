import type { PageMeta } from './types';

export const faqMeta: PageMeta = {
  title: 'Questions about ClaimsFlow | FAQ',
  description:
    'Plain answers on how ClaimsFlow works with your claims system, what it can read, where data is stored, pricing and setup.',
};

export const faqPage = {
  title: 'Questions we expect from a Head of Claims',
  lead: 'Short answers. If yours is not here, ask us directly.',
};

export const faqs = [
  {
    question: 'Does ClaimsFlow replace our claims system?',
    answer:
      'No. It sits alongside your existing system. It prepares complete, checked files, then passes the information across by Excel or CSV export, or by integration where that is technically feasible.',
  },
  {
    question: 'Does it decide claims?',
    answer:
      'No. ClaimsFlow never approves, rejects or settles a claim. It flags what is missing or does not match, and a person decides what happens next.',
  },
  {
    question: 'What documents can it read?',
    answer:
      "The paperwork behind a typical claim: claim forms, police reports, driver's licences, vehicle registration documents, ID documents, repair quotes, assessor's reports, invoices, death certificates, burial permits, affidavits and medical reports. Each insurer sets which ones it needs for each class of business.",
  },
  {
    question: 'Can it read phone photos and handwriting?',
    answer:
      'Yes, it is built for both, because that is how many documents arrive. Handwriting is harder than print, so a person should always be able to check what was extracted against the original page. The pilot is where we will measure how well this works on your real documents.',
  },
  {
    question: 'Where is our data stored?',
    answer:
      'You choose. ClaimsFlow offers cloud, in-country and on-premises hosting, so insurers that need data kept in their own country or on their own servers can ask for that. We will confirm what is possible where you are. See the security page for details.',
  },
  {
    question: 'How does pricing work?',
    answer:
      'Pricing is in USD. You start with a low-cost pilot of 60 to 90 days on one class of business. After that, you move to per-claim or monthly tiers. Contact us for current figures.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'The pilot plan allows the first two weeks for setup and checklist configuration, then you go live on one class of business from week three.',
  },
  {
    question: 'Can brokers use it?',
    answer:
      'Yes. Brokers can use the secure portal to submit documents, see the checklist for each claim and track what is still outstanding, before the insurer has to ask.',
  },
  {
    question: 'What if a document is in poor quality?',
    answer:
      'ClaimsFlow does not guess quietly. If a page is too blurred or incomplete to read with confidence, it is marked for a handler to look at, and you can ask the sender for a clearer copy.',
  },
];
