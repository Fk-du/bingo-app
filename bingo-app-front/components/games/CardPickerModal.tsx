import { useCallback, useMemo, useState } from 'react';
import { BingoCard } from './BingoCard';
import { ActionButton } from '@/components/ui/Surface';
import { useAvailableCards } from '@/hooks/useCards';
import { useRegisterForGame } from '@/hooks/useGames';
import { getApiErrorMessage } from '@/api/client';

interface CardPickerModalProps {
  gameId: number;
  entryFee: number;
  onClose: () => void;
  onRegistered?: () => void;
}

const COLS = 2;
const PAGE_SIZE = 100;

export function CardPickerModal({ gameId, entryFee, onClose, onRegistered }: CardPickerModalProps) {
  const [page, setPage] = useState(1);
  const { data: pool, isLoading } = useAvailableCards(page);
  const { mutate: register, isPending } = useRegisterForGame();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const poolCards = pool?.cards;
  const cards = useMemo(() => poolCards ?? [], [poolCards]);
  const total = pool?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = useMemo(() => {
    const out: typeof cards = [];
    for (let i = 0; i < cards.length; i += COLS) out.push(...cards.slice(i, i + COLS));
    return out;
  }, [cards]);

  const handlePick = useCallback((cardId: number) => {
    setError(null);
    setSelectedId(cardId);
    register({ id: gameId, cardId }, { onSuccess: () => { onRegistered?.(); onClose(); }, onError: (err) => { setError(getApiErrorMessage(err)); setSelectedId(null); } });
  }, [gameId, register, onClose, onRegistered]);

  const handleAutoPick = useCallback(() => {
    setError(null);
    register({ id: gameId }, { onSuccess: () => { onRegistered?.(); onClose(); }, onError: (err) => setError(getApiErrorMessage(err)) });
  }, [gameId, register, onClose, onRegistered]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-bp-border bg-bp-surface shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-bp-border bg-bp-bg/60 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-bp-text">Pick your card</p>
            <p className="mt-0.5 text-xs text-bp-muted">
              {total.toLocaleString()} free · {entryFee} coins to enter
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-bp-border bg-bp-bg text-bp-muted transition hover:border-bp-danger/50 hover:text-bp-danger"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-xl border border-bp-danger/40 bg-bp-danger/15 px-3 py-2 text-xs text-red-200">{error}</div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0,1].map((i) => (
                <div key={i} className="h-[180px] animate-pulse rounded-2xl bg-bp-bg/60" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="py-8 text-center text-sm text-bp-muted">
              <p className="font-semibold text-bp-text">No cards available</p>
              <p className="mt-1">Ask your agent to request more cards.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {rows.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handlePick(card.id)}
                    disabled={isPending || selectedId !== null}
                    className={`relative rounded-2xl border bg-bp-bg/60 p-2 text-center transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-bp-primary disabled:opacity-60 ${
                      selectedId === card.id ? 'border-bp-gold ring-2 ring-bp-gold/50' : 'border-bp-border'
                    }`}
                  >
                    <span className="absolute left-2 top-1.5 rounded-full bg-bp-bg/80 px-1.5 py-0.5 text-[9px] font-bold text-bp-muted">
                      #{card.id}
                    </span>
                    {card.grid ? (
                      <BingoCard numbers={card.grid} calledNumbers={new Set<number>()} autoMark size="sm" />
                    ) : (
                      <div className="h-[180px] animate-pulse rounded-xl bg-bp-surface" />
                    )}
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-full border border-bp-border bg-bp-bg px-3 py-1.5 text-xs font-bold text-bp-muted transition hover:border-bp-primary/40 disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="text-xs font-bold text-bp-muted">
                    Page {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-full border border-bp-border bg-bp-bg px-3 py-1.5 text-xs font-bold text-bp-muted transition hover:border-bp-primary/40 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-bp-border bg-bp-bg/60 px-4 py-3 flex flex-col gap-2">
          <ActionButton variant="primary" onClick={handleAutoPick} disabled={isPending} className="w-full py-3 text-sm font-bold tracking-wide">
            {isPending ? '✦ Registering…' : '✦ Auto-pick best card'}
          </ActionButton>
          <p className="text-center text-[10px] text-bp-muted">Server picks the first free card for you</p>
        </div>
      </div>
    </div>
  );
}