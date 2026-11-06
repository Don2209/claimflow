import { t } from '@/i18n/localize';
import type { Cta } from './types';

/** Set a value here and the matching placeholder on the site disappears. */
export const contact = {
  email: 'rufaro@visyntech.co.zw',
  /** PLACEHOLDER: add the phone number, e.g. '+263 ...'. */
  phone: '',
  /** PLACEHOLDER: add the postal address. */
  postalAddress: '',
  /** PLACEHOLDER: add the LinkedIn company page URL. */
  linkedinUrl: '',
};

export const placeholderText = t('placeholderText', {
  phone: 'Phone number: to be added',
  postalAddress: 'Postal address: to be added',
  linkedin: 'LinkedIn link: to be added',
});

export const ctas = t('ctas', {
  demo: { label: 'Book a 20-minute demo', to: '/demo' },
  pilot: { label: 'Join the pilot programme', to: '/pilot' },
} satisfies Record<string, Cta>);

export const statusNote = t('statusNote', 'In development. First pilot places are open.');

/** Short pieces of interface text used by components. */
export const ui = t('ui', {
  solutions: 'Solutions',
  skip: 'Skip to content',
  optional: '(optional)',
  language: 'Language',
  englishOnly: 'This page is in English for now.',
  themeToggle: 'Switch between light and dark mode',
  emailTitle: 'Your email app should now be open',
  emailBody: 'Your details are in the message. Press send to finish, or write to us at',
});

export const solutionsNav = t('solutionsNav', [
  {
    label: 'Insurers',
    to: '/solutions/insurers',
    blurb: 'Motor, funeral and life, medical, property, agriculture',
  },
  { label: 'Brokers', to: '/solutions/brokers', blurb: 'Submit and track client documents' },
  {
    label: 'Loss adjusters',
    to: '/solutions/loss-adjusters',
    blurb: 'Assemble and check document bundles',
  },
]);

export const mainNav = t('mainNav', [
  { label: 'Product', to: '/product' },
  { label: 'Security', to: '/security' },
  { label: 'Pilot programme', to: '/pilot' },
  { label: 'FAQ', to: '/faq' },
  { label: 'About', to: '/about' },
]);

export const footer = t('footer', {
  blurb: 'AI-assisted claims documentation for insurers. It prepares the file. Your people decide.',
  disclosure:
    'ClaimsFlow is in development and has not yet started pilots. Sample data appears throughout this site, and every name, number and document in it is fictional. Photographs are illustrative and do not show ClaimsFlow customers or their claims.',
  company: 'ClaimsFlow is a product of VisynTech (Visyn Technologies).',
  madeIn: 'Made in Harare',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Overview', to: '/product' },
        { label: 'Security and data protection', to: '/security' },
        { label: 'Pilot programme', to: '/pilot' },
        { label: 'FAQ', to: '/faq' },
      ],
    },
    {
      title: 'Solutions',
      links: solutionsNav.map(({ label, to }) => ({ label, to })),
    },
    {
      title: 'Company',
      links: [
        { label: 'About VisynTech', to: '/about' },
        { label: 'Book a demo', to: '/demo' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', to: '/privacy' },
        { label: 'Terms', to: '/terms' },
        { label: 'Photo credits', to: '/credits' },
      ],
    },
  ],
});

export const notFound = {
  meta: {
    title: 'Page not found | ClaimsFlow',
    description: 'This page does not exist. Find ClaimsFlow product, pilot and contact pages here.',
  },
  title: 'This page is missing from the file.',
  body: 'The link may be old or mistyped. These pages are a good place to pick things up.',
  links: [
    { label: 'Go to the home page', to: '/' },
    { label: 'See the product', to: '/product' },
    { label: 'Book a demo', to: '/demo' },
  ],
};

export const cookieNotice = {
  body: 'This site would like to use analytics cookies to understand which pages are useful. They stay off unless you accept.',
  accept: 'Accept analytics',
  decline: 'Decline',
};
