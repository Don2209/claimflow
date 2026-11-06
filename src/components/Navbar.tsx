import { ChevronDown, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ctas, mainNav, solutionsNav, ui } from '@/content/site';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Container } from './Container';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-small font-medium transition-colors hover:text-fg',
    isActive ? 'text-fg' : 'text-muted',
  );

function SolutionsMenu() {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(event) => {
        if (!wrapper.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="solutions-menu"
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-3 py-2 text-small font-medium transition-colors hover:text-fg',
          pathname.startsWith('/solutions') ? 'text-fg' : 'text-muted',
        )}
      >
        {ui.solutions}
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      <div
        id="solutions-menu"
        hidden={!open}
        className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-line bg-surface p-2 shadow-window"
      >
        <ul>
          {solutionsNav.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 hover:bg-fg/5"
              >
                <span className="block text-small font-medium">{item.label}</span>
                <span className="block text-caption text-muted">{item.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileMenu({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('a')?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>('a, button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const itemClass =
    'flex min-h-12 items-center rounded-md px-2 text-lead font-medium hover:bg-fg/5';

  return (
    <div
      ref={panel}
      id="mobile-menu"
      className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-canvas px-4 pb-8 pt-4 xl:hidden"
    >
      <nav aria-label="Mobile">
        <Link to="/product" onClick={onNavigate} className={itemClass}>
          {mainNav[0].label}
        </Link>
        <p className="mt-4 px-2 text-small text-muted">{ui.solutions}</p>
        <ul className="mb-4">
          {solutionsNav.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={onNavigate} className={itemClass}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {mainNav
          .filter((item) => item.to !== '/product')
          .map((item) => (
            <Link key={item.to} to={item.to} onClick={onNavigate} className={itemClass}>
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="mt-6 grid gap-3">
        <Button to={ctas.demo.to} size="lg" onClick={onNavigate}>
          {ctas.demo.label}
        </Button>
        <Button to={ctas.pilot.to} variant="secondary" size="lg" onClick={onNavigate}>
          {ctas.pilot.label}
        </Button>
      </div>
    </div>
  );
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);

  const closeMenu = useRef(() => {
    setMenuOpen(false);
    menuButton.current?.focus();
  }).current;

  return (
    <header className="ink sticky top-0 z-40">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" aria-label="ClaimsFlow home" className="rounded-md">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center xl:flex">
            <NavLink to="/product" className={linkClass}>
              {mainNav[0].label}
            </NavLink>
            <SolutionsMenu />
            {mainNav
              .filter((item) => item.to !== '/product')
              .map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <span className="max-[359px]:hidden">
            <ThemeToggle />
          </span>
          <Button to={ctas.demo.to} className="ml-2 hidden xl:inline-flex">
            {ctas.demo.label}
          </Button>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-fg/5 xl:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-6" />
            ) : (
              <Menu aria-hidden="true" className="size-6" />
            )}
          </button>
        </div>
      </Container>
      {menuOpen && <MobileMenu onClose={closeMenu} onNavigate={() => setMenuOpen(false)} />}
    </header>
  );
}
