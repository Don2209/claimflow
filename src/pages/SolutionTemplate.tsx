import { Check } from 'lucide-react';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { ChecklistBuilderMock, ClaimSummaryMock, PortalChecklistMock } from '@/components/mocks';
import { Section } from '@/components/Section';
import { Seo } from '@/components/Seo';
import type { SolutionPage } from '@/content/solutions';
import { CtaBand } from '@/sections/shared/CtaBand';
import { PageHero } from '@/sections/shared/PageHero';

const mocks = {
  builder: ChecklistBuilderMock,
  portal: PortalChecklistMock,
  summary: ClaimSummaryMock,
};

export function SolutionTemplate({ page }: { page: SolutionPage }) {
  const Mock = mocks[page.mock];
  return (
    <>
      <Seo {...page.meta} path={page.path} />
      <PageHero title={page.title} lead={page.lead} photo={page.photo}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button to={page.cta.primary.to} size="lg">
            {page.cta.primary.label}
          </Button>
          <Button to={page.cta.secondary.to} size="lg" variant="secondary">
            {page.cta.secondary.label}
          </Button>
        </div>
      </PageHero>

      <Container className="pt-section">
        <ul className="grid gap-8 md:grid-cols-3">
          {page.outcomes.map((outcome) => (
            <li key={outcome.title} className="border-t-2 border-fg pt-4">
              <h2 className="text-display-sm">{outcome.title}</h2>
              <p className="mt-2 text-muted">{outcome.body}</p>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="grid items-center gap-8 pt-section lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-display-md">{page.mockTitle}</h2>
          <p className="mt-4 max-w-prose text-lead text-muted">{page.mockBody}</p>
        </div>
        <div className="min-w-0">
          <Mock />
        </div>
      </Container>

      {page.checklists && page.checklistIntro && (
        <Section
          compact
          className="mt-section"
          tone="surface"
          title={page.checklistIntro.title}
          lead={page.checklistIntro.lead}
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {page.checklists.map((list) => (
              <li key={list.title} className="rounded-lg border border-line p-4">
                <h3 className="text-body">{list.title}</h3>
                <ul className="mt-3 space-y-2 text-small">
                  {list.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check
                        aria-hidden="true"
                        strokeWidth={3}
                        className="mt-0.5 size-4 shrink-0 text-ok"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Container className="grid gap-8 pt-section lg:grid-cols-2 lg:gap-16">
        <h2 className="text-display-md">{page.steps.title}</h2>
        <ol className="space-y-4">
          {page.steps.items.map((item, index) => (
            <li key={item} className="flex gap-4">
              <span className="tabular inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-caption font-semibold">
                {index + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </Container>

      <CtaBand {...page.cta} />
    </>
  );
}
