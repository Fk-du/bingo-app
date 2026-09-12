'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useAllOwnerFeeSummary, useOwnerFeeSettlements, useHandleFeeSettlement } from '@/hooks/useAgents';
import { AdminOwnerFeeSummaryResponse, OwnerFeeSettlementResponse } from '@/types/agent';
import { PaymentProof } from '@/components/common/PaymentProof';
import { ActionButton, EmptyState, MetricCard, SectionHeader, Surface, StatusPill } from '@/components/ui/Surface';

function agentLabel(agent: AdminOwnerFeeSummaryResponse) {
  return agent.businessName ?? agent.username ?? `Agent #${agent.adminUserId}`;
}

function ManageDialog({ agent, settlements, onApprove, onReject, onClose }: {
  agent: AdminOwnerFeeSummaryResponse;
  settlements: OwnerFeeSettlementResponse[];
  onApprove: (id: number) => void;
  onReject: (id: number, reason?: string) => void;
  onClose: () => void;
}) {
  const [showReasonFor, setShowReasonFor] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const rows = settlements.filter((s) => s.adminUserId === agent.adminUserId);

  const reject = (id: number) => {
    onReject(id, reason || undefined);
    setShowReasonFor(null);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <Surface className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-bp-text">{agentLabel(agent)}</p>
            <p className="mt-0.5 text-sm text-bp-muted">
              Accrued <span className="font-semibold text-bp-text">{agent.accrued.toLocaleString()}</span>
              {' · '}Paid <span className="font-semibold text-bp-success">{agent.settled.toLocaleString()}</span>
              {' · '}Owed <span className={`font-semibold ${agent.owed > 0 ? 'text-bp-danger' : 'text-bp-success'}`}>{agent.owed.toLocaleString()}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-bp-border bg-bp-surface/70 px-3 py-1 text-xs font-semibold text-bp-text"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {rows.length ? (
            rows.map((s) => (
              <div key={s.id} className="rounded-[18px] border border-bp-border bg-bp-surface/60 p-3">
                <div className="flex items-center gap-3">
                  <PaymentProof url={s.screenshotUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-bp-text">
                      {s.amount.toLocaleString()} cash paid
                    </p>
                    <p className="mt-0.5 text-xs text-bp-muted">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                    {s.rejectionReason && (
                      <p className="mt-1 text-xs font-medium text-red-400">Reason: {s.rejectionReason}</p>
                    )}
                    <div className="mt-1">
                      <StatusPill status={s.status} />
                    </div>
                  </div>
                  {s.status === 'PENDING' && (
                    <div className="flex min-w-0 gap-2">
                      {showReasonFor === s.id ? (
                        <div className="w-44 space-y-1.5">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Rejection reason"
                            className="w-full rounded-lg border border-bp-border bg-bp-bg px-2 py-1 text-xs text-bp-text"
                          />
                          <div className="flex gap-1.5">
                            <ActionButton variant="success" className="flex-1 !px-2 !py-1 text-xs" onClick={() => { onApprove(s.id); onClose(); }}>
                              Approve
                            </ActionButton>
                            <ActionButton variant="danger" className="flex-1 !px-2 !py-1 text-xs" onClick={() => { reject(s.id); onClose(); }}>
                              Reject
                            </ActionButton>
                          </div>
                        </div>
                      ) : (
                        <ActionButton variant="success" className="!px-3 !py-2 text-xs" onClick={() => setShowReasonFor(s.id)}>
                          Review
                        </ActionButton>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No settlements" description="No cash payments from this agent yet." />
          )}
        </div>

        <ActionButton variant="secondary" onClick={onClose} className="mt-4 w-full">
          Done
        </ActionButton>
      </Surface>
    </div>
  );
}

export default function OwnerFeesPage() {
  const { data: allSummary, isLoading: loadingSummary } = useAllOwnerFeeSummary();
  const { data: settlements } = useOwnerFeeSettlements();
  const { mutate: handleSettlement } = useHandleFeeSettlement();
  const [manageTarget, setManageTarget] = useState<AdminOwnerFeeSummaryResponse | null>(null);

  const summaries = allSummary ?? [];
  const totalOwed = summaries.reduce((s, a) => s + a.owed, 0);
  const totalSettled = summaries.reduce((s, a) => s + a.settled, 0);
  const pending = (settlements ?? []).filter((s) => s.status === 'PENDING');
  const totalPending = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <ProtectedRoute roles={[Role.SUPER_ADMIN]}>
      <SectionHeader
        eyebrow="Owner fees"
        title="Agent fee ledger"
        description="Every agent&apos;s owner fees at a glance: who has paid in cash and who still owes."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricCard
          label="Cash Owed (unpaid)"
          value={loadingSummary ? '...' : totalOwed.toLocaleString()}
          accent={totalOwed > 0 ? 'gold' : 'success'}
        />
        <MetricCard
          label="Pending Review"
          value={loadingSummary ? '...' : `${pending.length} · ${totalPending.toLocaleString()}`}
          accent="warning"
        />
        <MetricCard
          label="Settled Cash (paid)"
          value={loadingSummary ? '...' : totalSettled.toLocaleString()}
          accent="success"
        />
      </div>

      <Surface className="overflow-x-auto p-0">
        {loadingSummary ? (
          <div className="space-y-2 p-4">
            <div className="h-12 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-12 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : summaries.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bp-border text-left text-[11px] uppercase tracking-[0.18em] text-bp-muted">
                <th className="p-4 font-semibold">Agent</th>
                <th className="p-4 font-semibold">Accrued</th>
                <th className="p-4 font-semibold">Paid</th>
                <th className="p-4 font-semibold">Owed</th>
                <th className="p-4 font-semibold">Last Paid</th>
                <th className="p-4 font-semibold">Pending</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {summaries.map((a) => {
                const agentPending = pending.filter((p) => p.adminUserId === a.adminUserId).length;
                return (
                  <tr key={a.adminUserId} className="border-b border-bp-border/50 last:border-0">
                    <td className="p-4 text-bp-text">{agentLabel(a)}</td>
                    <td className="p-4 text-bp-text">{a.accrued.toLocaleString()}</td>
                    <td className="p-4 text-bp-success">{a.settled.toLocaleString()}</td>
                    <td className={`p-4 font-semibold ${a.owed > 0 ? 'text-bp-danger' : 'text-bp-success'}`}>
                      {a.owed.toLocaleString()}
                    </td>
                    <td className="p-4 text-bp-muted">
                      {a.lastSettledAt ? new Date(a.lastSettledAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-4">
                      {agentPending > 0 ? (
                        <span className="rounded-full bg-bp-warning/15 px-2 py-0.5 text-xs font-semibold text-bp-warning">
                          {agentPending} to review
                        </span>
                      ) : (
                        <span className="text-xs text-bp-muted">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <ActionButton variant="secondary" className="!px-3 !py-2 text-xs" onClick={() => setManageTarget(a)}>
                        Manage
                      </ActionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No agents" description="Agents will appear here once they are onboarded." />
        )}
      </Surface>

      {manageTarget && (
        <ManageDialog
          agent={manageTarget}
          settlements={settlements ?? []}
          onApprove={(id) => handleSettlement({ id, action: 'APPROVE' })}
          onReject={(id, reason) => handleSettlement({ id, action: 'REJECT', reason })}
          onClose={() => setManageTarget(null)}
        />
      )}
    </ProtectedRoute>
  );
}