import { UserRound } from 'lucide-react';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Placeholder, showPlaceholders } from '@/components/Placeholder';
import { Section } from '@/components/Section';
import { Seo } from '@/components/Seo';
import { aboutMeta, aboutPage as page } from '@/content/about';
import { ctas } from '@/content/site';
import { PageHero } from '@/sections/shared/PageHero';

export default function About() {
  const { founder } = page;
  return (
    <>
      <Seo {...aboutMeta} path="/about" />
      <PageHero title={page.title} lead={page.lead} photo="first-street" />

      <Container className="grid gap-8 pt-section lg:grid-cols-2 lg:gap-16">
        <h2 className="text-display-md">{page.why.title}</h2>
        <div className="max-w-prose space-y-4 text-lead">
          {page.why.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Container>

      <Section compact title={page.beliefs.title}>
        <ul className="grid gap-8 md:grid-cols-3">
          {page.beliefs.items.map((item) => (
            <li key={item.title} className="border-t-2 border-fg pt-4">
              <h3 className="text-display-sm">{item.title}</h3>
              <p className="mt-2 text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section compact tone="surface" title={founder.title}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {founder.photo ? (
            <img
              src={founder.photo}
              alt={founder.name}
              width={160}
              height={200}
              loading="lazy"
              className="h-50 w-40 rounded-xl object-cover"
            />
          ) : (
            showPlaceholders && (
              <div className="flex h-48 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-warn bg-warn-soft p-3 text-center text-caption text-warn">
                <UserRound aria-hidden="true" className="size-8" />
                {founder.photoPlaceholder}
              </div>
            )
          )}
          <div>
            <h3 className="text-display-sm">{founder.name}</h3>
            <p className="mt-2">
              {founder.role || <Placeholder>{founder.rolePlaceholder}</Placeholder>}
            </p>
            <p className="mt-3 max-w-prose">
              {founder.bio || <Placeholder>{founder.bioPlaceholder}</Placeholder>}
            </p>
          </div>
        </div>
      </Section>

      <Container className="flex flex-col gap-3 py-section sm:flex-row">
        <Button to={ctas.demo.to} size="lg">
          {ctas.demo.label}
        </Button>
        <Button to={ctas.pilot.to} size="lg" variant="secondary">
          {ctas.pilot.label}
        </Button>
      </Container>
    </>
  );
}
