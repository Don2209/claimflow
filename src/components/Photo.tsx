import { photos, type PhotoId } from '@/content/photos';
import { siteBase } from '@/i18n/languages';

const urlFor = (id: PhotoId, width: number) => `${siteBase}/photos/${id}-${width}.webp`;

/** The list of files for one photo, for an <img> or a preload link. */
export function photoSrcSet(id: PhotoId) {
  const widths: readonly number[] = photos[id].widths;
  return widths.map((width) => `${urlFor(id, width)} ${width}w`).join(', ');
}

/** A responsive photo from public/photos. Pass `alt=""` when the photo is purely decorative. */
export function Photo({
  id,
  sizes,
  alt,
  priority,
  className,
}: {
  id: PhotoId;
  /** How wide the image renders, so the browser can pick the smallest file that works. */
  sizes: string;
  alt?: string;
  /** Load straight away. Only for the photo at the top of a page. */
  priority?: boolean;
  className?: string;
}) {
  const photo = photos[id];
  const widths: readonly number[] = photo.widths;
  return (
    <img
      src={urlFor(id, widths[widths.length - 1])}
      srcSet={photoSrcSet(id)}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt ?? photo.alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...(priority ? { fetchpriority: 'high' } : {})}
      className={className}
    />
  );
}
