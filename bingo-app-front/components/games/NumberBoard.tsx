'use client';

import { Surface } from '@/components/ui/Surface';

const RANGES = [
  { letter: 'B', min: 1, max: 15, tone: 'cyan' },
  { letter: 'I', min: 16, max: 30, tone: 'emerald' },
  { letter: 'N', min: 31, max: 45, tone: 'violet' },
  { letter: 'G', min: 46, max: 60, tone: 'amber' },
  { letter: 'O', min: 61, max: 75, tone: 'rose' },
] as const;

interface NumberBoardProps {
  calledNumbers: Set<number>;
  /** The most recently called number, drawn with a distinct highlight. */
  lastCalledNumber?: number | null;
  /** compact tightens spacing/cell size for side-by-side layouts. */
  compact?: boolean;
}

export function NumberBoard({ calledNumbers, lastCalledNumber = null, compact = false }: NumberBoardProps) {
  const headH = compact ? 'h-6' : 'h-9';
  const headText = compact ? 'text-xs' : 'text-sm';
  const cellH = compact ? 'h-[18px]' : 'h-5 sm:h-6';
  const cellText = compact ? 'text-[9px]' : 'text-[10px]';
  const gap = compact ? 'gap-0.5' : 'gap-1';
  const colGap = compact ? 'space-y-0.5' : 'space-y-1';
  const corner = compact ? 'rounded-md' : 'rounded-lg';
  return (
    <Surface className={compact ? 'p-2' : 'p-3'}>
      <h3 className={`${compact ? 'mb-1.5 text-[11px]' : 'mb-3 text-xs'} text-center font-semibold uppercase tracking-[0.24em] text-bp-muted`}>
        Number Board
      </h3>
      <div className={`grid grid-cols-5 ${gap}`}>
        {RANGES.map(({ letter, min, max, tone }) => (
          <div key={letter} className={colGap}>
            <div
              className={`flex ${headH} items-center justify-center border font-semibold uppercase tracking-[0.2em] ${corner} ${headText} ${
                tone === 'cyan'
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                  : tone === 'emerald'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : tone === 'violet'
                      ? 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                      : tone === 'amber'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}
            >
              {letter}
            </div>
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => {
              const isCalled = calledNumbers.has(n);
              const isLast = n === lastCalledNumber;
              return (
                <div
                  key={n}
                  className={`flex ${cellH} items-center justify-center border leading-none ${corner} ${cellText} ${
                    isLast
                      ? 'scale-110 border-amber-300/70 bg-amber-400/40 font-bold text-white shadow-[0_0_10px] shadow-amber-400/40'
                      : isCalled
                        ? 'border-emerald-400/30 bg-emerald-500/20 font-semibold text-emerald-100'
                        : 'border-bp-border bg-bp-surface/60 text-bp-muted'
                  }`}
                >
                  {n}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Surface>
  );
}
