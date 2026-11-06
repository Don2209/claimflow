import type { ReactNode } from 'react';

/** True on the local dev server, where the team needs reminding of what is still missing. */
export const showPlaceholders = import.meta.env.DEV;

/** Marks content the site owner must still supply, on the dev server only. All are listed in the README. */
export function Placeholder({ children }: { children: ReactNode }) {
  if (!showPlaceholders) return null;
  return (
    <span className="inline-block rounded-sm border border-dashed border-warn bg-warn-soft px-1.5 py-0.5 text-small text-warn">
      {children}
    </span>
  );
}
