import { ArrowDown, ArrowRight, Database, Inbox, Upload, UserCheck } from 'lucide-react';
import { LogoMark } from '@/components/Logo';
import { Section } from '@/components/Section';
import { systems } from '@/content/home';

function Connector() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center text-line-strong">
      <ArrowRight className="hidden size-6 lg:block" />
      <ArrowDown className="size-6 lg:hidden" />
    </div>
  );
}

function Node({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-4">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-small text-muted">{body}</p>
      </div>
    </div>
  );
}

export function WorksWithSystems() {
  return (
    <Section tone="surface" title={systems.title} lead={systems.lead}>
      <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)_auto_minmax(0,1fr)] lg:gap-5">
        <div className="space-y-3">
          <Node icon={<Inbox aria-hidden="true" className="size-5" />} {...systems.sources[0]} />
          <Node icon={<Upload aria-hidden="true" className="size-5" />} {...systems.sources[1]} />
        </div>
        <Connector />
        <div className="ink rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <p className="text-display-sm font-semibold [font-stretch:86%]">
              {systems.middle.title}
            </p>
          </div>
          <p className="mt-2 text-small text-muted">{systems.middle.body}</p>
          <div className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-small">
            <UserCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ok" />
            <p>
              <span className="font-medium">{systems.people.title}.</span>{' '}
              <span className="text-muted">{systems.people.body}.</span>
            </p>
          </div>
        </div>
        <Connector />
        <Node icon={<Database aria-hidden="true" className="size-5" />} {...systems.destination} />
      </div>
    </Section>
  );
}
