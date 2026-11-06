import { AlertTriangle } from 'lucide-react';
import { Container } from '@/components/Container';
import { Seo } from '@/components/Seo';
import type { LegalDocument } from '@/content/legal';

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <>
      <Seo {...document.meta} path={document.path} />
      <Container className="py-14 sm:py-20">
        <div className="max-w-prose">
          <h1 className="text-display-lg">{document.title}</h1>
          <p className="mt-6 flex gap-3 rounded-lg border border-dashed border-warn bg-warn-soft p-4 text-small text-warn">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {document.notice}
          </p>
          {document.sections.map((section) => (
            <section key={section.title} className="mt-10">
              <h2 className="text-display-sm">{section.title}</h2>
              <p className="mt-2 text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
