import { Moon, Sun } from 'lucide-react';
import { ui } from '@/content/site';

export function ThemeToggle() {
  const toggle = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('claimsflow-theme', dark ? 'dark' : 'light');
    } catch {
      // Storage can be blocked. The theme still applies for this page view.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ui.themeToggle}
      className="inline-flex size-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-fg/5 hover:text-fg"
    >
      {/* Icons swap in CSS so the prerendered markup never disagrees with the visitor's theme. */}
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
    </button>
  );
}
