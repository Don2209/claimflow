import { Link } from 'react-router-dom';
import { contact, footer, placeholderText } from '@/content/site';
import { Container } from './Container';
import { Logo } from './Logo';
import { Photo } from './Photo';
import { Placeholder } from './Placeholder';

export function Footer() {
  return (
    <footer className="ink">
      <div className="relative isolate overflow-hidden">
        <Photo
          id="jacaranda-wide"
          alt=""
          sizes="100vw"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div aria-hidden="true" className="photo-scrim absolute inset-0 -z-10" />
        <Container className="pb-8 pt-40 sm:pt-56">
          <p className="text-display-xl">{footer.madeIn}</p>
        </Container>
      </div>
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-small text-muted">{footer.blurb}</p>
            <ul className="mt-5 space-y-2 text-small">
              <li>
                <a className="text-link" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </li>
              <li className="empty:hidden">
                {contact.linkedinUrl ? (
                  <a className="text-link" href={contact.linkedinUrl} rel="noopener noreferrer">
                    LinkedIn
                  </a>
                ) : (
                  <Placeholder>{placeholderText.linkedin}</Placeholder>
                )}
              </li>
            </ul>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footer.columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-small font-semibold [font-stretch:100%]">{column.title}</h2>
                <ul className="mt-3 space-y-1">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="inline-block py-1 text-small text-muted transition-colors hover:text-fg"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-12 space-y-2 border-t border-line pt-6 text-caption text-muted">
          <p className="max-w-3xl">{footer.disclosure}</p>
          <p>{footer.company}</p>
        </div>
      </Container>
    </footer>
  );
}
