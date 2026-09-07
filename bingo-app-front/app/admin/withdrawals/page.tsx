'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useWithdrawals, usePayWithdrawal, useRejectWithdrawal } from '@/hooks/useWithdrawals';
import { ActionButton, EmptyState, SectionHeader, SelectField, Surface, StatusPill, TabBar, TextField } from '@/components/ui/Surface';
import { WithdrawalResponse } from '@/types';
import { capCount } from '@/lib/counter';

type WithdrawalTab = 'PENDING' | 'APPROVED' | 'REJECTED';

const REJECT_PRESETS = [
  'No screenshot attached',
  'Screenshot unclear or unreadable',
  'Wrong screenshot (does not match request)',
  'Screenshot not related to this payout',
  'Invalid payout details',
  'Duplicate request',
  'Insufficient funds',
  'Suspected fraud',
  'Payout method unavailable',
] as const;

export default function AdminWithdrawalsPage() {
  const { data: withdrawals, isLoading } = useWithdrawals();
  const { mutate: pay } = usePayWithdrawal();
  const { mutate: reject } = useRejectWithdrawal();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectPreset, setRejectPreset] = useState<string>('');
  const [rejectCustom, setRejectCustom] = useState<string>('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tab, setTab] = useState<WithdrawalTab>('PENDING');

  const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 } as const;
  const filtered = (withdrawals ?? [])
    .filter((w) => w.status === tab)
    .sort((a, b) => order[a.status as WithdrawalTab] - order[b.status as WithdrawalTab]);
  const pendingCount = withdrawals?.filter((w) => w.status === 'PENDING').length ?? 0;

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(null), 4000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  const handleReject = (w: WithdrawalResponse) => {
    const reason = rejectPreset === '__custom__' ? rejectCustom.trim() : rejectPreset.trim();
    reject(
      { id: w.id, reason },
      {
        onSuccess: () => {
          setRejectingId(null);
          setRejectPreset('');
          setRejectCustom('');
          setActionMsg({ type: 'success', text: 'Withdrawal rejected.' });
        },
        onError: () => {
          setActionMsg({ type: 'error', text: 'Failed to reject withdrawal.' });
        },
      },
    );
  };

  const handlePay = (id: number) => {
    pay(id, {
      onSuccess: () => setActionMsg({ type: 'success', text: 'Withdrawal marked as paid.' }),
      onError: () => setActionMsg({ type: 'error', text: 'Failed to mark as paid.' }),
    });
  };

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Withdrawals"
        title="Payout requests"
        description="Review and process player withdrawal requests."
      />

      <TabBar
        tabs={[
          { id: 'PENDING', label: `Pending (${capCount(pendingCount)})` },
          { id: 'APPROVED', label: `Paid (${capCount(withdrawals?.filter((w) => w.status === 'APPROVED').length ?? 0)})` },
          { id: 'REJECTED', label: `Rejected (${capCount(withdrawals?.filter((w) => w.status === 'REJECTED').length ?? 0)})` },
        ]}
        active={tab}
        onChange={(id) => setTab(id as WithdrawalTab)}
      />

      <Surface className="p-4 mt-4">
        {actionMsg && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              actionMsg.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {actionMsg.text}
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : filtered.length ? (
          <div className="space-y-2">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-bp-text">{w.amount} coins</p>
                  <p className="text-xs text-bp-muted mt-1">{w.payoutDetails}</p>
                  <div className="mt-2">
                    <StatusPill status={w.status} />
                  </div>
                  {w.rejectionReason && (
                    <p className="text-xs text-bp-danger mt-1">Reason: {w.rejectionReason}</p>
                  )}
                </div>
                {w.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    {rejectingId === w.id ? (
                      <div className="flex flex-col items-start gap-2">
                        <SelectField
                          value={rejectPreset}
                          onChange={(e) => setRejectPreset(e.target.value)}
                          className="w-56"
                        >
                          <option value="" disabled>
                            Select a reason
                          </option>
                          {REJECT_PRESETS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                          <option value="__custom__">Custom reason...</option>
                        </SelectField>
                        {rejectPreset === '__custom__' && (
                          <TextField
                            type="text"
                            value={rejectCustom}
                            onChange={(e) => setRejectCustom(e.target.value)}
                            placeholder="Enter custom reason"
                            className="w-56"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <ActionButton
                            variant="danger"
                            onClick={() => handleReject(w)}
                            disabled={
                              rejectPreset === '' ||
                              (rejectPreset === '__custom__' && rejectCustom.trim() === '')
                            }
                          >
                            Confirm
                          </ActionButton>
                          <ActionButton
                            onClick={() => {
                              setRejectingId(null);
                              setRejectPreset('');
                              setRejectCustom('');
                            }}
                          >
                            Cancel
                          </ActionButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ActionButton variant="success" onClick={() => handlePay(w.id)}>
                          Pay
                        </ActionButton>
                        <ActionButton variant="danger" onClick={() => setRejectingId(w.id)}>
                          Reject
                        </ActionButton>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No withdrawals here" description={`No ${tab.toLowerCase()} withdrawals in this view.`} />
        )}
      </Surface>
    </ProtectedRoute>
  );
}
