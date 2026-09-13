'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role, GameStatus } from '@/types/enums';
import { usePlayerCardHistory } from '@/hooks/useGames';
import { EmptyState, SectionHeader, Surface } from '@/components/ui/Surface';

function money(n: number): string {
  return `${n.toLocaleString()} coins`;
}

export default function HistoryPage() {
  const { data: history, isLoading } = usePlayerCardHistory();

  const ended = history?.filter((h) => h.game.status === GameStatus.ENDED) ?? [];

  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <SectionHeader
        eyebrow="History"
        title="Completed games"
        description="Every card you held, its outcome, and how much it paid."
      />

      <Surface className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : ended.length === 0 ? (
          <EmptyState title="No completed games yet" description="Finished tables will show up here after they close." />
        ) : (
          <div className="space-y-3">
            {ended.map((entry) => {
              const game = entry.game;
              const wonCards = entry.cards.filter((c) => c.winner);
              return (
                <div key={game.id} className="overflow-hidden rounded-[18px] border border-bp-border bg-bp-surface/60">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold text-bp-text">Game #{game.id}</p>
                      <p className="mt-0.5 text-xs text-bp-muted">
                        {game.entryFee} coins/card · {entry.cards.length} card{entry.cards.length === 1 ? '' : 's'}
                        {game.endTime ? ` · ${new Date(game.endTime).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-bp-muted">Spent {money(entry.bet)}</p>
                      {entry.win > 0 && <p className="text-xs font-semibold text-emerald-300">Won +{money(entry.win)}</p>}
                      {entry.refund > 0 && <p className="text-xs font-semibold text-bp-muted">Refund +{money(entry.refund)}</p>}
                      <p className={`text-sm font-black ${entry.net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {entry.net >= 0 ? '+' : ''}Net {money(entry.net)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-bp-border bg-bp-surface/40">
                    <div className="divide-y divide-bp-border">
                      {entry.cards.map((card) => (
                        <div key={card.cardId} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-bp-border bg-bp-bg px-1.5 text-xs font-bold text-bp-muted">
                            #{card.cardId}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-bp-text">
                              {card.winner ? 'Winning card' : card.banned ? 'Banned card' : 'Played'}
                            </p>
                            <p className="text-[11px] text-bp-muted">
                              Registered {new Date(card.registeredAt).toLocaleDateString()}
                              {card.claimResult === 'REJECTED' && card.rejectionReason
                                ? ` · Rejected: ${card.rejectionReason}`
                                : ''}
                            </p>
                          </div>
                          {card.winner ? (
                            <span className="shrink-0 rounded-full border border-bp-success/40 bg-bp-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              🏆 Winner
                            </span>
                          ) : card.banned ? (
                            <span className="shrink-0 rounded-full border border-bp-danger/50 bg-bp-danger/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
                              Banned
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full border border-bp-border bg-bp-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-bp-muted">
                              Played
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {wonCards.length > 0 && (
                      <p className="border-t border-bp-border bg-bp-success/5 px-4 py-2 text-center text-[11px] font-bold text-emerald-300">
                        🎉 Winning card{wonCards.length > 1 ? 's' : ''}: {wonCards.map((c) => `#${c.cardId}`).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Surface>
    </ProtectedRoute>
  );
}