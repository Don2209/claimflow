import { AlertTriangle, Check, Circle, XOctagon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ItemStatus = 'pending' | 'ok' | 'warn' | 'danger';

/** State is always carried by the icon shape as well as the colour. */
export function StatusIcon({ status, className }: { status: ItemStatus; className?: string }) {
  const classes = cn('size-4 shrink-0', className);
  switch (status) {
    case 'ok':
      return <Check aria-hidden="true" strokeWidth={3} className={cn(classes, 'text-ok')} />;
    case 'warn':
      return <AlertTriangle aria-hidden="true" className={cn(classes, 'text-warn')} />;
    case 'danger':
      return <XOctagon aria-hidden="true" className={cn(classes, 'text-danger')} />;
    default:
      return <Circle aria-hidden="true" className={cn(classes, 'text-line-strong')} />;
  }
}
