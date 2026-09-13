'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role, GameStatus } from '@/types';
import { useGameWebSocket } from '@/hooks/useWebSocket';
import { useGameStore } from '@/store/game.store';
import { useAuthStore } from '@/store/auth.store';
import { useClaimBingo, useActiveGames, useGameState, useSaveMarks, usePendingClaimCards } from '@/hooks/useGames';
import type { PendingClaimCard } from '@/types';
import { getApiErrorMessage } from '@/api/client';
import { useCountdown } from '@/hooks/useCountdown';
import { BingoCard } from '@/components/games/BingoCard';
import { NumberBoard } from '@/components/games/NumberBoard';
import { ActionButton, Surface } from '@/components/ui/Surface';
import { IconBack } from '@/components/ui/Icons';
import { patternLabel } from '@/components/games/CreateGameForm';
import { PatternMini, patternProgress } from '@/components/games/PatternMini';
import { FairnessPanel } from '@/components/games/FairnessPanel';
import { CardPickerModal } from '@/components/games/CardPickerModal';
import { useNumberAnnouncer } from '@/hooks/useNumberAnnouncer';
import { netPrize } from '@/lib/prize';

function numberToLetter(n: number): string {
  if (n >= 1 && n <= 15) return 'B';
  if (n >= 16 && n <= 30) return 'I';
  if (n >= 31 && n <= 45) return 'N';
  if (n >= 46 && n <= 60) return 'G';
  if (n >= 61 && n <= 75) return 'O';
  return '?';
}

function formatNumber(n: number): string {
  return `${n}`;
}

