import { Link } from 'react-router-dom';
import { Accordion } from '@/components/Accordion';
import { Container } from '@/components/Container';
import { faqs } from '@/content/faq';
import { faqSection } from '@/content/home';

export function FaqTeaser() {
  return (
    <section aria-labelledby="faq-title" className="py-section">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <h2 id="faq-title" className="text-display-md">
            {faqSection.title}
          </h2>
          <p className="mt-4">
            <Link to="/faq" className="text-link">
              {faqSection.link}
            </Link>
          </p>
        </div>
        <Accordion items={faqs.slice(0, 6)} />
      </Container>
    </section>
  );
}
