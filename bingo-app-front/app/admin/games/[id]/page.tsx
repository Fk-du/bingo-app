'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role, GameStatus, BingoClaimResultResponse, CalledNumberResponse } from '@/types';
import { useGameWebSocket } from '@/hooks/useWebSocket';
import { useGameStore } from '@/store/game.store';
import { usePendingClaims, useRejectClaim, useAdminGameState, useApproveAllClaims, useRestartGame, usePauseGame, useResumeGame, useStartGame } from '@/hooks/useGames';
import { ActionButton } from '@/components/ui/Surface';
import { ClaimReviewCard } from '@/components/games/ClaimReviewCard';
import { NumberBoard } from '@/components/games/NumberBoard';
import { MetricCard, SectionHeader, Surface, StatusPill } from '@/components/ui/Surface';
import { PatternMini } from '@/components/games/PatternMini';
import { StartGameButton } from '@/components/games/StartGameButton';
import { patternLabel } from '@/components/games/CreateGameForm';
import { netPrize } from '@/lib/prize';

const MAX_WINNERS = 3;

export default function AdminGameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const gameId = Number(id);
  useGameWebSocket(gameId);

  const {
    gameStatus, calledNumbers, totalNumbersCalled, prizePool, isConnecting,
    setGameStatus, setCalledNumbers, setTotalNumbersCalled, setPrizePool,
  } = useGameStore();

  const { data: pendingClaims, refetch: refetchClaims } = usePendingClaims(gameId);
  const { mutate: rejectClaim, isPending: isRejecting } = useRejectClaim();
  const { mutate: approveAllClaims, isPending: isApprovingAll } = useApproveAllClaims();
  const { mutate: restartGame, isPending: isRestarting } = useRestartGame();
  const { mutate: pauseGame, isPending: isPausing } = usePauseGame();
  const { mutate: resumeGame, isPending: isResuming } = useResumeGame();
  const { mutate: startGame, isPending: isStarting } = useStartGame();
  const { data: adminState } = useAdminGameState(gameId);

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [endedByAction, setEndedByAction] = useState(false);

  // Populate store from REST fallback when WebSocket hasn't delivered data yet
  useEffect(() => {
    if (!adminState) return;
    if (calledNumbers.length === 0 && adminState.calledNumbers.length > 0) {
      const mapped: CalledNumberResponse[] = adminState.calledNumbers.map((n, i) => ({
        id: i, gameId, number: n, sequenceIndex: i, calledAt: null,
      }));
      setCalledNumbers(mapped);
      setTotalNumbersCalled(adminState.totalNumbersCalled);
    }
    if (gameStatus === null) {
      setGameStatus(adminState.status);
    }
    if (prizePool === 0 && adminState.prizePool > 0) {
      setPrizePool(adminState.prizePool);
    }
  }, [adminState, gameId, calledNumbers.length, gameStatus, prizePool,
      setCalledNumbers, setGameStatus, setPrizePool, setTotalNumbersCalled]);

  const calledSet = useMemo(() => new Set(calledNumbers.map((n) => n.number)), [calledNumbers]);

  const claimCount = pendingClaims?.length ?? 0;
  const tooManyWinners = claimCount > MAX_WINNERS;
  const isProcessing = isRejecting || processingId !== null;
  const gameEnded = endedByAction || gameStatus === GameStatus.ENDED;

  useEffect(() => {
    if (gameStatus === GameStatus.CLAIM_PENDING) {
      refetchClaims();
    }
  }, [gameStatus, refetchClaims]);

  const handleApproveAll = () => {
    approveAllClaims(
      { gameId },
      {
        onSuccess: (res) => {
          const data = res.data as BingoClaimResultResponse;
          if (data.restarted) {
            setApprovedCount(0);
            setEndedByAction(false);
            setCalledNumbers([]);
            setTotalNumbersCalled(0);
            setActionMsg(
              res.message ||
                'Too many claims — the game restarted with a fresh number sequence. Players were notified.'
            );
            refetchClaims();
            return;
          }
          setApprovedCount(data.approvedCount ?? approvedCount);
          setEndedByAction(true);
          setActionMsg(
            `${data.approvedCount ?? approvedCount} winners approved — they share the pot. Game ended.`
          );
          refetchClaims();
        },
        onError: (err) => setActionMsg(`Failed: ${err.message}`),
      }
    );
  };

  const handleRestart = () => {
    restartGame(
      { gameId },
      {
        onSuccess: (res) => {
          setActionMsg(res.message || 'Game restarted with a fresh sequence.');
          setCalledNumbers([]);
          setTotalNumbersCalled(0);
          setEndedByAction(false);
          setApprovedCount(0);
          refetchClaims();
        },
        onError: (err) => setActionMsg(`Failed: ${err.message}`),
      }
    );
  };

  const handleStart = () => {
    startGame(
      gameId,
      {
        onSuccess: (res) => {
          setActionMsg(res.message || `Game #${gameId} starting — numbers will begin shortly.`);
          setCalledNumbers([]);
          setTotalNumbersCalled(0);
          setEndedByAction(false);
          setApprovedCount(0);
          refetchClaims();
        },
        onError: (err) => setActionMsg(`Failed: ${err.message}`),
      }
    );
  };

  const handlePause = () => {
    pauseGame(
      gameId,
      {
        onSuccess: (res) => setActionMsg(res.message || 'Game paused'),
        onError: (err) => setActionMsg(`Failed: ${err.message}`),
      }
    );
  };

  const handleResume = () => {
    resumeGame(
      gameId,
      {
        onSuccess: (res) => setActionMsg(res.message || 'Game resuming…'),
        onError: (err) => setActionMsg(`Failed: ${err.message}`),
      }
    );
  };

  const handleReject = (claimId: number, reason?: string) => {
    setProcessingId(claimId);
    rejectClaim(
      { gameId, claimId, reason },
      {
        onSuccess: (res) => {
          setActionMsg(res.message || 'Claim rejected');
          setProcessingId(null);
          refetchClaims();
        },
        onError: (err) => {
          setActionMsg(`Failed: ${err.message}`);
          setProcessingId(null);
        },
      }
    );
  };

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Claim review"
        title={`Game #${gameId}`}
        description="Review pending bingo claims, confirm winners, and close the table when the limit is reached."
      />

      {isConnecting && (
        <div className="mb-4 rounded-[18px] border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          Connecting to game server...
        </div>
      )}

      {actionMsg && (
        <div className="mb-4 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3 text-sm text-bp-text">
          {actionMsg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Status"
          value={<StatusPill status={gameStatus ?? 'UNKNOWN'} />}
          accent="primary"
        />
        <MetricCard label="Progress" value={`${totalNumbersCalled}/75`} accent="success" />
        <MetricCard
          label={`Prize pool${adminState?.commissionPercent ? ` (after ${adminState.commissionPercent}% fee)` : ''}`}
          value={netPrize(prizePool, adminState?.commissionPercent).toLocaleString()}
          accent="gold"
          note={
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              {prizePool > 0 && adminState?.commissionPercent ? (
                <span>collected {prizePool.toLocaleString()}</span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <PatternMini pattern={adminState?.winningPattern} customPatternName={adminState?.customPatternName} customPatternCells={adminState?.customPatternCells} />
                {patternLabel(adminState?.winningPattern, adminState?.customPatternName)}
              </span>
            </span>
          }
        />
        <MetricCard
          label="Winners"
          value={approvedCount}
          accent="warning"
          note={gameStatus === GameStatus.CLAIM_PENDING ? `${claimCount} awaiting review` : `${approvedCount} paid`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">Called numbers</p>
              <h2 className="mt-1 text-lg font-semibold text-bp-text">{calledNumbers.length} total</h2>
            </div>
            <StatusPill status={gameStatus ?? 'UNKNOWN'} />
          </div>
          <div className="mt-4">
            <NumberBoard
              calledNumbers={calledSet}
              lastCalledNumber={calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1].number : null}
              compact
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {gameStatus === GameStatus.REGISTRATION_OPEN && (
              <StartGameButton onStart={handleStart} registeredPlayers={adminState?.playerCount ?? 0} busy={isStarting} />
            )}
            {gameStatus === GameStatus.IN_PROGRESS && (
              <ActionButton onClick={handlePause} disabled={isPausing} variant="danger" className="text-xs">
                {isPausing ? 'Pausing…' : '⏸ Pause'}
              </ActionButton>
            )}
            {gameStatus === GameStatus.PAUSED && (
              <ActionButton onClick={handleResume} disabled={isResuming} variant="success" className="text-xs">
                {isResuming ? 'Resuming…' : '▶ Resume'}
              </ActionButton>
            )}
          </div>
        </Surface>
      </div>

      {gameEnded && (
        <div className="mt-4 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3 text-center text-sm text-bp-text">
          Game ended. {approvedCount} winner(s) approved.
        </div>
      )}

      {gameStatus === GameStatus.CLAIM_PENDING && !gameEnded && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-amber-200">
                Pending claims ({claimCount}){claimCount > 1 ? ' — simultaneous winners' : ''}
              </h2>
              <span className="text-xs text-bp-muted">
                {tooManyWinners
                  ? `More than ${MAX_WINNERS} players claimed — approving will void the round, reshuffle the numbers and start fresh.`
                  : 'Up to 3 winners share the pot equally.'}
              </span>
            </div>
            <div className="flex gap-2">
              {tooManyWinners && (
                <ActionButton onClick={handleRestart} disabled={isRestarting || isProcessing} variant="danger">
                  {isRestarting ? 'Restarting…' : '↻ Restart game'}
                </ActionButton>
              )}
              <ActionButton
                onClick={handleApproveAll}
                disabled={isApprovingAll || isProcessing}
                variant={tooManyWinners ? 'primary' : 'success'}
              >
                {isApprovingAll
                  ? 'Working…'
                  : tooManyWinners
                    ? '↻ Approve → restart & reshuffle'
                    : claimCount === 1
                      ? '✓ Approve winner — pay & end'
                      : `✓ Approve all (${claimCount}) — share pot`}
              </ActionButton>
            </div>
          </div>
          {pendingClaims && pendingClaims.length > 0 ? (
            <div className="space-y-4">
              {pendingClaims.map((claim, i) => (
                <ClaimReviewCard
                  key={claim.id}
                  claim={claim}
                  index={i + 1}
                  onReject={handleReject}
                  isProcessing={isProcessing && processingId === claim.id}
                />
              ))}
            </div>
          ) : (
            <Surface className="p-6 text-center text-bp-muted">Loading claims...</Surface>
          )}
        </div>
      )}

      {gameStatus !== GameStatus.CLAIM_PENDING && !gameEnded && (
        <Surface className="mt-6 p-6 text-center text-bp-muted">
          No pending claims. Game is {gameStatus ?? 'not running'}.
        </Surface>
      )}
    </ProtectedRoute>
  );
}
