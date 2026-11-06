/** The languages the site is published in. To add one, see "Languages" in the README. */
export const languages = [
  { code: 'en', name: 'English', reviewed: true },
  { code: 'sn', name: 'chiShona', reviewed: false },
  { code: 'nd', name: 'isiNdebele', reviewed: false },
  { code: 'sw', name: 'Kiswahili', reviewed: false },
  { code: 'zu', name: 'isiZulu', reviewed: false },
  { code: 'ha', name: 'Hausa', reviewed: false },
  { code: 'yo', name: 'Yorùbá', reviewed: false },
  { code: 'am', name: 'አማርኛ', reviewed: false },
];

/** The language of this build. Each language is built separately, under its own folder. */
export const lang: string = import.meta.env.VITE_LANG || 'en';

/** Where the site sits on its host: empty at a domain's root, '/claimflow' on GitHub Pages. */
export const siteBase: string = (import.meta.env.VITE_SITE_BASE || '').replace(/\/$/, '');

/** The folder this language lives under: empty for English, '/sn' for Shona. */
export const langPrefix = lang === 'en' ? '' : `/${lang}`;

/** The router's base: the site's place on the host, then the language folder. */
export const basePath = `${siteBase}${langPrefix}`;

/** Unreviewed translations stay out of search results until a native speaker has checked them. */
export const isDraftLanguage = !languages.find((language) => language.code === lang)?.reviewed;

/** Pages translated in full. Every other page shows English, with a notice saying so. */
export const translatedRoutes = ['/', '/demo'];

/** Static hosts serve pages with a trailing slash, so /demo/ and /demo are the same page. */
export const isTranslated = (path: string) =>
  translatedRoutes.includes(path.length > 1 ? path.replace(/\/$/, '') : path);

export const pathInLanguage = (code: string, path: string) =>
  code === 'en' ? path : path === '/' ? `/${code}/` : `/${code}${path}`;
