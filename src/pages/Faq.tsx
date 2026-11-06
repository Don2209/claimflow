import { Accordion } from '@/components/Accordion';
import { Container } from '@/components/Container';
import { Seo } from '@/components/Seo';
import { faqMeta, faqPage, faqs } from '@/content/faq';
import { ctas } from '@/content/site';
import { CtaBand } from '@/sections/shared/CtaBand';
import { PageHero } from '@/sections/shared/PageHero';

export default function Faq() {
  return (
    <>
      <Seo {...faqMeta} path="/faq" />
      <PageHero title={faqPage.title} lead={faqPage.lead} photo="gallery" />
      <Container className="pt-14 sm:pt-20">
        <div className="max-w-4xl">
          <Accordion items={faqs} headingLevel="h2" />
        </div>
      </Container>
      <CtaBand
        title="Still have a question?"
        body="Twenty minutes is usually enough to answer it."
        primary={ctas.demo}
        secondary={ctas.pilot}
      />
    </>
  );
}
