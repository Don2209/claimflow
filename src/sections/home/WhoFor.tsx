import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Photo } from '@/components/Photo';
import { Section } from '@/components/Section';
import { Tabs } from '@/components/Tabs';
import { whoFor } from '@/content/home';

export function WhoFor() {
  return (
    <Section tone="surface" title={whoFor.title}>
      <Tabs
        label="Who ClaimsFlow is for"
        items={whoFor.tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          content: (
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <h3 className="text-display-sm">{tab.title}</h3>
                <p className="mt-3 max-w-prose text-lead text-muted">{tab.body}</p>
                <p className="mt-5">
                  <Link to={tab.link.to} className="text-link">
                    {tab.link.label}
                  </Link>
                </p>
              </div>
              <div>
                <Photo
                  id={tab.photo}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="mb-6 aspect-[16/9] w-full object-cover"
                />
                <ul className="space-y-3">
                  {tab.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <Check
                        aria-hidden="true"
                        strokeWidth={3}
                        className="mt-1 size-4 shrink-0 text-ok"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ),
        }))}
      />
    </Section>
  );
}
