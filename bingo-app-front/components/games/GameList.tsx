import Link from 'next/link';
import { GameResponse, GameStatus } from '@/types';
import { ActionButton, EmptyState, LiveBadge, Surface, StatusPill } from '@/components/ui/Surface';
import { useCountdown } from '@/hooks/useCountdown';
import { patternLabel } from '@/components/games/CreateGameForm';
import { PatternMini } from './PatternMini';
import { StartGameButton } from './StartGameButton';
import { netPrize } from '@/lib/prize';

const GAME_NAMES = ['Mega Bingo', 'Happy Hour', 'Night Owl', 'Golden Draw', 'Turbo Round', 'Classic 75'];
const GAME_EMOJIS = ['🔥', '🎯', '🦉', '👑', '⚡', '🎱'];
const GAME_COLORS = [
  'from-rose-500/20 to-rose-500/5 border-rose-500/30',
  'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
  'from-violet-500/20 to-violet-500/5 border-violet-500/30',
  'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
  'from-bp-primary/20 to-bp-primary/5 border-bp-primary/30',
];

function gameDisplayName(id: number): string {
  return GAME_NAMES[id % GAME_NAMES.length];
}

function gameEmoji(id: number): string {
  return GAME_EMOJIS[id % GAME_EMOJIS.length];
}

function gameColor(id: number): string {
  return GAME_COLORS[id % GAME_COLORS.length];
}

interface GameListProps {
  games: GameResponse[];
  role: 'admin' | 'player';
  onStart?: (id: number) => void;
  onCancel?: (id: number) => void;
  onEnd?: (id: number) => void;
  onRegister?: (id: number) => void;
  registeringId?: number | null;
  startingId?: number | null;
  countdownSeconds?: number | null;
  busyId?: number | null;
}

