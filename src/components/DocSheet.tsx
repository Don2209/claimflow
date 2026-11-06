import { cn } from '@/lib/cn';

/**
 * A small mock document. `variant` changes the page furniture so a stack of them
 * reads as different paperwork. Always watermarked SAMPLE.
 */
export type DocVariant = 'form' | 'handwritten' | 'card' | 'letter' | 'table' | 'certificate';

function Line({ width, strong }: { width: string; strong?: boolean }) {
  return (
    <div
      className={cn('h-[3px] rounded-full', strong ? 'bg-paper-ink/70' : 'bg-paper-ink/25')}
      style={{ width }}
    />
  );
}

function Scribble({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('h-1.5 w-full', className)}
    >
      <path
        d="M1 5c5-5 7 3 11 0s5-4 8 0 6 2 9-1 5 3 9 1 5-3 8 0 7 1 10-1 5 2 8 1 6-2 15-1"
        fill="none"
        stroke="#23457a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Furniture({ variant }: { variant: DocVariant }) {
  switch (variant) {
    case 'handwritten':
      return (
        <div className="space-y-[7px]">
          <Line width="55%" strong />
          {['70%', '90%', '60%', '85%', '75%', '50%'].map((width) => (
            <div key={width} className="border-b border-paper-ink/20 pb-px">
              <div style={{ width }}>
                <Scribble />
              </div>
            </div>
          ))}
        </div>
      );
    case 'card':
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <div className="size-6 shrink-0 rounded-[2px] bg-paper-ink/20" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Line width="80%" strong />
              <Line width="60%" />
              <Line width="70%" />
            </div>
          </div>
          <Line width="100%" />
          <Line width="66%" />
          <Line width="88%" />
        </div>
      );
    case 'table':
      return (
        <div className="space-y-2">
          <Line width="45%" strong />
          <div className="space-y-1.5 border-y border-paper-ink/25 py-1.5">
            {['90%', '74%', '82%', '68%'].map((width) => (
              <div key={width} className="flex justify-between gap-2">
                <Line width={width} />
                <div className="h-[3px] w-3 shrink-0 rounded-full bg-paper-ink/50" />
              </div>
            ))}
          </div>
          <div className="ml-auto h-1 w-1/3 rounded-full bg-paper-ink/70" />
        </div>
      );
    case 'certificate':
      return (
        <div className="space-y-2 rounded-[2px] border border-paper-ink/30 p-1.5">
          <div className="mx-auto h-1 w-1/2 rounded-full bg-paper-ink/70" />
          <Line width="100%" />
          <Line width="85%" />
          <Line width="92%" />
          <div className="ml-auto mt-1 size-4 rounded-full border border-paper-ink/40" />
        </div>
      );
    case 'letter':
      return (
        <div className="space-y-1.5">
          <Line width="40%" strong />
          <div className="h-1" />
          {['100%', '94%', '98%', '88%', '96%', '60%'].map((width) => (
            <Line key={width} width={width} />
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          <Line width="60%" strong />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-[1fr_1.6fr] gap-1.5">
              <Line width="100%" />
              <div className="h-1.5 rounded-[1px] border border-paper-ink/25" />
            </div>
          ))}
        </div>
      );
  }
}

export function DocSheet({ variant, className }: { variant: DocVariant; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('sheet p-2', className)}>
      <Furniture variant={variant} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="-rotate-[24deg] text-[0.625rem] font-bold tracking-[0.14em] text-paper-ink/70">
          SAMPLE
        </span>
      </span>
    </div>
  );
}
