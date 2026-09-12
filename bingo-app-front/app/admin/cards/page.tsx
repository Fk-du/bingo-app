'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useAvailableCards, useCardRequests, useCreateCardRequest } from '@/hooks/useCards';
import { getApiErrorMessage } from '@/api/client';
import { ActionButton, EmptyState, Field, MetricCard, SectionHeader, Surface, StatusPill, TextField } from '@/components/ui/Surface';

const QUICK_QUANTITIES = [25, 50, 100];

export default function AgentCardsPage() {
  const { data: pool } = useAvailableCards(1);
  const { data: requests, isLoading: loadingRequests } = useCardRequests();
  const { mutate: createRequest, isPending } = useCreateCardRequest();
  const [quantity, setQuantity] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const pending = requests?.filter((r) => r.status === 'PENDING') ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    createRequest(quantity, {
      onSuccess: () => {
        setSuccess('Card request submitted! The super admin will add them shortly.');
      },
      onError: (err) => setError(getApiErrorMessage(err)),
    });
  };

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Cards"
        title="Card pool"
        description="Cards are shared across all your games. Players pick a free card when they join."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricCard label="Available Cards" value={pool?.total.toLocaleString() ?? '—'} accent="success" />
        <MetricCard label="Pending Requests" value={pending.length} accent="warning" />
        <MetricCard
          label="Cards Requested"
          value={requests ? requests.reduce((s, r) => s + r.quantity, 0).toLocaleString() : '—'}
          accent="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <Surface className="p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">Need more</p>
          <h2 className="mt-1 text-lg font-semibold text-bp-text">Request cards</h2>
          <p className="mt-1 text-xs text-bp-muted">
            Cards are only added by the super admin, so runs out fast when many games are open.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field label="Quantity">
              <TextField
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                min="1"
                max="500"
              />
            </Field>
            <div className="flex gap-2">
              {QUICK_QUANTITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    quantity === q
                      ? 'border-bp-primary bg-bp-primary/15 text-bp-primary'
                      : 'border-bp-border bg-bp-bg text-bp-muted hover:border-bp-primary/40'
                  }`}
                >
                  +{q}
                </button>
              ))}
            </div>
            {error && <p className="-mt-2 text-xs font-medium text-red-400">{error}</p>}
            {success && <p className="-mt-2 text-xs font-medium text-emerald-400">{success}</p>}
            <ActionButton type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Requesting…' : 'Request cards'}
            </ActionButton>
            <p className="text-center text-[10px] text-bp-muted">
              Requesting a card costs nothing. The super admin generates unique cards in your pool.
            </p>
          </form>
        </Surface>

        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">History</p>
              <h2 className="mt-1 text-lg font-semibold text-bp-text">Card requests</h2>
            </div>
            <span className="rounded-full border border-bp-border bg-bp-surface/70 px-3 py-1 text-xs font-semibold text-bp-text">
              {requests?.length ?? 0}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {loadingRequests ? (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
                <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
              </div>
            ) : requests?.length ? (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-bp-text">
                      {req.quantity} card{req.quantity !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-bp-muted">
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <p className="mt-1 text-xs font-medium text-red-400">Reason: {req.rejectionReason}</p>
                    )}
                    <div className="mt-1">
                      <StatusPill status={req.status} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No card requests" description="New requests will appear here." />
            )}
          </div>
        </Surface>
      </div>
    </ProtectedRoute>
  );
}