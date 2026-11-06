import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Photo } from '@/components/Photo';
import { pilotBand } from '@/content/home';
import { ctas } from '@/content/site';

export function PilotBand() {
  return (
    <section aria-labelledby="pilot-band-title" className="ink relative isolate overflow-hidden">
      <Photo
        id="jacaranda-avenue"
        alt=""
        sizes="100vw"
        className="absolute inset-0 -z-20 size-full object-cover"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />
      <Container className="py-section">
        <h2 id="pilot-band-title" className="max-w-4xl text-display-xl">
          {pilotBand.title}
        </h2>
        <p className="mt-6 max-w-2xl text-lead">{pilotBand.body}</p>
        <ol className="mt-12 grid max-w-5xl gap-2 sm:grid-cols-12">
          {pilotBand.phases.map((phase, index) => (
            <li
              key={phase.label}
              style={{ gridColumn: `span ${phase.span}` }}
              className="max-sm:!col-auto"
            >
              <div className={index === 1 ? 'h-3 bg-primary' : 'h-3 bg-fg/50'} />
              <p className="mt-2 text-caption font-medium">{phase.label}</p>
              <p className="text-caption">{phase.weeks}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3">
          <Button to={ctas.pilot.to} size="lg" className="max-sm:w-full">
            {ctas.pilot.label}
          </Button>
          <Button to={ctas.demo.to} size="lg" variant="secondary" className="max-sm:w-full">
            {ctas.demo.label}
          </Button>
        </div>
      </Container>
    </section>
  );
}
