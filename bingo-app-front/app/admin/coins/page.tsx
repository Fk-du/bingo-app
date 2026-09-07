'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useCoinRequests, useHandleCoinRequest } from '@/hooks/useCoins';
import { usePlayers, useAdminWallet } from '@/hooks/usePlayers';
import { PaymentProof } from '@/components/common/PaymentProof';
import { ActionButton, EmptyState, MetricCard, SectionHeader, SelectField, Surface, StatusPill, TabBar, TextAreaField } from '@/components/ui/Surface';

type RequestTab = 'PENDING' | 'APPROVED' | 'REJECTED';

const COMMON_REASONS = [
  'Payment proof is not clear or readable',
  'Amount received does not match the request',
  'No payment proof / screenshot attached',
  'Duplicate request already handled',
  'Request does not match our records',
  'Payment not yet received',
];

interface ApproveDialogProps {
  requestId: number;
  amount: number;
  playerLabel: string;
  screenshotUrl: string | null;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason?: string) => void;
}

function ApproveDialog({ requestId, amount, playerLabel, screenshotUrl, onClose, onApprove, onReject }: ApproveDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <Surface className="relative w-full max-w-sm p-5">
        <p className="text-lg font-bold text-bp-text">Review Request</p>
        <p className="mt-1 text-sm text-bp-muted">
          {playerLabel} requested <span className="font-semibold text-bp-gold">{amount.toLocaleString()}</span> coins
        </p>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-bp-muted">Payment proof</p>
          {screenshotUrl ? (
            <div className="mt-2">
              <PaymentProof url={screenshotUrl} className="h-32 w-full" />
              <p className="mt-1 text-[11px] text-bp-muted">Tap the image to enlarge</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-bp-muted">No screenshot attached.</p>
          )}
        </div>

        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-bp-muted">Rejection reason</p>
          <SelectField
            value={reason}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__custom__') {
                setReason('');
              } else {
                setReason(v);
              }
            }}
            className="mb-2"
          >
            <option value="">Choose a common reason or type custom…</option>
            {COMMON_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="__custom__">Custom…</option>
          </SelectField>
          <TextAreaField
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Only used when rejecting"
            rows={2}
          />
        </div>

        <div className="mt-6 flex gap-2">
          <ActionButton variant="secondary" onClick={onClose} className="flex-1">
            Back
          </ActionButton>
          <ActionButton variant="danger" onClick={() => { onReject(requestId, reason || undefined); onClose(); }} className="flex-1">
            Reject
          </ActionButton>
          <ActionButton variant="success" onClick={() => { onApprove(requestId); onClose(); }} className="flex-1">
            Approve
          </ActionButton>
        </div>
      </Surface>
    </div>
  );
}

export default function AdminCoinsPage() {
  const { data: requests, isLoading } = useCoinRequests();
  const { data: players } = usePlayers();
  const { data: adminWallet } = useAdminWallet();
  const { mutate: handleRequest } = useHandleCoinRequest();
  const [reviewTarget, setReviewTarget] = useState<{
    id: number;
    amount: number;
    userId: number;
    screenshotUrl: string | null;
  } | null>(null);
  const [tab, setTab] = useState<RequestTab>('PENDING');

  const pending = requests?.filter((r) => r.status === 'PENDING') ?? [];
  const approved = requests?.filter((r) => r.status === 'APPROVED') ?? [];
  const totalApproved = approved.reduce((s, r) => s + r.amount, 0);

  const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;
  const filtered = (requests ?? [])
    .filter((r) => r.status === tab)
    .sort((a, b) => order[a.status as RequestTab] - order[b.status as RequestTab]);

  const playerLabel = (userId: number) => {
    const player = players?.find((p) => p.userId === userId);
    return player ? `Player #${player.userId}` : `User #${userId}`;
  };

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Coin requests"
        title="Top-up approvals"
        description="Approve or reject wallet requests from players."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricCard
          label="Your Balance"
          value={adminWallet?.balance.toLocaleString() ?? '—'}
          note="Available to fund"
          accent="gold"
        />
        <MetricCard label="Pending" value={pending.length} accent="warning" />
        <MetricCard label="Approved Total" value={totalApproved.toLocaleString()} accent="success" />
      </div>

      <TabBar
        tabs={[
          { id: 'PENDING', label: `Pending (${pending.length})` },
          { id: 'APPROVED', label: `Approved (${approved.length})` },
          { id: 'REJECTED', label: `Rejected (${(requests?.filter((r) => r.status === 'REJECTED') ?? []).length})` },
        ]}
        active={tab}
        onChange={(id) => setTab(id as RequestTab)}
      />

      <Surface className="p-4 mt-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : filtered.length ? (
          <div className="space-y-2">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <PaymentProof url={req.screenshotUrl} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-bp-text">
                      {req.amount.toLocaleString()} coins
                    </p>
                    <p className="mt-0.5 text-xs text-bp-muted">
                      {playerLabel(req.userId)} &middot; {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-1">
                      <StatusPill status={req.status} />
                    </div>
                  </div>
                </div>
                {req.status === 'PENDING' && (
                  <div className="flex shrink-0 gap-2">
                    <ActionButton
                      variant="success"
                      onClick={() => setReviewTarget({ id: req.id, amount: req.amount, userId: req.userId, screenshotUrl: req.screenshotUrl })}
                    >
                      Review
                    </ActionButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No requests here" description={`No ${tab.toLowerCase()} requests in this view.`} />
        )}
      </Surface>

      {reviewTarget && (
        <ApproveDialog
          requestId={reviewTarget.id}
          amount={reviewTarget.amount}
          playerLabel={playerLabel(reviewTarget.userId)}
          screenshotUrl={reviewTarget.screenshotUrl}
          onClose={() => setReviewTarget(null)}
          onApprove={(id) => handleRequest({ id, action: 'APPROVE' })}
          onReject={(id, reason) => handleRequest({ id, action: 'REJECT', reason })}
        />
      )}
    </ProtectedRoute>
  );
}