export default function PlayerGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const gameId = Number(id);
  const router = useRouter();
  useGameWebSocket(gameId);
  const { mutate: claimBingo, isPending: isClaiming } = useClaimBingo();
  const { mutate: saveMarks } = useSaveMarks();
  const { data: games } = useActiveGames();
  const { data: gameState, isLoading: stateLoading } = useGameState(gameId);
  const {
    gameStatus,
    startTime: storeStartTime,
    calledNumbers,
    prizePool,
    playerCards,
    isConnecting,
    setGameStatus,
    setStartTime: setStoreStartTime,
    setCalledNumbers,
    setTotalNumbersCalled,
    setPrizePool,
    setPlayerCards,
  } = useGameStore();

  const calledSet = useMemo(() => new Set(calledNumbers.map((n) => n.number)), [calledNumbers]);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimType, setClaimType] = useState<'win' | 'pending' | 'banned'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [markedNumbers, setMarkedNumbers] = useState<Set<number>>(new Set());
  const [autoMark, setAutoMark] = useState<boolean>(true);
  const autoMarkInitialized = useRef(false);
  const manualMarksSeeded = useRef(false);
  const manualDaub = !autoMark;

  const currentUserId = useAuthStore((s) => s.user?.id);
  const claimsActive = gameStatus === GameStatus.CLAIM_PENDING;
  const { data: pendingClaimCards } = usePendingClaimCards(gameId, claimsActive);
  const otherPendingCards: PendingClaimCard[] = useMemo(
    () => (pendingClaimCards ?? []).filter((c) => c.playerId !== currentUserId),
    [pendingClaimCards, currentUserId]
  );
  const [claimsDismissed, setClaimsDismissed] = useState(false);
  const lastClaimKey = useRef('');
  useEffect(() => {
    const key = (pendingClaimCards ?? []).map((c) => c.claimId).join(',');
    if (key && key !== lastClaimKey.current) {
      lastClaimKey.current = key;
      Promise.resolve().then(() => setClaimsDismissed(false));
    }
  }, [pendingClaimCards]);
  const marksSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore the player's auto-mark preference and persisted daubs after refresh/reconnect.
  useEffect(() => {
    if (!gameState) return;
    Promise.resolve().then(() => {
      if (!autoMarkInitialized.current && gameState.autoMark !== undefined) {
        autoMarkInitialized.current = true;
        setAutoMark(Boolean(gameState.autoMark));
      }
      if (gameState.autoMark === false && !manualMarksSeeded.current && gameState.playerCards) {
        manualMarksSeeded.current = true;
        const seed = new Set<number>();
        for (const pc of gameState.playerCards) {
          for (const n of pc.markedNumbers ?? []) seed.add(n);
        }
        if (seed.size > 0) setMarkedNumbers(seed);
      }
    });
  }, [gameState]);

  const lastCalledNumber =
    calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1].number : null;
  const calledNumberValues = useMemo(
    () => calledNumbers.map((c) => c.number),
    [calledNumbers]
  );
  const { muted, toggleMuted } = useNumberAnnouncer(calledNumberValues);
  const gameOver =
    gameStatus === GameStatus.ENDED ? { won: Boolean(gameState?.isWinner) } : null;

  useEffect(() => {
    if (!gameState) return;
    setGameStatus(gameState.status);
    setPrizePool(gameState.prizePool);
    setPlayerCards(gameState.playerCards);
    if (gameState.startTime) {
      setStoreStartTime(gameState.startTime);
    }
    if (gameState.playerCards && gameState.playerCards.length > 0) {
      const calledAsObjects = gameState.calledNumbers.map((n, i) => ({
        id: i,
        gameId,
        number: n,
        sequenceIndex: i,
        calledAt: null,
      }));
      setCalledNumbers(calledAsObjects);
      setTotalNumbersCalled(gameState.calledNumbers.length);
    }
  }, [gameState, gameId, setCalledNumbers, setGameStatus, setPlayerCards, setPrizePool, setTotalNumbersCalled, setStoreStartTime]);

  const game = games?.find((g) => g.id === gameId);
  const hasAnyCard = (playerCards?.length ?? 0) > 0;
  const isLive = gameStatus === GameStatus.IN_PROGRESS;
  const isStarting = gameStatus === GameStatus.STARTING;
  const countdown = useCountdown(isStarting ? (storeStartTime ?? gameState?.startTime ?? game?.startTime ?? null) : null);

  const handleRegister = () => {
    setError(null);
    setPickerOpen(true);
  };

  const toggleMark = (n: number) => {
    let latest: Set<number>;
    setMarkedNumbers((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(n)) nextSet.delete(n);
      else nextSet.add(n);
      latest = nextSet;
      return nextSet;
    });
    if (marksSaveTimer.current) clearTimeout(marksSaveTimer.current);
    marksSaveTimer.current = setTimeout(() => {
      if (!latest) return;
      const payload = [...latest];
      for (const pc of playerCards ?? []) {
        saveMarks(
          { id: gameId, cardId: pc.cardId, markedNumbers: payload, autoMark },
          { onError: (err) => setError(getApiErrorMessage(err)) }
        );
      }
    }, 250);
  };

  const toggleAutoMark = () => {
    const next = !autoMark;
    setAutoMark(next);
    const cards = gameState?.playerCards ?? [];
    if (!next) {
      // Port the current auto-marked state into a single shared daub set, so the
      // player continues from the same numbers instead of starting from empty ones.
      const ported = new Set<number>();
      for (const pc of cards) {
        for (const row of pc.numbers) {
          for (const num of row) {
            if (calledSet.has(num)) ported.add(num);
          }
        }
      }
      ported.add(0); // free centre counts as daubed
      setMarkedNumbers(ported);
      for (const pc of cards) {
        saveMarks({ id: gameId, cardId: pc.cardId, markedNumbers: [...ported], autoMark: next }, {
          onError: (err) => setError(getApiErrorMessage(err)),
        });
      }
    } else {
      setMarkedNumbers(new Set());
      for (const pc of cards) {
        saveMarks({ id: gameId, cardId: pc.cardId, markedNumbers: [], autoMark: next }, {
          onError: (err) => setError(getApiErrorMessage(err)),
        });
      }
    }
  };

  const handleClaim = (cardId: number) => {
    setError(null);
    const marks = !autoMark ? [...markedNumbers] : undefined;
    claimBingo({ id: gameId, cardId, markedNumbers: marks, autoMark }, {
      onSuccess: (res) => {
        if (res.data.banned) {
          setClaimMessage(`Invalid Bingo claim on card #${cardId} — this card was banned.`);
          setClaimType('banned');
        } else if (res.data.pendingReview) {
          setClaimMessage(`Bingo claimed with card #${cardId}! Waiting for admin review.`);
          setClaimType('pending');
        } else if (res.data.valid) {
          setClaimMessage(`Bingo! You won ${res.data.rewardAmount} coins.`);
          setClaimType('win');
        }
      },
      onError: (err) => setError(getApiErrorMessage(err)),
    });
  };

  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <div className="border-b border-bp-border bg-bp-surface/80 px-0 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-bp-border bg-bp-bg hover:border-bp-primary/50 transition"
          >
            <IconBack className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-bp-text">Game #{gameId}</p>
            <p className="text-xs text-bp-muted">Max {game?.maxPlayers ?? '—'} players</p>
          </div>
          {isLive && (
            <span className="bp-live-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="h-2 w-2 animate-pulse rounded-full bg-bp-danger shadow-[0_0_6px_rgba(235,87,87,0.6)]" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2.5 rounded-[18px] border border-bp-gold/25 bg-bp-gold/5 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-bp-muted">Winning pattern</span>
        <PatternMini pattern={gameState?.winningPattern} customPatternName={gameState?.customPatternName} customPatternCells={gameState?.customPatternCells} />
        <span className="text-sm font-black text-bp-gold">{patternLabel(gameState?.winningPattern, gameState?.customPatternName)}</span>
      </div>

      <FairnessPanel gameId={gameId} status={gameStatus ?? undefined} liveHash={gameState?.fairnessHash} />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Surface className="relative overflow-hidden p-3 text-center before:absolute before:inset-0 before:bg-gradient-to-br before:from-bp-gold/5 before:to-transparent">
          <p className="text-[10px] uppercase tracking-wider text-bp-muted">Prize Pool</p>
          <p className="mt-1 text-2xl font-black text-bp-gold drop-shadow-[0_0_8px_rgba(242,201,76,0.2)]">
            {netPrize(prizePool, gameState?.commissionPercent).toLocaleString()}
          </p>
          <p className="text-[10px] text-bp-muted font-medium">
            {prizePool > 0 && gameState?.commissionPercent
              ? `collected ${prizePool.toLocaleString()} · after ${gameState.commissionPercent}% fee`
              : 'coins'}
          </p>
        </Surface>
        <Surface className="relative overflow-hidden p-3 text-center before:absolute before:inset-0 before:bg-gradient-to-br before:from-bp-primary/5 before:to-transparent">
          <p className="text-[10px] uppercase tracking-wider text-bp-muted">Called</p>
          <p className="mt-1 text-2xl font-black text-bp-text">{calledNumbers.length}/75</p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bp-surface-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-bp-primary to-bp-primary-hover transition-all duration-500"
              style={{ width: `${(calledNumbers.length / 75) * 100}%` }}
            />
          </div>
        </Surface>
      </div>

      {isConnecting && (
        <div className="mt-3 rounded-xl border border-bp-primary/30 bg-bp-primary/10 px-4 py-2 text-sm text-bp-primary flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-bp-primary" />
          Connecting to game server...
        </div>
      )}
      {stateLoading && !gameState && (
        <div className="mt-3 rounded-xl bg-bp-surface px-4 py-2 text-sm text-bp-muted flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-bp-muted" />
          Loading game state...
        </div>
      )}

      {isStarting && (
        <div className="mt-3 rounded-2xl border border-bp-gold/40 bg-gradient-to-br from-bp-gold/15 via-bp-gold/5 to-transparent px-4 py-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-bp-gold/80">Get ready</p>
          <p className="mt-1 text-4xl font-black text-bp-gold drop-shadow-[0_0_12px_rgba(242,201,76,0.35)]">
            {countdown ?? 0}
          </p>
          <p className="mt-1 text-sm text-bp-muted">
            {hasAnyCard ? 'Game starting — good luck!' : 'Starting — registration is closed.'}
          </p>
        </div>
      )}

      {gameStatus === GameStatus.PAUSED && (
        <div className="mt-3 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent px-4 py-3 text-center">
          <p className="text-sm font-bold text-amber-300">⏸ Game paused — waiting for admin to resume</p>
        </div>
      )}

      {lastCalledNumber && isLive && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-bp-muted">Last Called</p>
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={muted ? 'Unmute number announcements' : 'Mute number announcements'}
              className="inline-flex items-center gap-1.5 rounded-full border border-bp-border bg-bp-bg px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bp-muted transition-colors hover:border-bp-gold/40 hover:text-bp-gold"
            >
              {muted ? '🔇 Sound off' : '🔊 Sound on'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-bp-danger/30 bg-gradient-to-br from-bp-danger/10 via-bp-danger/5 to-transparent p-3">
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-bp-danger/80 mb-0.5">Number</p>
              <p className="text-3xl font-black text-bp-text drop-shadow-[0_0_10px_rgba(235,87,87,0.3)]">
                <span className="text-bp-danger">{numberToLetter(lastCalledNumber)}</span>-{lastCalledNumber}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-bp-muted">Recent Calls</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {calledNumbers.slice(-15).reverse().map((n, i) => (
                  <span
                    key={n.id}
                    className="bp-number-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bp-danger/40 bg-gradient-to-br from-bp-danger/20 to-bp-danger/5 text-xs font-bold text-red-200"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {formatNumber(n.number)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {registerSuccess && hasAnyCard && (
        <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <span className="text-lg">✓</span>
          Registered! Your card is ready. Good luck!
        </div>
      )}

      {claimMessage && claimType === 'win' && (
        <div className="mt-3 rounded-xl border border-bp-success/50 bg-gradient-to-br from-bp-success/15 to-bp-success/5 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <span className="text-lg">🎉</span>
          {claimMessage}
        </div>
      )}
      {claimMessage && claimType === 'pending' && (
        <div className="mt-3 rounded-xl border border-bp-warning/40 bg-bp-warning/15 px-4 py-3 text-sm text-amber-200 flex items-center gap-2">
          <span className="text-lg">⏳</span>
          {claimMessage}
        </div>
      )}
      {claimMessage && claimType === 'banned' && (
        <div className="mt-3 rounded-xl border border-bp-danger/50 bg-bp-danger/15 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
          <span className="text-lg">🚫</span>
          {claimMessage}
        </div>
      )}
      {otherPendingCards.length > 0 && !claimsDismissed && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-bp-border bg-bp-surface shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-bp-border bg-bp-bg/60 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-bp-text">
                  {otherPendingCards.length > 1 ? 'Multiple players claimed Bingo' : 'A player claimed Bingo'}
                </p>
                <p className="mt-0.5 text-xs text-bp-muted">
                  Check their card below — the marked cells complete the winning pattern.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClaimsDismissed(true)}
                aria-label="Close window"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bp-border bg-bp-bg text-bp-muted transition hover:border-bp-danger/50 hover:text-bp-danger"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
              {otherPendingCards.map((card) => {
                const initials = (card.playerName || 'Player')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('');
                return (
                  <div key={card.claimId} className="rounded-2xl border border-bp-border bg-bp-bg/40 p-4 text-center">
                    <div className="mb-3 flex items-center justify-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bp-gold/40 bg-gradient-to-br from-bp-gold/30 to-bp-gold/5 text-base font-black text-amber-200">
                        {initials || '★'}
                      </span>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-bold text-bp-text">{card.playerName}</p>
                        <p className="text-[11px] text-bp-muted">
                          {card.claimedAt
                            ? `Claimed ${new Date(card.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Just claimed'}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-bp-gold/40 bg-bp-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bp-gold" />
                        Bingo!
                      </span>
                    </div>
                    <div className="mx-auto w-full max-w-[16rem]">
                      <BingoCard
                        numbers={card.cardNumbers}
                        calledNumbers={new Set(card.calledNumbers)}
                        autoMark
                        size="sm"
                      />
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-bp-muted">
                      The highlighted cells on this card complete the winning pattern.
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-bp-border bg-bp-bg/60 px-4 py-3">
              <ActionButton
                variant="primary"
                onClick={() => setClaimsDismissed(true)}
                className="w-full py-3"
              >
                Close
              </ActionButton>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-xl border border-bp-danger/40 bg-bp-danger/15 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
          <span className="text-lg">✕</span>
          {error}
        </div>
      )}
      {gameOver && (
        <div
          className={`mt-3 rounded-xl border px-4 py-4 text-center text-base font-bold ${
            gameOver.won
              ? 'border-bp-success/40 bg-gradient-to-br from-bp-success/15 to-bp-success/5 text-emerald-300 drop-shadow-[0_0_12px_rgba(39,174,96,0.2)]'
              : 'border-bp-border bg-bp-surface text-bp-muted'
          }`}
        >
          {gameOver.won ? '🎉 BINGO! You Won! 🎉' : 'Game Over'}
        </div>
      )}

      <div className="mt-4">
        {gameStatus === GameStatus.REGISTRATION_OPEN && !hasAnyCard && (
          <Surface className="relative overflow-hidden p-6 text-center before:absolute before:inset-0 before:bg-gradient-to-br before:from-bp-primary/5 before:via-transparent before:to-bp-gold/5">
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-bp-muted">Registration Open</p>
              <p className="mt-2 text-3xl font-black text-bp-gold drop-shadow-[0_0_8px_rgba(242,201,76,0.2)]">
                {game?.entryFee ?? '?'}
              </p>
              <p className="text-sm text-bp-muted">coins to enter (per card)</p>
              <ActionButton variant="primary" onClick={handleRegister} className="mt-5 w-full py-3 text-base font-bold tracking-wider">
                ✦ Choose a Card
              </ActionButton>
            </div>
          </Surface>
        )}

        {gameStatus === GameStatus.REGISTRATION_OPEN && hasAnyCard && (
          <Surface className="relative overflow-hidden p-5 text-center before:absolute before:inset-0 before:bg-gradient-to-br before:from-bp-primary/5 before:via-transparent before:to-bp-gold/5">
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-bp-muted">
                You hold {playerCards?.length ?? 0} card{(playerCards?.length ?? 0) === 1 ? '' : 's'} · {game?.entryFee ?? '?'} coins per card
              </p>
              <ActionButton variant="primary" onClick={handleRegister} className="mt-4 w-full py-3 text-base font-bold tracking-wider">
                + Buy Another Card
              </ActionButton>
            </div>
          </Surface>
        )}

        {hasAnyCard && playerCards && playerCards.length > 0 && (
          <>
            <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                {playerCards.map((pc) => {
                  const cardMarked = markedNumbers;
                  const prog = manualDaub ? patternProgress(pc.numbers, cardMarked, gameState?.winningPattern) : null;
                  const patternDone = !!prog && prog.done === prog.total;
                  return (
                    <div key={pc.cardId} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-bp-border bg-bp-bg/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-bp-muted">
                          Card #{pc.cardId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {pc.winner && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-bp-success/40 bg-bp-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              Winner
                            </span>
                          )}
                          {pc.banned && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-bp-danger/50 bg-bp-danger/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                              Banned
                            </span>
                          )}
                        </div>
                      </div>
                      <BingoCard
                        numbers={pc.numbers}
                        calledNumbers={calledSet}
                        autoMark={!manualDaub}
                        markedNumbers={cardMarked}
                        onToggleMark={manualDaub && !pc.banned ? (n) => toggleMark(n) : undefined}
                        size="sm"
                      />
                      {pc.banned && (
                        <p className="text-center text-[11px] text-red-300/80">
                          This card is banned. Your other cards are still in play.
                        </p>
                      )}
                      {manualDaub && prog && (
                        <p className={`text-center text-[11px] font-bold ${patternDone ? 'text-emerald-300' : 'text-bp-muted'}`}>
                          {patternDone ? '✓ Pattern complete — hit BINGO!' : `Pattern ${prog.done}/${prog.total} daubed`}
                        </p>
                      )}
                      {isLive && !pc.banned && !pc.winner && (
                        <button
                          onClick={() => handleClaim(pc.cardId)}
                          disabled={isClaiming}
                          className="bp-bingo-gradient w-full rounded-xl py-3 text-base font-black tracking-[0.15em] text-white shadow transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                        >
                          {isClaiming ? '✦ CHECKING...' : `✦ BINGO! ✦`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className={!autoMark ? 'lg:mt-7' : ''}>
                <NumberBoard calledNumbers={calledSet} compact />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <button
                type="button"
                onClick={toggleAutoMark}
                className="flex items-center gap-2 rounded-xl border border-bp-border bg-bp-surface-elevated px-3 py-2 text-bp-muted transition hover:border-bp-primary/30"
                aria-pressed={autoMark}
              >
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    autoMark ? 'bg-bp-primary' : 'bg-bp-surface'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                      autoMark ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </span>
                <span className="text-xs">{autoMark ? 'Auto-mark on' : 'Manual marking'}</span>
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-bp-border bg-bp-surface-elevated px-3 py-2 text-bp-muted hover:border-bp-primary/30 transition">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-bp-border accent-bp-primary" />
                Sound
              </label>
            </div>
            {manualDaub && (
              <p className="mt-2 text-center text-xs text-bp-muted">
                Tap a number once — it marks on all your cards that contain it.
              </p>
            )}
            {isLive && <div className="h-16" />}
          </>
        )}
      </div>

      {pickerOpen && (
        <CardPickerModal
          gameId={gameId}
          entryFee={game?.entryFee ?? 0}
          onClose={() => setPickerOpen(false)}
          onRegistered={() => setRegisterSuccess(true)}
        />
      )}
    </ProtectedRoute>
  );
}
