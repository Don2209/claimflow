import type { CSSProperties, ReactNode } from 'react';
import type { PhotoId } from '@/content/photos';
import { cn } from '@/lib/cn';
import { Photo } from './Photo';

/** A photo printed for the claim file, with an optional note in the handler's red pen. */
export function Print({
  id,
  sizes,
  alt,
  note,
  tilt = 0,
  priority,
  className,
  frameClassName,
  children,
}: {
  id: PhotoId;
  sizes: string;
  alt?: string;
  note?: ReactNode;
  tilt?: number;
  priority?: boolean;
  className?: string;
  frameClassName?: string;
  /** Marks drawn over the photo. */
  children?: ReactNode;
}) {
  return (
    <figure className={cn('print', className)} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      <div className={cn('relative overflow-hidden', frameClassName)}>
        <Photo
          id={id}
          sizes={sizes}
          alt={alt}
          priority={priority}
          className="size-full object-cover"
        />
        {children}
      </div>
      {note && <figcaption className="pen px-1 pb-1 pt-2.5">{note}</figcaption>}
    </figure>
  );
}
