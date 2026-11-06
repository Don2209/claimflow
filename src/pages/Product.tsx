import { Check } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import {
  ChecklistBuilderMock,
  ClaimSummaryMock,
  ClaimsQueueMock,
  ClassifyMock,
  DashboardMock,
  EmailIntakeMock,
  ExportMock,
  ExtractMock,
  FlagsMock,
  MissingDocsEmailMock,
  PortalChecklistMock,
} from '@/components/mocks';
import { Photo } from '@/components/Photo';
import { Seo } from '@/components/Seo';
import {
  capabilities,
  productCta,
  productDemo,
  productHero,
  productMeta,
  type ProductMock,
} from '@/content/product';
import { ctas } from '@/content/site';
import { cn } from '@/lib/cn';
import { CtaBand } from '@/sections/shared/CtaBand';
import { DemoSection } from '@/sections/shared/DemoSection';

const mocks: Record<ProductMock, ComponentType> = {
  intake: EmailIntakeMock,
  portal: PortalChecklistMock,
  classify: ClassifyMock,
  extract: ExtractMock,
  builder: ChecklistBuilderMock,
  flags: FlagsMock,
  draft: MissingDocsEmailMock,
  summary: ClaimSummaryMock,
  export: ExportMock,
  dashboard: DashboardMock,
};

export default function Product() {
  return (
    <>
      <Seo {...productMeta} path="/product" />
      <div className="ink relative isolate overflow-hidden">
        <Photo
          id="sign"
          alt=""
          sizes="100vw"
          priority
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h1 className="text-display-lg">{productHero.title}</h1>
            <p className="mt-5 max-w-2xl text-lead text-muted">{productHero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to={ctas.demo.to} size="lg">
                {ctas.demo.label}
              </Button>
              <Button href="#try-it" size="lg" variant="secondary">
                {productDemo.title}
              </Button>
            </div>
          </div>
          <ClaimsQueueMock />
        </Container>
      </div>

      <Container>
        {capabilities.map((capability, index) => {
          const Mock = mocks[capability.mock];
          return (
            <section
              key={capability.id}
              id={capability.id}
              aria-labelledby={`${capability.id}-title`}
              className={cn(
                'grid items-center gap-8 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16',
                index > 0 && 'border-t border-line',
              )}
            >
              <div className={cn(index % 2 === 1 && 'lg:order-2')}>
                <h2 id={`${capability.id}-title`} className="text-display-md">
                  {capability.title}
                </h2>
                <p className="mt-3 text-lead text-muted">{capability.lead}</p>
                <ul className="mt-5 max-w-prose space-y-2.5">
                  {capability.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5">
                      <Check
                        aria-hidden="true"
                        strokeWidth={3}
                        className="mt-1 size-4 shrink-0 text-ok"
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <Mock />
              </div>
            </section>
          );
        })}
      </Container>

      <DemoSection {...productDemo} />
      <CtaBand {...productCta} primary={ctas.demo} secondary={ctas.pilot} />
    </>
  );
}
