import { History, Lock, Server, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/Container';
import { securityTeaser } from '@/content/home';

const icons = [Server, History, Users, Lock];

export function SecurityTeaser() {
  return (
    <section aria-labelledby="security-title" className="py-section">
      <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 id="security-title" className="text-display-md">
            {securityTeaser.title}
          </h2>
          <p className="mt-5 max-w-prose text-lead text-muted">{securityTeaser.lead}</p>
          <p className="mt-6">
            <Link to="/security" className="text-link">
              {securityTeaser.link}
            </Link>
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {securityTeaser.points.map((point, index) => {
            const Icon = icons[index];
            return (
              <li key={point.title} className="flex items-start gap-4 py-4">
                <Icon aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted" />
                <div>
                  <h3 className="text-body [font-stretch:100%]">{point.title}</h3>
                  <p className="text-muted">{point.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
