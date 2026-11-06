import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface AccordionItem {
  question: string;
  answer: ReactNode;
}

export function Accordion({
  items,
  headingLevel = 'h3',
}: {
  items: AccordionItem[];
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t border-line">
      {items.map((item, index) => {
        const expanded = open === index;
        const buttonId = `${baseId}-button-${index}`;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={item.question} className="border-b border-line">
            <Heading className="text-body">
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-lead font-medium hover:text-ok"
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-5 shrink-0 text-muted transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                'grid transition-[grid-template-rows] duration-200',
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className={cn('overflow-hidden', !expanded && 'invisible')}>
                <div className="max-w-prose pb-6 text-muted">{item.answer}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
