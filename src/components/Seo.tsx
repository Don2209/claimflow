import { Helmet } from 'react-helmet-async';
import {
  isDraftLanguage,
  lang,
  langPrefix,
  languages,
  pathInLanguage,
  translatedRoutes,
} from '@/i18n/languages';
import { siteUrl } from '@/lib/site';

export interface SeoProps {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}

export function Seo({ title, description, path, noindex }: SeoProps) {
  const url = `${siteUrl}${langPrefix}${path === '/' ? (langPrefix ? '/' : '') : path}`;
  const alternates = translatedRoutes.includes(path)
    ? languages.filter((language) => language.reviewed)
    : [];
  const image = `${siteUrl}/og-image.png`;

  return (
    <Helmet htmlAttributes={{ lang: lang === 'en' ? 'en-GB' : lang }}>
      {alternates.map(({ code }) => (
        <link
          key={code}
          rel="alternate"
          hrefLang={code}
          href={`${siteUrl}${pathInLanguage(code, path)}`}
        />
      ))}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {(noindex || isDraftLanguage) && <meta name="robots" content="noindex" />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="ClaimsFlow" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content="ClaimsFlow: AI-assisted claims documentation for insurers"
      />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
