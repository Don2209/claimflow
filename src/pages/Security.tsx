import { CalendarClock, History, Lock, UserCheck, Users } from 'lucide-react';
import { Container } from '@/components/Container';
import { Section } from '@/components/Section';
import { Seo } from '@/components/Seo';
import { securityMeta, securityPage as page } from '@/content/security';
import { CtaBand } from '@/sections/shared/CtaBand';
import { PageHero } from '@/sections/shared/PageHero';

const controlIcons = { lock: Lock, users: Users, history: History, calendar: CalendarClock };

export default function Security() {
  return (
    <>
      <Seo {...securityMeta} path="/security" />
      <PageHero title={page.title} lead={page.lead} photo="cabinets" />

      <Section tone="sun" className="!py-14 sm:!py-20">
        <div className="flex max-w-3xl items-start gap-4">
          <UserCheck aria-hidden="true" className="mt-1 size-7 shrink-0" />
          <div>
            <h2 className="text-display-md">{page.principle.title}</h2>
            <p className="mt-3 text-lead text-muted">{page.principle.body}</p>
          </div>
        </div>
      </Section>

      <Section compact title={page.hosting.title} lead={page.hosting.lead}>
        <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          {page.hosting.options.map((option) => (
            <li key={option.title} className="bg-surface p-6">
              <h3 className="text-display-sm">{option.title}</h3>
              <p className="mt-2 text-muted">{option.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section compact tone="surface" title={page.controls.title}>
        <ul className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {page.controls.items.map((item) => {
            const Icon = controlIcons[item.icon as keyof typeof controlIcons];
            return (
              <li key={item.title} className="flex items-start gap-4">
                <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted" />
                <div>
                  <h3 className="text-display-sm">{item.title}</h3>
                  <p className="mt-1 text-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Container className="grid gap-12 pt-section lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
        <section aria-labelledby="law-title">
          <h2 id="law-title" className="text-display-md">
            {page.law.title}
          </h2>
          <div className="mt-5 max-w-prose space-y-4">
            {page.law.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
        <section aria-labelledby="training-title" className="sun self-start p-6 sm:p-7">
          <h2 id="training-title" className="text-display-sm">
            {page.training.title}
          </h2>
          <p className="mt-2">{page.training.body}</p>
        </section>
      </Container>

      <CtaBand
        title={page.ask.title}
        body={page.ask.body}
        primary={{ label: page.ask.button, to: '/demo' }}
      />
    </>
  );
}