export function GameList({
  games,
  role,
  onStart,
  onCancel,
  onEnd,
  onRegister,
  registeringId,
  startingId,
  countdownSeconds,
  busyId,
}: GameListProps) {
  if (!games.length) {
    return (
      <EmptyState
        title="No games available"
        description="New games will appear here when your agent opens registration."
      />
    );
  }

  if (role === 'player') {
    return (
      <div className="space-y-3">
        {games.map((game) => (
          <PlayerGameCard
            key={game.id}
            game={game}
            onRegister={onRegister}
            registering={registeringId === game.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <Surface key={game.id} className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/games/${game.id}`}
                  className="text-base font-semibold text-bp-text transition hover:text-bp-primary"
                >
                  {gameDisplayName(game.id)} #{game.id}
                </Link>
                {game.status === GameStatus.IN_PROGRESS ? (
                  <LiveBadge />
                ) : (
                  <StatusPill status={game.status} />
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-bp-muted">
                <span className="rounded-full border border-bp-border bg-bp-bg px-3 py-1">
                  Fee {game.entryFee}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-bp-primary/30 bg-bp-primary/10 px-3 py-1 text-bp-primary">
                  <PatternMini pattern={game.winningPattern} customPatternName={game.customPatternName} customPatternCells={game.customPatternCells} />
                  {patternLabel(game.winningPattern, game.customPatternName)}
                </span>
                <span className="rounded-full border border-bp-gold/30 bg-bp-gold/10 px-3 py-1 text-bp-gold">
                  Pool {game.prizePool.toLocaleString()} → {netPrize(game.prizePool, game.commissionPercent).toLocaleString()}
                </span>
                {game.commissionPercent != null && (
                  <span className="rounded-full border border-bp-border bg-bp-bg px-3 py-1">
                    Commission {game.commissionPercent}%
                  </span>
                )}
                <span className="rounded-full border border-bp-border bg-bp-bg px-3 py-1">
                  Players {game.registeredPlayers ?? 0}/{game.maxPlayers}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {game.status === GameStatus.REGISTRATION_OPEN && onStart && (
                <StartGameButton
                  onStart={() => onStart(game.id)}
                  registeredPlayers={game.registeredPlayers ?? 0}
                  starting={startingId === game.id}
                  busy={busyId === game.id}
                  countdownSeconds={countdownSeconds}
                />
              )}
              {game.status === GameStatus.REGISTRATION_OPEN && onCancel && (
                <ActionButton
                  variant="danger"
                  onClick={() => onCancel(game.id)}
                  disabled={busyId === game.id || startingId === game.id}
                >
                  Cancel
                </ActionButton>
              )}
              {game.status === GameStatus.IN_PROGRESS && onEnd && (
                <ActionButton variant="danger" onClick={() => onEnd(game.id)} disabled={busyId === game.id}>
                  End Game
                </ActionButton>
              )}
            </div>
          </div>
        </Surface>
      ))}
    </div>
  );
}

function PlayerGameCard({
  game,
  onRegister,
  registering,
}: {
  game: GameResponse;
  onRegister?: (id: number) => void;
  registering?: boolean;
}) {
  const isLive = game.status === GameStatus.IN_PROGRESS;
  const isOpen = game.status === GameStatus.REGISTRATION_OPEN;
  const isStarting = game.status === GameStatus.STARTING;
  const isRegistered = !!game.registered;
  const countdown = useCountdown(isStarting ? game.startTime : null);
  const colorStyle = gameColor(game.id);

  return (
    <Surface className={`overflow-hidden p-0 transition hover:brightness-110 bp-card-reveal ${isLive ? 'ring-1 ring-bp-danger/30' : ''} ${isRegistered ? 'ring-2 ring-bp-gold/60 bg-bp-gold/[0.04]' : ''}`}>
      {isRegistered && (
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-bp-gold/20 via-bp-gold/30 to-bp-gold/20 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-bp-gold">
          ✓ You are registered
        </div>
      )}
      <div className={`flex gap-3 p-3 bg-gradient-to-br ${isLive ? 'from-bp-danger/5 to-transparent' : isRegistered ? 'from-bp-gold/10 to-transparent' : ''}`}>
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${isRegistered ? 'from-bp-gold to-amber-400 text-bp-danger/10' : colorStyle} text-2xl shadow-lg`}>
          {gameEmoji(game.id)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/player/game/${game.id}`}
                className={`font-semibold transition ${isLive ? 'text-bp-danger hover:text-red-300' : 'text-bp-text hover:text-bp-primary'}`}
              >
                {gameDisplayName(game.id)}
              </Link>
              {isLive && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-bp-danger">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bp-danger" />
                  LIVE
                </span>
              )}
              {isRegistered && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-bp-gold">
                  <span className="h-1.5 w-1.5 rounded-full bg-bp-gold" />
                  REGISTERED
                </span>
              )}
            </div>
            {(isOpen || isStarting) && <StatusPill status={game.status} />}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={`text-xl font-black ${isLive ? 'text-bp-danger drop-shadow-[0_0_8px_rgba(235,87,87,0.3)]' : 'text-bp-gold'}`}>
              {netPrize(game.prizePool, game.commissionPercent).toLocaleString()}
            </p>
            <span className="text-xs text-bp-muted font-medium">coins to win</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-bp-muted">
            <span className="inline-flex items-center gap-1">
              <span className="text-bp-primary">◆</span>
              Entry {game.entryFee.toLocaleString()} coins
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-bp-muted">●</span>
              Up to {game.maxPlayers} players
            </span>
            {!isLive && (
              <span className="inline-flex items-center gap-1">
                <span className="text-bp-gold">⏱</span>
                {game.startTime ? `Starts ${new Date(game.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Starts when opened'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-bp-gold">
              <PatternMini pattern={game.winningPattern} customPatternName={game.customPatternName} customPatternCells={game.customPatternCells} />
              {patternLabel(game.winningPattern, game.customPatternName)}
            </span>
          </div>
        </div>
      </div>
      {(isOpen || isLive) && (
        <div className="flex gap-2 border-t border-bp-border p-3 bg-gradient-to-r from-transparent via-bp-surface-elevated/30 to-transparent">
          <Link href={`/player/game/${game.id}`} className="flex-1">
            <ActionButton variant={isLive ? 'danger' : 'primary'} className="w-full">
              {isLive ? '▶ Join Live' : 'View Game'}
            </ActionButton>
          </Link>
          {isOpen && onRegister && (
            <>
              {game.registered ? (
                <ActionButton variant="gold" disabled className="flex-1 font-bold tracking-wide ring-1 ring-bp-gold/50">
                  ✓ Registered — card ready
                </ActionButton>
              ) : game.activeGameId && game.activeGameId !== game.id ? (
                <ActionButton variant="ghost" disabled className="flex-1 font-bold tracking-wide text-bp-muted">
                  In another game
                </ActionButton>
              ) : (
                <ActionButton
                  variant="gold"
                  onClick={() => onRegister(game.id)}
                  disabled={registering}
                  className="flex-1 font-bold tracking-wide"
                >
                  {registering ? '✦ Joining…' : '✦ Register'}
                </ActionButton>
              )}
            </>
          )}
        </div>
      )}
      {isStarting && (
        <div className="border-t border-bp-border p-3">
          <Link href={`/player/game/${game.id}`} className="block">
            <ActionButton variant="gold" disabled className="w-full font-bold tracking-wide">
              ⏳ Starting in {countdown ?? 0}s…
            </ActionButton>
          </Link>
        </div>
      )}
    </Surface>
  );
}
