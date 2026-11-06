import type { PageMeta } from './types';

export const aboutMeta: PageMeta = {
  title: 'About VisynTech | ClaimsFlow',
  description:
    'ClaimsFlow is built by VisynTech (Visyn Technologies), a software and AI company in Harare, Zimbabwe, making practical AI for businesses.',
};

export const aboutPage = {
  title: 'Practical AI for real paperwork, built in Harare',
  lead: 'VisynTech (Visyn Technologies) is a software and AI company in Harare, Zimbabwe. We work across software development, AI, machine learning and business automation.',
  why: {
    title: 'Why claims documents',
    paragraphs: [
      'In many countries, claims work still runs on paperwork that arrives as email attachments, phone photos and handwritten forms, often in more than one currency. Tools built for tidy, digital files rarely start from that reality.',
      'So we are building something narrow and useful. ClaimsFlow does not try to make claims decisions. It takes on the document work that keeps people from making them.',
    ],
  },
  beliefs: {
    title: 'How we work',
    items: [
      {
        title: 'Useful before clever',
        body: 'If a plain checklist solves the problem, we use a plain checklist.',
      },
      {
        title: 'People decide',
        body: 'AI can prepare the work. Decisions that affect people stay with people.',
      },
      {
        title: 'Honest about where we are',
        body: 'ClaimsFlow is in development. We will tell you what works, what does not yet, and what we learned.',
      },
    ],
  },
  founder: {
    title: 'Founder',
    name: 'Rufaro Sitotombe',
    /** PLACEHOLDER: replace with the founder's role and bio. Set `photo` to an image path in /public. */
    role: '',
    bio: '',
    photo: '',
    rolePlaceholder: 'Role: to be added',
    bioPlaceholder: 'Short bio: to be added by the founder',
    photoPlaceholder: 'Photo: to be added',
  },
};
