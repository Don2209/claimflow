import { cn } from '@/lib/cn';

/** Two sheets of a claim file, the front one ticked. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7', className)}>
      <rect x="9" y="2.5" width="19" height="23" rx="3" fill="currentColor" opacity="0.28" />
      <rect x="4" y="6.5" width="19" height="23" rx="3" fill="rgb(var(--primary))" />
      <path
        d="m9 18.5 3.6 3.6L18.5 14"
        fill="none"
        stroke="rgb(var(--on-primary))"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-[1.625rem] font-extrabold leading-none">
      <LogoMark />
      ClaimsFlow
    </span>
  );
}
