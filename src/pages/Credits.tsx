import { Container } from '@/components/Container';
import { Photo } from '@/components/Photo';
import { Seo } from '@/components/Seo';
import { photos, type PhotoId } from '@/content/photos';

const ids = Object.keys(photos) as PhotoId[];

export default function Credits() {
  return (
    <>
      <Seo
        title="Photo credits | ClaimsFlow"
        description="Credits and licences for the photographs used on the ClaimsFlow website."
        path="/credits"
      />
      <Container className="py-14 sm:py-20">
        <h1 className="text-display-lg">Photo credits</h1>
        <p className="mt-5 max-w-prose text-lead text-muted">
          Photographs on this site are illustrative. They do not show ClaimsFlow customers or their
          claims, and no photographer endorses ClaimsFlow.
        </p>
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {ids.map((id) => {
            const photo = photos[id];
            return (
              <li key={id}>
                <Photo
                  id={id}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[3/2] w-full object-cover"
                />
                <p className="mt-3 text-small">
                  <a className="text-link" href={photo.source} rel="noopener noreferrer">
                    {photo.title}
                  </a>{' '}
                  by {photo.author}.{' '}
                  <a className="text-link" href={photo.licenceUrl} rel="noopener noreferrer">
                    {photo.licence}
                  </a>
                  . {photo.changes}.
                </p>
              </li>
            );
          })}
        </ul>
      </Container>
    </>
  );
}
