'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useCardRequests, useProcessCardRequest } from '@/hooks/useCards';
import { getApiErrorMessage } from '@/api/client';
import { ActionButton, EmptyState, MetricCard, SectionHeader, StatusPill, Surface } from '@/components/ui/Surface';

export default function SuperAdminCardsPage() {
  const { data: requests, isLoading } = useCardRequests();
  const { mutate: process, isPending } = useProcessCardRequest();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = requests?.filter((r) => r.status === 'PENDING') ?? [];
  const history = requests?.filter((r) => r.status !== 'PENDING') ?? [];

  const handleProcess = (id: number, action: 'APPROVE' | 'REJECT') => {
    setError(null);
    process(
      { id, action, reason: action === 'REJECT' ? reason.trim() || undefined : undefined },
      {
        onSuccess: () => {
          setRejectId(null);
          setReason('');
        },
        onError: (err) => setError(getApiErrorMessage(err)),
      }
    );
  };

  return (
    <ProtectedRoute roles={[Role.SUPER_ADMIN]}>
      <SectionHeader
        eyebrow="Cards"
        title="Card pool requests"
        description="Approve card additions to an agent's pool. Cards become available to players immediately."
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <MetricCard label="Pending Requests" value={pending.length} accent="warning" />
        <MetricCard
          label="Cards Requested"
          value={requests ? requests.reduce((s, r) => s + r.quantity, 0).toLocaleString() : '—'}
          accent="primary"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-bp-danger/40 bg-bp-danger/15 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <Surface className="p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">Pending</p>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          ) : pending.length ? (
            pending.map((req) => (
              <div
                key={req.id}
                className="rounded-[18px] border border-bp-border bg-bp-surface/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-bp-text">
                      Agent ID {req.adminUserId}
                    </p>
                    <p className="mt-0.5 text-xs text-bp-muted">
                      Requests {req.quantity} new card{req.quantity !== 1 ? 's' : ''} ·{' '}
                      {new Date(req.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionButton
                      variant="success"
                      onClick={() => handleProcess(req.id, 'APPROVE')}
                      disabled={isPending}
                      className="px-4 py-2 text-xs font-bold tracking-wide"
                    >
                      {isPending ? '…' : '✓ Approve'}
                    </ActionButton>
                    {rejectId === req.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="w-40 rounded-lg border border-bp-border bg-bp-bg px-2 py-1.5 text-xs text-bp-text"
                        />
                        <button
                          onClick={() => handleProcess(req.id, 'REJECT')}
                          className="rounded-lg border border-bp-danger/40 bg-bp-danger/15 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-bp-danger/30"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setRejectId(null);
                            setReason('');
                          }}
                          className="rounded-lg border border-bp-border bg-bp-bg px-3 py-1.5 text-xs font-bold text-bp-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setRejectId(req.id);
                          setReason('');
                        }}
                        className="rounded-lg border border-bp-border bg-bp-bg px-3 py-2 text-xs font-bold text-bp-muted transition hover:border-bp-danger/50 hover:text-bp-danger"
                      >
                        ✕ Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No pending requests" description="Agent card requests will appear here." />
          )}
        </div>
      </Surface>

      <Surface className="mt-4 p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">History</p>
        <div className="mt-3 space-y-2">
          {history.length ? (
            history.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-bp-text">
                    Agent ID {req.adminUserId} · {req.quantity} card{req.quantity !== 1 ? 's' : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-bp-muted">
                    {new Date(req.createdAt).toLocaleString()}
                    {req.approvedAt ? ` · approved ${new Date(req.approvedAt).toLocaleString()}` : ''}
                  </p>
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <p className="mt-1 text-xs font-medium text-red-400">Reason: {req.rejectionReason}</p>
                  )}
                </div>
                <StatusPill status={req.status} />
              </div>
            ))
          ) : (
            <EmptyState title="No history yet" description="Processed requests will appear here." />
          )}
        </div>
      </Surface>
    </ProtectedRoute>
  );
}