interface BingoCardProps {
  numbers: number[][];
  calledNumbers: Set<number>;
  isWinner?: boolean;
  /** When false players daub cells themselves; calledNumbers is not highlighted. */
  autoMark?: boolean;
  markedNumbers?: Set<number>;
  onToggleMark?: (n: number) => void;
  /** 'lg' keeps the original roomier cells (used in modals); 'md'/'sm' are more compact. */
  size?: 'sm' | 'md' | 'lg';
}

const letters = ['B', 'I', 'N', 'G', 'O'];
const letterColors = [
  'bg-gradient-to-b from-bp-primary/30 to-bp-primary/10 text-bp-primary border-bp-primary/20',
  'bg-gradient-to-b from-emerald-500/30 to-emerald-500/10 text-emerald-300 border-emerald-500/20',
  'bg-gradient-to-b from-amber-500/30 to-amber-500/10 text-amber-300 border-amber-500/20',
  'bg-gradient-to-b from-bp-gold/30 to-bp-gold/10 text-bp-gold border-bp-gold/20',
  'bg-gradient-to-b from-rose-500/30 to-rose-500/10 text-red-300 border-rose-500/20',
];

export function BingoCard({
  numbers,
  calledNumbers,
  isWinner,
  autoMark = true,
  markedNumbers,
  onToggleMark,
  size = 'md',
}: BingoCardProps) {
  const manual = !autoMark;
  const pad = size === 'lg' ? 'p-3' : size === 'md' ? 'p-2' : 'p-1.5';
  const gap = size === 'lg' ? 'gap-1.5' : 'gap-1';
  const cellRadius = size === 'lg' ? 'rounded-xl' : 'rounded-lg';
  const cellText = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[11px]';
  return (
    <div className={`w-full rounded-2xl border bg-bp-bg transition-all ${pad} ${isWinner ? 'border-bp-success/50 shadow-[0_0_24px_rgba(39,174,96,0.25)]' : 'border-bp-border'}`}>
      <div className={`grid grid-cols-5 ${gap}`}>
        {letters.map((letter, index) => (
          <div
            key={letter}
            className={`flex aspect-square items-center justify-center border font-bold tracking-wider ${cellRadius} ${cellText} ${letterColors[index]}`}
          >
            {letter}
          </div>
        ))}

        {numbers.map((row, ri) =>
          row.map((num, ci) => {
            const isFree = ri === 2 && ci === 2;
            const isCalled = manual
              ? Boolean(markedNumbers?.has(num)) || (isFree && Boolean(markedNumbers?.has(0)))
              : calledNumbers.has(num);
            const callIndex = !manual && isCalled ? [...calledNumbers].indexOf(num) : -1;
            const clickable = manual && onToggleMark && !isWinner;
            return (
              <div
                key={`${ri}-${ci}`}
                className={`flex aspect-square items-center justify-center border font-semibold transition-all duration-300 ${cellRadius} ${cellText} ${
                  isFree
                    ? 'border-bp-gold/40 bg-gradient-to-br from-bp-gold/30 to-bp-gold/10 text-bp-gold shadow-[inset_0_0_12px_rgba(242,201,76,0.15)]'
                    : isCalled
                      ? 'border-bp-danger/50 bg-gradient-to-br from-bp-danger to-bp-danger/80 text-white shadow-[0_0_10px_rgba(235,87,87,0.4)]'
                      : 'border-bp-border bg-gradient-to-b from-bp-surface-elevated to-bp-surface text-bp-text hover:border-bp-primary/30'
                }`}
                style={isCalled ? { animation: `bp-number-pop 0.3s ease-out ${callIndex * 0.02}s both` } : undefined}
                onClick={clickable ? () => onToggleMark(isFree ? 0 : num) : undefined}
                role={clickable ? 'button' : undefined}
                aria-label={clickable ? `${isFree ? 'free' : num}` : undefined}
              >
                {isFree ? '★' : num}
              </div>
            );
          })
        )}
      </div>

      {isWinner && (
        <div className="mt-3 rounded-xl border border-bp-success/40 bg-gradient-to-r from-bp-success/15 via-bp-success/10 to-bp-success/15 px-4 py-3 text-center text-sm font-bold text-emerald-300 bp-card-reveal">
          🎉 Bingo confirmed! 🎉
        </div>
      )}
    </div>
  );
}
