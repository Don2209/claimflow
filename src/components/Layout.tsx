import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ui } from '@/content/site';
import { isTranslated, lang } from '@/i18n/languages';
import { Container } from './Container';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const shownPath = useRef(pathname);

  // After in-site navigation, start at the top with keyboard focus at the start of the new page.
  useEffect(() => {
    if (shownPath.current === pathname) return;
    shownPath.current = pathname;
    window.scrollTo({ top: 0, behavior: 'instant' });
    main.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a
        href="#main"
        className="fixed left-4 top-2 z-50 -translate-y-20 rounded-md bg-primary px-4 py-2 font-medium text-on-primary focus:translate-y-0"
      >
        {ui.skip}
      </a>
      <Navbar />
      {lang !== 'en' && !isTranslated(pathname) && (
        <div lang={lang} className="sun py-2 text-small font-medium">
          <Container>{ui.englishOnly}</Container>
        </div>
      )}
      <main ref={main} id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
