import { useState, FormEvent } from 'react';
import { useCreateGame } from '@/hooks/useGames';
import { ActionButton, Field, SelectField, TextField } from '@/components/ui/Surface';
import { PatternBoardEditor } from '@/components/games/PatternBoardEditor';

export const WINNING_PATTERNS: { value: string; label: string; hint: string }[] = [
  { value: 'SINGLE_LINE', label: 'Single Line', hint: 'Any full row, column or diagonal' },
  { value: 'DOUBLE_LINE', label: 'Double Line', hint: 'Any two rows, columns or diagonals' },
  { value: 'TRIPLE_LINE', label: 'Triple Line', hint: 'Any three rows, columns or diagonals' },
  { value: 'FULL_HOUSE', label: 'Full House', hint: 'Every number on the card' },
  { value: 'FOUR_CORNERS', label: 'Four Corners', hint: 'All four corner squares' },
  { value: 'X_SHAPE', label: 'X Shape', hint: 'Both diagonals' },
  { value: 'T_SHAPE', label: 'T Shape', hint: 'Top row plus middle column' },
  { value: 'L_SHAPE', label: 'L Shape', hint: 'Bottom row plus first column' },
  { value: 'POSTAGE_STAMP', label: 'Postage Stamp', hint: 'A 2x2 block in any corner' },
  { value: 'PLUS', label: 'Plus Shape', hint: 'Middle row plus middle column' },
  { value: 'FRAME', label: 'Frame', hint: 'All cells around the outer border' },
  { value: 'DIAMOND', label: 'Diamond', hint: 'The four cells around the centre' },
  { value: 'Z_SHAPE', label: 'Z Shape', hint: 'Top row, middle diagonal and bottom row' },
  { value: 'CUSTOM', label: 'Custom Pattern', hint: 'Draw your own pattern on the board' },
];

export function patternLabel(value?: string | null, customName?: string | null): string {
  if (value === 'CUSTOM') return customName || 'Custom Pattern';
  if (!value) return 'Single Line';
  if (value === 'BLACKOUT') return 'Full House';
  return WINNING_PATTERNS.find((p) => p.value === value)?.label
    ?? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CreateGameForm() {
  const [entryFee, setEntryFee] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('50');
  const [callInterval, setCallInterval] = useState('5');
  const [commissionPercent, setCommissionPercent] = useState('10');
  const [winningPattern, setWinningPattern] = useState('SINGLE_LINE');
  const [autoMark, setAutoMark] = useState(true);
  const [customPatternName, setCustomPatternName] = useState('');
  const [customCells, setCustomCells] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState(false);
  const { mutate, isPending } = useCreateGame();

  const resetForm = () => {
    setEntryFee('');
    setMaxPlayers('50');
    setCallInterval('5');
    setCommissionPercent('10');
    setWinningPattern('SINGLE_LINE');
    setAutoMark(true);
    setCustomPatternName('');
    setCustomCells(new Set());
  };

  const toggleCell = (key: string) => {
    setCustomCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const serializeCells = () => {
    return JSON.stringify(
      Array.from(customCells)
        .map((key) => key.split(',').map(Number))
        .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1])),
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    const isCustom = winningPattern === 'CUSTOM';
    mutate({
      entryFee: Number(entryFee),
      maxPlayers: Number(maxPlayers),
      callInterval: Number(callInterval),
      commissionPercent: Number(commissionPercent),
      winningPattern,
      autoMark,
      ...(isCustom
        ? {
            customPatternName,
            customPatternCells: serializeCells(),
          }
        : {}),
    }, {
      onSuccess: () => {
        resetForm();
        setSuccess(true);
      },
    });
  };

  const selected = WINNING_PATTERNS.find((p) => p.value === winningPattern);

  return (
    <div>
      {success && (
        <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Game created! Registration is now open.
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
      <Field label="Entry Fee">
        <TextField
          type="number"
          value={entryFee}
          onChange={(e) => setEntryFee(e.target.value)}
          required
          min="0"
          placeholder="10"
        />
      </Field>
      <Field label="Max Players">
        <TextField
          type="number"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
          min="2"
        />
      </Field>
      <Field label="Call Interval" hint="Seconds between automatic calls">
        <TextField
          type="number"
          value={callInterval}
          onChange={(e) => setCallInterval(e.target.value)}
          min="3"
        />
      </Field>
      <Field label="Commission %" hint="Your cut of the prize pool (0–90)">
        <TextField
          type="number"
          value={commissionPercent}
          onChange={(e) => setCommissionPercent(e.target.value)}
          min="0"
          max="90"
          step="0.5"
        />
      </Field>
      <Field label="Winning Pattern" hint={selected?.hint}>
        <SelectField
          value={winningPattern}
          onChange={(e) => setWinningPattern(e.target.value)}
        >
          {WINNING_PATTERNS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </Field>
      <label className="flex items-center gap-2 self-end pb-1 text-sm text-bp-text">
        <input
          type="checkbox"
          checked={autoMark}
          onChange={(e) => setAutoMark(e.target.checked)}
          className="h-4 w-4 accent-cyan-400"
        />
        Auto-mark numbers
      </label>
      <ActionButton type="submit" disabled={isPending} className="md:self-end">
        {isPending ? 'Creating...' : 'Create Game'}
      </ActionButton>
      </form>
      {winningPattern === 'CUSTOM' && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-bp-border bg-bp-bg p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <Field label="Pattern Name" hint="Shown to players as the winning pattern">
              <TextField
                value={customPatternName}
                onChange={(e) => setCustomPatternName(e.target.value)}
                placeholder="e.g. My Crown"
                required
              />
            </Field>
            <p className="text-xs text-bp-muted">
              Click cells on the board to draw the winning pattern. The gold centre cell is always
              free. Mark at least one cell.
            </p>
            <button
              type="button"
              onClick={() => setCustomCells(new Set())}
              className="self-start rounded-lg border border-bp-border px-3 py-1 text-xs text-bp-muted transition hover:border-bp-danger/50 hover:text-bp-danger"
            >
              Clear board
            </button>
          </div>
          <PatternBoardEditor selected={customCells} onToggle={toggleCell} />
        </div>
      )}
    </div>
  );
}
