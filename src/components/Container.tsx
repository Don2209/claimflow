import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export function Container({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props} className={cn('mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8', className)} />
  );
}
