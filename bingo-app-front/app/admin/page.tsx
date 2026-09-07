'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role, GameStatus } from '@/types/enums';
import { useActiveGames } from '@/hooks/useGames';
import { useDashboardSummary, useRevenueReport } from '@/hooks/useReports';
import { useAuthStore } from '@/store/auth.store';
import { ActionButton, LiveBadge, MetricCard, Surface, StatusPill } from '@/components/ui/Surface';
import { IconPlus, IconCoin } from '@/components/ui/Icons';

export default function AdminDashboard() {
  const { data: games } = useActiveGames();
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary();
  const { data: revenue, isLoading: loadingRevenue } = useRevenueReport();
  const user = useAuthStore((s) => s.user);

  const pendingCoins = summary?.pendingCoinRequests ?? 0;
  const pendingWithdrawals = summary?.pendingWithdrawals ?? 0;
  const pendingFunds = summary?.pendingFundRequests ?? 0;
  const activeGame = games?.find((g) => g.status === GameStatus.IN_PROGRESS);
  const pendingClaimsGames = summary?.pendingClaimsCount ?? 0;
  const displayName = user?.firstName ?? user?.username ?? 'Agent';
  const balance = summary?.balance ?? user?.balance ?? 0;

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-bp-muted">Welcome back,</p>
          <h1 className="text-2xl font-bold text-bp-text">Agent {displayName}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-bp-muted uppercase tracking-wider">Balance</p>
          <p className="text-xl font-bold text-bp-gold">{balance.toLocaleString()}</p>
        </div>
      </div>

      {activeGame && (
        <Surface className="mb-4 border-bp-primary/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-bp-muted">Active Game</p>
              <p className="mt-1 text-lg font-bold text-bp-text">Game #{activeGame.id}</p>
              <p className="text-sm text-bp-gold">{activeGame.prizePool.toLocaleString()} coin pool</p>
            </div>
            <LiveBadge />
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/admin/games/${activeGame.id}`} className="flex-1">
              <ActionButton variant="outline" className="w-full">
                Manage
              </ActionButton>
            </Link>
          </div>
        </Surface>
      )}

      {!activeGame && (
        <Link href="/admin/games">
          <Surface className="mb-4 flex cursor-pointer items-center justify-between gap-3 border border-dashed border-bp-primary/30 p-4 transition hover:border-bp-primary/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bp-primary/10">
                <IconPlus className="h-5 w-5 text-bp-primary" />
              </div>
              <div>
                <p className="font-semibold text-bp-text">Create a New Game</p>
                <p className="text-xs text-bp-muted">Set entry fee and start a bingo session</p>
              </div>
            </div>
            <span className="text-sm text-bp-primary">&rarr;</span>
          </Surface>
        </Link>
      )}

      {pendingClaimsGames > 0 && (
        <Link
          href={activeGame ? `/admin/games/${activeGame.id}` : '/admin/games'}
          className="mb-4 block"
        >
          <Surface className="flex items-center justify-between gap-3 border-bp-warning/40 bg-bp-warning/10 p-4 transition hover:border-bp-warning/70">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bp-warning/20 text-bp-warning">⚠</span>
              <div>
                <p className="font-semibold text-bp-text">
                  {pendingClaimsGames} pending claim{pendingClaimsGames > 1 ? 's' : ''} to review
                </p>
                <p className="text-xs text-bp-muted">
                  {activeGame ? `Review in active game #${activeGame.id}` : 'Open the active game to review'}
                </p>
              </div>
            </div>
            <span className="whitespace-nowrap text-sm font-semibold text-bp-warning">Review now &rarr;</span>
          </Surface>
        </Link>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link href="/admin/fund-requests">
          <Surface className="p-4 text-center transition hover:border-bp-primary/40">
            <IconCoin className="mx-auto mb-1 h-5 w-5 text-bp-gold" />
            <p className="text-sm font-semibold text-bp-text">Request Funds</p>
          </Surface>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href={pendingClaimsGames > 0 ? (activeGame ? `/admin/games/${activeGame.id}` : '/admin/games') : '/admin/games'}>
          <MetricCard
            label="Pending Claims"
            value={pendingClaimsGames}
            accent="warning"
            note={pendingClaimsGames > 0 ? 'Needs review' : 'None pending'}
          />
        </Link>
        <Link href="/admin/coins">
          <MetricCard label="Coin Requests" value={loadingSummary ? '...' : pendingCoins} accent="primary" />
        </Link>
        <Link href="/admin/withdrawals">
          <MetricCard label="Withdrawals" value={loadingSummary ? '...' : pendingWithdrawals} accent="danger" />
        </Link>
        <Link href="/admin/games">
          <MetricCard label="Total Games" value={loadingSummary ? '...' : summary?.totalGames ?? 0} accent="success" />
        </Link>
      </div>

      <Surface className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bp-muted">My Revenue</p>
          <Link href="/admin/coins" className="text-xs text-bp-primary">
            View transactions
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-bp-muted">Total Commission Earned</p>
            <p className="mt-1 text-xl font-bold text-bp-gold">
              {loadingRevenue ? '...' : (revenue?.totalCommission ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-bp-muted">Commission Today</p>
            <p className="mt-1 text-xl font-bold text-bp-text">
              {loadingRevenue ? '...' : (revenue?.todayCommission ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Surface>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Surface className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bp-muted">Players</p>
          <p className="mt-1.5 text-2xl font-bold text-bp-text">{summary?.totalPlayers ?? 0}</p>
          <div className="mt-3 space-y-1.5">
            {(summary?.recentPlayers ?? []).slice(0, 3).map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-lg bg-bp-bg px-3 py-1.5">
                <p className="text-sm text-bp-text">
                  {[player.firstName, player.lastName].filter(Boolean).join(' ') || player.username || `Player #${player.userId}`}
                </p>
                <p className="text-xs text-bp-muted">ID {player.userId}</p>
              </div>
            ))}
            {(!summary?.recentPlayers || summary.recentPlayers.length === 0) && (
              <p className="py-2 text-center text-xs text-bp-muted">No players yet. Share your invite link!</p>
            )}
          </div>
          {summary && summary.totalPlayers > 0 && (
            <Link href="/admin/players" className="mt-2 block text-center text-xs text-bp-primary">
              View all {summary.totalPlayers} players
            </Link>
          )}
        </Surface>
        <Surface className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-bp-muted">Fund Requests</p>
          <p className="mt-1.5 text-2xl font-bold text-bp-text">{pendingFunds}</p>
          <p className="mt-1 text-xs text-bp-muted">
            {pendingFunds > 0 ? `${pendingFunds} pending approval` : 'No pending requests'}
          </p>
          {pendingFunds > 0 && (
            <Link href="/admin/fund-requests">
              <ActionButton variant="outline" className="mt-3 w-full">
                Review
              </ActionButton>
            </Link>
          )}
        </Surface>
      </div>

      <Surface className="mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-bp-text">Game History</h2>
          <Link href="/admin/games" className="text-sm text-bp-primary">
            View all
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {summary?.recentGames?.length ? (
            summary.recentGames.slice(0, 5).map((game) => (
              <Link
                key={game.id}
                href={`/admin/games/${game.id}`}
                className="flex items-center justify-between rounded-xl border border-bp-border bg-bp-bg px-3 py-2.5 transition hover:border-bp-primary/40"
              >
                <div>
                  <p className="text-sm font-medium text-bp-text">Game #{game.id}</p>
                  <p className="text-xs text-bp-muted">
                    Entry {game.entryFee} · Pool {game.prizePool}
                    {' · '}
                    <span className="text-bp-gold">+{game.commissionEarned?.toLocaleString() ?? 0} earned</span>
                  </p>
                </div>
                {game.status === GameStatus.IN_PROGRESS ? (
                  <LiveBadge />
                ) : (
                  <StatusPill status={game.status} />
                )}
              </Link>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-bp-muted">
              {loadingSummary ? 'Loading...' : 'No games yet. Create your first game!'}
            </p>
          )}
        </div>
      </Surface>
    </ProtectedRoute>
  );
}
