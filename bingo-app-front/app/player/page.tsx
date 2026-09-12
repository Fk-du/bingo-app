'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role, GameStatus } from '@/types/enums';
import { useActiveGames } from '@/hooks/useGames';
import { useAuthStore } from '@/store/auth.store';
import { useWallet } from '@/hooks/usePlayers';
import { GameList } from '@/components/games/GameList';
import { CardPickerModal } from '@/components/games/CardPickerModal';
import { TabBar, Surface } from '@/components/ui/Surface';
import { IconCoin, IconWallet } from '@/components/ui/Icons';

type LobbyTab = 'open' | 'my';

export default function PlayerGamesPage() {
  const { data: games, isLoading } = useActiveGames();
  const [tab, setTab] = useState<LobbyTab>('open');
  const [pickerGame, setPickerGame] = useState<{ id: number; entryFee: number } | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleRegister = (id: number) => {
    const game = games?.find((g) => g.id === id);
    if (!game) return;
    setPickerGame({ id: game.id, entryFee: game.entryFee });
  };

  const handlePickerDone = (ok: boolean) => {
    setPickerGame(null);
    if (ok) setNotice({ type: 'success', text: 'Registered! Tap the game to view your card.' });
  };

  const jackpotTotal = useMemo(
    () => games?.reduce((sum, g) => sum + g.prizePool, 0) ?? 0,
    [games]
  );

  const filteredGames = useMemo(() => {
    if (!games) return [];
    if (tab === 'my') {
      return games.filter((g) => g.registered);
    }
    return games.filter((g) => g.status === GameStatus.REGISTRATION_OPEN);
  }, [games, tab]);

  const activeCount = games?.filter(g => g.status === GameStatus.IN_PROGRESS).length ?? 0;
  const { data: wallet } = useWallet();
  const balance = wallet?.balance ?? user?.balance ?? 0;

  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-bp-muted">Welcome,</p>
          <h1 className="text-xl font-bold text-bp-text">{user?.firstName ?? user?.username ?? 'Player'}</h1>
        </div>
        <Link href="/player/wallet">
          <Surface className="flex items-center gap-2 px-3 py-2">
            <IconWallet className="h-4 w-4 text-bp-gold" />
            <span className="font-bold text-bp-gold">{balance.toLocaleString()}</span>
          </Surface>
        </Link>
      </div>

      <div className="bp-jackpot-banner mb-4 overflow-hidden rounded-2xl p-4 bp-glow-pulse relative">
        <div className="absolute inset-0 bg-gradient-to-br from-bp-gold/5 via-transparent to-bp-primary/5" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-bp-gold/90">Jackpot Pool</p>
            <p className="mt-1 text-3xl font-black text-bp-gold drop-shadow-[0_0_12px_rgba(242,201,76,0.3)]">
              {jackpotTotal.toLocaleString()}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="bp-live-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bp-danger" />
                {activeCount} live
              </span>
              <span className="text-xs text-bp-muted">{games?.length ?? 0} games available</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <IconCoin className="h-10 w-10 text-bp-gold drop-shadow-[0_0_8px_rgba(242,201,76,0.4)]" />
            <span className="text-[10px] text-bp-gold/60 font-medium uppercase tracking-wider">Total Pool</span>
          </div>
        </div>
      </div>

      <TabBar
        tabs={[
          { id: 'open', label: 'Open' },
          { id: 'my', label: 'My Games' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as LobbyTab)}
      />

      {notice && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-bp-success/40 bg-bp-success/10 text-emerald-300'
              : 'border-bp-danger/40 bg-bp-danger/10 text-red-200'
          }`}
        >
          <span className="text-base">{notice.type === 'success' ? '✓' : '✕'}</span>
          {notice.text}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-32 animate-pulse rounded-2xl bg-bp-surface" />
            <div className="h-32 animate-pulse rounded-2xl bg-bp-surface" />
          </div>
        ) : (
          <GameList games={filteredGames} role="player" onRegister={handleRegister} registeringId={null} />
        )}
      </div>

      {pickerGame && (
        <CardPickerModal
          gameId={pickerGame.id}
          entryFee={pickerGame.entryFee}
          onClose={() => setPickerGame(null)}
          onRegistered={() => handlePickerDone(true)}
        />
      )}
    </ProtectedRoute>
  );
}
