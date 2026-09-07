'use client';

import { useMemo, useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { usePlayers, useFundPlayer, useAdminWallet } from '@/hooks/usePlayers';
import { FundPlayerDialog } from '@/components/players/FundPlayerDialog';
import {
  ActionButton,
  EmptyState,
  MetricCard,
  SectionHeader,
  Surface,
  TextField,
} from '@/components/ui/Surface';
import { IconCoin, IconWallet } from '@/components/ui/Icons';

function playerDisplayName(p: { firstName?: string; lastName?: string; username?: string; userId: number }): string {
  const full = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
  return full || p.username || `Player #${p.userId}`;
}

export default function AdminPlayersPage() {
  const { data: players, isLoading } = usePlayers();
  const { data: adminWallet } = useAdminWallet();
  const { mutate: fundPlayer, isPending } = useFundPlayer();
  const [fundTarget, setFundTarget] = useState<{
    id: number;
    name: string;
    balance: number;
  } | null>(null);
  const [search, setSearch] = useState('');

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => {
      const name = playerDisplayName(p).toLowerCase();
      return name.includes(q) || String(p.userId).includes(q);
    });
  }, [players, search]);

  const totalPlayerBalance =
    players?.reduce((sum, p) => sum + p.balance, 0) ?? 0;

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Players"
        title="Player registry"
        description="Manage players and their balances."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Your Balance"
          value={adminWallet?.balance.toLocaleString() ?? '—'}
          note="Available to fund"
          accent="gold"
        />
        <MetricCard
          label="Total Players"
          value={players?.length ?? 0}
          accent="primary"
        />
        <MetricCard
          label="Player Balances"
          value={totalPlayerBalance.toLocaleString()}
          note="Sum across all players"
          accent="success"
        />
        <MetricCard
          label="Frozen Funds"
          value={
            players
              ?.reduce((sum, p) => sum + p.frozenBalance, 0)
              .toLocaleString() ?? '—'
          }
          note="Pending withdrawals"
          accent="warning"
        />
      </div>

      <Surface className="p-4">
        <div className="mb-4">
          <TextField
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or player ID..."
            aria-label="Search players"
            className="w-full"
          />
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : filteredPlayers.length ? (
          <div className="grid gap-2">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-bp-border bg-bp-surface-elevated text-xs font-bold text-bp-muted">
                    #{player.id}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-bp-text">
                      {playerDisplayName(player)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-bp-muted">
                      <span className="inline-flex items-center gap-1">
                        <IconCoin className="h-3.5 w-3.5" />
                        <span className="font-medium text-bp-gold">
                          {player.balance.toLocaleString()}
                        </span>
                      </span>
                      {player.frozenBalance > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <IconWallet className="h-3.5 w-3.5" />
                          <span className="text-amber-400">
                            {player.frozenBalance.toLocaleString()} frozen
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ActionButton
                    variant="gold"
                    className="whitespace-nowrap px-3 py-1.5 text-xs"
                    onClick={() =>
                      setFundTarget({
                        id: player.userId,
                        name: playerDisplayName(player),
                        balance: player.balance,
                      })
                    }
                  >
                    Fund
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={search ? 'No matching players' : 'No players found'}
            description={search ? 'Try a different name or ID.' : 'New players will appear here once they register.'}
          />
        )}
      </Surface>

      {fundTarget && (
        <FundPlayerDialog
          playerId={fundTarget.id}
          playerName={fundTarget.name}
          currentBalance={fundTarget.balance}
          onClose={() => setFundTarget(null)}
          onConfirm={(amount) => {
            fundPlayer({ id: fundTarget.id, amount });
            setFundTarget(null);
          }}
          isPending={isPending}
        />
      )}
    </ProtectedRoute>
  );
}
