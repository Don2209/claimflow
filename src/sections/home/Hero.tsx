import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Photo, photoSrcSet } from '@/components/Photo';
import { hero } from '@/content/home';
import { ctas, statusNote } from '@/content/site';
import { HeroFile } from './HeroFile';
import { HeroMock } from './HeroMock';

export function Hero() {
  return (
    <section aria-labelledby="hero-title">
      <Helmet>
        <link
          rel="preload"
          as="image"
          imageSrcSet={photoSrcSet('jacaranda-wide')}
          imageSizes="100vw"
        />
      </Helmet>
      <div className="ink relative isolate overflow-hidden">
        <Photo
          id="jacaranda-wide"
          alt=""
          sizes="100vw"
          priority
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />
        <Container className="grid items-end gap-12 pb-44 pt-14 sm:pt-20 lg:grid-cols-12 lg:gap-6 lg:pb-64 lg:pt-20">
          <div className="lg:col-span-8">
            <h1 id="hero-title" className="text-display-xl">
              {hero.title}
            </h1>
            <p className="mt-7 max-w-xl text-lead">{hero.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to={ctas.demo.to} size="lg">
                {ctas.demo.label}
              </Button>
              <Button to={ctas.pilot.to} size="lg" variant="secondary">
                {ctas.pilot.label}
              </Button>
            </div>
            <p className="mt-6 text-small">
              <Link
                to="/pilot"
                className="inline-flex items-center gap-2 underline-offset-[3px] hover:underline"
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
                {statusNote}
              </Link>
            </p>
          </div>
          <div className="lg:col-span-4">
            <HeroFile />
          </div>
        </Container>
      </div>
      {/* The product window straddles the photo and the yellow band of the next section. */}
      <div className="sun">
        <Container>
          <div className="daylight relative -mt-32 lg:-mt-44">
            <HeroMock />
          </div>
        </Container>
      </div>
    </section>
  );
}
