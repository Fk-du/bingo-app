'use client';

import { useState } from 'react';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useActiveGames, useStartGame, useCancelGame, useEndGame } from '@/hooks/useGames';
import { getApiErrorMessage } from '@/api/client';
import { CreateGameForm } from '@/components/games/CreateGameForm';
import { GameList } from '@/components/games/GameList';
import { SectionHeader, Surface } from '@/components/ui/Surface';

type Notice = { type: 'success' | 'error'; text: string } | null;

export default function AdminGamesPage() {
  const { data: games, isLoading } = useActiveGames();
  const { mutate: startGame } = useStartGame();
  const { mutate: cancelGame } = useCancelGame();
  const { mutate: endGame } = useEndGame();

  const [startingId, setStartingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const handleStart = (id: number) => {
    if (startingId != null || busyId != null) return;
    setNotice(null);
    setStartingId(id);
    setBusyId(id);
    startGame(id, {
      onSuccess: () => {
        setBusyId(null);
        setStartingId(null);
        setNotice({ type: 'success', text: `Game #${id} starting — numbers will begin shortly.` });
      },
      onError: (err) => {
        setBusyId(null);
        setStartingId(null);
        setNotice({ type: 'error', text: getApiErrorMessage(err) });
      },
    });
  };

  const handleCancel = (id: number) => {
    setBusyId(id);
    setNotice(null);
    cancelGame(id, {
      onSuccess: () => {
        setBusyId(null);
        setNotice({ type: 'success', text: `Game #${id} cancelled and entry fees refunded.` });
      },
      onError: (err) => {
        setBusyId(null);
        setNotice({ type: 'error', text: getApiErrorMessage(err) });
      },
    });
  };

  const handleEnd = (id: number) => {
    setBusyId(id);
    setNotice(null);
    endGame(id, {
      onSuccess: () => {
        setBusyId(null);
        setNotice({ type: 'success', text: `Game #${id} ended.` });
      },
      onError: (err) => {
        setBusyId(null);
        setNotice({ type: 'error', text: getApiErrorMessage(err) });
      },
    });
  };

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Games"
        title="Game management"
        description="Open registrations, control live rounds, and close tables from one place."
      />

      <Surface className="p-4">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">Create game</p>
          <h2 className="mt-1 text-lg font-semibold text-bp-text">New table setup</h2>
        </div>
        <CreateGameForm />
      </Surface>

      <Surface className="mt-4 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">Active games</p>
            <h2 className="mt-1 text-lg font-semibold text-bp-text">Current queue</h2>
          </div>
          <span className="rounded-full border border-bp-border bg-bp-surface/70 px-3 py-1 text-xs font-semibold text-bp-text">
            {isLoading ? 'Loading' : games?.length ?? 0}
          </span>
        </div>
        {notice && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-bp-success/40 bg-bp-success/10 text-emerald-300'
                : 'border-bp-danger/40 bg-bp-danger/10 text-red-200'
            }`}
          >
            <span className="text-base">{notice.type === 'success' ? '✓' : '✕'}</span>
            {notice.text}
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : (
          <GameList
            games={games ?? []}
            role="admin"
            onStart={handleStart}
            onCancel={handleCancel}
            onEnd={handleEnd}
            startingId={startingId}
            busyId={busyId}
          />
        )}
      </Surface>
    </ProtectedRoute>
  );
}
