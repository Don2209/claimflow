import { Check, UserCheck } from 'lucide-react';
import { Container } from '@/components/Container';
import { humanInLoop } from '@/content/home';

/** The one section with no picture: the statement is the picture. */
export function HumanInLoop() {
  const columns = [
    { ...humanInLoop.prepares, Icon: Check },
    { ...humanInLoop.decides, Icon: UserCheck },
  ];
  return (
    <section aria-labelledby="human-title" className="ink py-section">
      <Container>
        <h2 id="human-title" className="text-display-xl">
          {humanInLoop.statement.map((sentence, index) => (
            <span key={sentence} className={index === 2 ? 'block text-primary' : 'block'}>
              {sentence}
            </span>
          ))}
        </h2>
        <div className="mt-12 grid gap-10 border-t border-line pt-10 md:grid-cols-2 lg:mt-16">
          {columns.map(({ title, items, Icon }) => (
            <div key={title}>
              <h3 className="text-display-sm">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Icon aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
