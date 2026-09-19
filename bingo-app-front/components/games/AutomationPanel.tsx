'use client';

import { useState } from 'react';
import { useAutomation, useSaveAutomation } from '@/hooks/useGames';
import { ActionButton, Field, SelectField, TextField } from '@/components/ui/Surface';
import { PatternBoardEditor } from '@/components/games/PatternBoardEditor';
import { WINNING_PATTERNS } from '@/components/games/CreateGameForm';
import { getApiErrorMessage } from '@/api/client';
import { AutomationConfig } from '@/types';

const DEFAULT_ENTRY = 10;
const DEFAULT_MAX_PLAYERS = 50;
const DEFAULT_CALL_INTERVAL = 5;
const DEFAULT_COMMISSION = 10;
const DEFAULT_WINDOW = 180;
const DEFAULT_COOLDOWN = 15;

function parseCellsToSet(json?: string | null): Set<string> {
  const out = new Set<string>();
  if (!json) return out;
  try {
    (JSON.parse(json) as number[][]).forEach(([r, c]) => out.add(`${r},${c}`));
  } catch {
    // ignore malformed payload
  }
  return out;
}

function serializeCells(cells: Set<string>): string {
  return JSON.stringify(
    Array.from(cells)
      .map((key) => key.split(',').map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]),
  );
}

