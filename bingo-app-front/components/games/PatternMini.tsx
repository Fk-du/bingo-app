import { patternLabel } from './CreateGameForm';

/**
 * Canonical cell sets (row, col) per winning pattern — mirrors the server's
 * validateBingo rules. For "any line / any block" patterns a representative
 * set is drawn.
 */
const PATTERN_CELLS: Record<string, Set<string>> = {
  SINGLE_LINE: new Set(['2,0', '2,1', '2,2', '2,3', '2,4']),
  DOUBLE_LINE: new Set(['0,0', '0,1', '0,2', '0,3', '0,4', '4,0', '4,1', '4,2', '4,3', '4,4']),
  FULL_HOUSE: new Set(
    Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => `${r},${c}`)).flat(),
  ),
  X_SHAPE: new Set(['0,0', '1,1', '2,2', '3,3', '4,4', '0,4', '1,3', '3,1', '4,0']),
  L_SHAPE: new Set(['0,0', '1,0', '2,0', '3,0', '4,0', '4,1', '4,2', '4,3', '4,4']),
  T_SHAPE: new Set(['0,0', '0,1', '0,2', '0,3', '0,4', '1,2', '2,2', '3,2', '4,2']),
  POSTAGE_STAMP: new Set([
    '0,0', '0,1', '1,0', '1,1',
    '0,3', '0,4', '1,3', '1,4',
    '3,0', '3,1', '4,0', '4,1',
    '3,3', '3,4', '4,3', '4,4',
  ]),
  PLUS: new Set(['2,0', '2,1', '2,2', '2,3', '2,4', '0,2', '1,2', '3,2', '4,2']),
  FRAME: new Set([
    '0,0', '0,1', '0,2', '0,3', '0,4',
    '4,0', '4,1', '4,2', '4,3', '4,4',
    '1,0', '2,0', '3,0',
    '1,4', '2,4', '3,4',
  ]),
  DIAMOND: new Set(['1,1', '1,3', '2,2', '3,1', '3,3']),
  Z_SHAPE: new Set([
    '0,0', '0,1', '0,2', '0,3', '0,4',
    '1,1', '2,2', '3,3',
    '4,0', '4,1', '4,2', '4,3', '4,4',
  ]),
};

// Aliases share visuals with their canonical pattern
PATTERN_CELLS.BLACKOUT = PATTERN_CELLS.FULL_HOUSE;

export function PatternMini({
  pattern,
  customPatternName,
  customPatternCells,
}: {
  pattern?: string | null;
  customPatternName?: string | null;
  customPatternCells?: string | null;
}) {
  if (!pattern) return null;
  if (pattern === 'CUSTOM') {
    const cells = customCellsFromJson(customPatternCells);
    if (!cells) return null;
    return (
      <span
        className="inline-grid grid-cols-5 gap-[2px] rounded-md border border-bp-border bg-bp-bg p-[3px]"
        title={customPatternName || 'Custom Pattern'}
        aria-label={customPatternName || 'Custom Pattern'}
      >
        {Array.from({ length: 25 }, (_, i) => {
          const r = Math.floor(i / 5);
          const c = i % 5;
          const isFree = r === 2 && c === 2;
          const needed = cells.has(`${r},${c}`);
          return (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-[2px] ${
                isFree
                  ? 'bg-bp-gold/70'
                  : needed
                    ? 'bg-bp-primary shadow-[0_0_3px_rgba(6,182,212,0.8)]'
                    : 'bg-bp-surface-elevated'
              }`}
            />
          );
        })}
      </span>
    );
  }
  const cells = PATTERN_CELLS[pattern];
  if (!cells) return null;

  return (
    <span
      className="inline-grid grid-cols-5 gap-[2px] rounded-md border border-bp-border bg-bp-bg p-[3px]"
      title={`${patternLabel(pattern)} — required cells highlighted`}
      aria-label={patternLabel(pattern)}
    >
      {Array.from({ length: 25 }, (_, i) => {
        const r = Math.floor(i / 5);
        const c = i % 5;
        const isFree = r === 2 && c === 2;
        const needed = cells.has(`${r},${c}`);
        return (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-[2px] ${
              isFree
                ? 'bg-bp-gold/70'
                : needed
                  ? 'bg-bp-primary shadow-[0_0_3px_rgba(6,182,212,0.8)]'
                  : 'bg-bp-surface-elevated'
            }`}
          />
        );
      })}
    </span>
  );
}

/** Build a Set of "r,c" keys from the stored [[row,col],...] JSON. */
function customCellsFromJson(json?: string | null): Set<string> | null {
  if (!json) return null;
  try {
    const cells = JSON.parse(json) as number[][];
    if (!Array.isArray(cells)) return null;
    return new Set(cells.filter((c) => Array.isArray(c) && c.length === 2).map((c) => `${c[0]},${c[1]}`));
  } catch {
    return null;
  }
}

/** Required (row,col) keys for a pattern, or null if unknown. */
export function patternCells(pattern?: string | null): Set<string> | null {
  if (!pattern) return null;
  return PATTERN_CELLS[pattern] ?? null;
}

/**
 * How many of the pattern's required cells the player has daubed.
 * The free center counts as always satisfied.
 */
export function patternProgress(
  card: number[][],
  marks: Set<number>,
  pattern?: string | null,
): { done: number; total: number } | null {
  const cells = patternCells(pattern);
  if (!cells || !card) return null;
  let done = 0;
  for (const key of cells) {
    const [r, c] = key.split(',').map(Number);
    if (r === 2 && c === 2) {
      done++;
      continue;
    }
    if (marks.has(card[r]?.[c])) done++;
  }
  return { done, total: cells.size };
}
