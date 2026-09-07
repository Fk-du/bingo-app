'use client';

/**
 * Interactive 5x5 board for drawing a custom winning pattern.
 * The centre cell is always shown as free (gold) and cannot be toggled.
 */
export function PatternBoardEditor({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="inline-grid grid-cols-5 gap-1 rounded-xl border border-bp-border bg-bp-bg p-2">
      {Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5);
        const c = i % 5;
        const key = `${r},${c}`;
        const isFree = r === 2 && c === 2;
        const on = selected.has(key);
        return (
          <button
            key={key}
            type="button"
            disabled={isFree}
            aria-label={`Cell row ${r + 1} column ${c + 1}`}
            aria-pressed={isFree || on}
            onClick={() => onToggle(key)}
            className={`h-6 w-6 rounded-[5px] transition ${
              isFree
                ? 'bg-bp-gold/70'
                : on
                  ? 'bg-bp-primary shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                  : 'bg-bp-surface-elevated hover:bg-bp-primary/30'
            }`}
          />
        );
      })}
    </div>
  );
}
