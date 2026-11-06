/** Deployment settings, read from environment variables at build time. See .env.example. */
export const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://claimsflow.example').replace(
  /\/$/,
  '',
);
export const formEndpoint: string = import.meta.env.VITE_FORM_ENDPOINT || '';
export const analyticsSrc: string = import.meta.env.VITE_ANALYTICS_SRC || '';