function AutomationForm({ config }: { config: AutomationConfig }) {
  const { mutate: save, isPending } = useSaveAutomation();

  const [automatic, setAutomatic] = useState(config.enabled);
  const [entryFee, setEntryFee] = useState(String(config.entryFee ?? DEFAULT_ENTRY));
  const [maxPlayers, setMaxPlayers] = useState(String(config.maxPlayers ?? DEFAULT_MAX_PLAYERS));
  const [callInterval, setCallInterval] = useState(String(config.callInterval ?? DEFAULT_CALL_INTERVAL));
  const [commissionPercent, setCommissionPercent] = useState(
    String(config.commissionPercent ?? DEFAULT_COMMISSION),
  );
  const [winningPattern, setWinningPattern] = useState(config.winningPattern ?? 'SINGLE_LINE');
  const [autoMark, setAutoMark] = useState(config.autoMark);
  const [customPatternName, setCustomPatternName] = useState(config.customPatternName ?? '');
  const [customCells, setCustomCells] = useState<Set<string>>(parseCellsToSet(config.customPatternCells));
  const [registrationWindowSeconds, setRegistrationWindowSeconds] = useState(
    String(config.registrationWindowSeconds ?? DEFAULT_WINDOW),
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(String(config.cooldownSeconds ?? DEFAULT_COOLDOWN));
  const [startWhenFull, setStartWhenFull] = useState(config.startWhenFull);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const buildPayload = (enabled: boolean) => {
    const isCustom = winningPattern === 'CUSTOM';
    return {
      entryFee: Number(entryFee),
      maxPlayers: Number(maxPlayers),
      callInterval: Number(callInterval),
      commissionPercent: Number(commissionPercent),
      winningPattern,
      autoMark,
      registrationWindowSeconds: Number(registrationWindowSeconds),
      cooldownSeconds: Number(cooldownSeconds),
      startWhenFull,
      enabled,
      ...(isCustom ? { customPatternName, customPatternCells: serializeCells(customCells) } : {}),
    };
  };

  const handleSave = (enabled: boolean, message: string) => {
    setError(null);
    setNotice(null);
    save(buildPayload(enabled), {
      onSuccess: () => {
        setAutomatic(enabled);
        setNotice(message);
      },
      onError: (err) => setError(getApiErrorMessage(err)),
    });
  };

  const selected = WINNING_PATTERNS.find((p) => p.value === winningPattern);
  const toggleCell = (key: string) => {
    setCustomCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const segment = (active: boolean) =>
    `flex-1 rounded-xl border px-3 py-2 text-center text-xs font-bold uppercase tracking-wider transition ${
      active
        ? 'border-bp-primary/60 bg-bp-primary/15 text-bp-primary'
        : 'border-bp-border bg-bp-surface-elevated text-bp-muted hover:border-bp-primary/30'
    }`;

  return (
    <div>
      {notice && (
        <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          ✓ {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl border border-bp-danger/40 bg-bp-danger/10 px-4 py-3 text-sm text-red-200">
          ✕ {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={segment(!automatic)}
          onClick={() => handleSave(false, 'Automatic mode turned off — games are manual again.')}
          disabled={isPending}
        >
          Manual
        </button>
        <button
          type="button"
          className={segment(automatic)}
          onClick={() =>
            handleSave(
              true,
              automatic
                ? 'Automatic mode is ON — the system creates and starts games from this template.'
                : 'Automatic mode enabled — the system will keep creating and starting games from this template.',
            )
          }
          disabled={isPending}
        >
          Automatic
        </button>
      </div>

      {automatic && (
        <div className="mb-4 rounded-xl border border-bp-gold/30 bg-bp-gold/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
          Automatic mode is <span className="font-bold">ON</span>. Configure the template once below —
          after each game ends the system opens a fresh table and starts it automatically (registration
          window or full table). All game rules still apply: at least 2 players, entry fees, prize pool,
          fair-play commit, calling, claims and commissions.
        </div>
      )}

      {automatic && (
        <>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Entry Fee">
          <TextField
            type="number"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
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
          <SelectField value={winningPattern} onChange={(e) => setWinningPattern(e.target.value)}>
            {WINNING_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectField>
        </Field>
        <Field label="Auto-mark numbers">
          <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-bp-text">
            <input
              type="checkbox"
              checked={autoMark}
              onChange={(e) => setAutoMark(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Cards mark themselves
          </label>
        </Field>
        <Field
          label="Registration Window"
          hint="How long the table stays open (1–60 min) so players can register before it auto-starts"
        >
          <TextField
            type="number"
            value={registrationWindowSeconds}
            onChange={(e) => setRegistrationWindowSeconds(e.target.value)}
            min="60"
            max="3600"
          />
        </Field>
        <Field label="Gap Between Games" hint="Wait after a game ends before the next one opens (seconds)">
          <TextField
            type="number"
            value={cooldownSeconds}
            onChange={(e) => setCooldownSeconds(e.target.value)}
            min="0"
          />
        </Field>
        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-bp-text">
            <input
              type="checkbox"
              checked={startWhenFull}
              onChange={(e) => setStartWhenFull(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Start immediately when the table fills to Max Players
          </label>
        </div>
      </div>

      {winningPattern === 'CUSTOM' && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-bp-border bg-bp-bg p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <Field label="Pattern Name" hint="Shown to players as the winning pattern">
              <TextField
                value={customPatternName}
                onChange={(e) => setCustomPatternName(e.target.value)}
                placeholder="e.g. My Crown"
              />
            </Field>
            <p className="text-xs text-bp-muted">
              Click cells on the board to draw the winning pattern. The gold centre cell is always free.
              Mark at least one cell.
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <ActionButton
          variant="primary"
          disabled={isPending}
          onClick={() =>
            handleSave(
              true,
              automatic
                ? 'Template updated — automatic mode keeps running.'
                : 'Automatic mode enabled — the system will keep creating and starting games from this template.',
            )
          }
        >
          {isPending
            ? 'Saving…'
            : automatic
              ? 'Save Template & Keep Automatic'
              : 'Save Template & Enable Automation'}
        </ActionButton>
        <ActionButton
          variant="secondary"
          disabled={isPending}
          onClick={() => handleSave(false, 'Template saved. Automatic mode stays off.')}
        >
          Save Template Only
        </ActionButton>
        </div>
        </>
      )}
      <p className="mt-2 text-[11px] text-bp-muted">
        {automatic
          ? 'Current mode: Automatic — manual create/start controls are hidden while this is active.'
          : 'Current mode: Manual — use the new table setup form below to create a game.'}
      </p>
    </div>
  );
}

export function AutomationPanel() {
  const { data: config, isLoading } = useAutomation();

  if (isLoading || !config) {
    return <div className="h-40 animate-pulse rounded-xl border border-bp-border bg-bp-surface/60" />;
  }

  return <AutomationForm config={config} />;
}