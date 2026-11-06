import { Languages } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ui } from '@/content/site';
import { lang, languages, pathInLanguage, siteBase } from '@/i18n/languages';

/** Each language is its own prerendered site, so switching is a normal page load. */
export function LanguageSwitcher() {
  const { pathname } = useLocation();
  return (
    <label className="relative flex items-center text-muted hover:text-fg">
      <span className="sr-only">{ui.language}</span>
      <Languages aria-hidden="true" className="pointer-events-none absolute left-2 size-4" />
      <select
        value={lang}
        onChange={(event) =>
          window.location.assign(`${siteBase}${pathInLanguage(event.target.value, pathname)}`)
        }
        className="h-10 w-[6.75rem] cursor-pointer appearance-none rounded-md bg-transparent pl-7 pr-1 text-small font-medium hover:bg-fg/5 max-[359px]:w-[4.75rem] sm:w-32"
      >
        {languages.map(({ code, name }) => (
          <option key={code} value={code} lang={code} className="bg-surface text-fg">
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
