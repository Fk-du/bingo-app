'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useOwnerFeeSummary, useOwnerFeeSettlements, useCreateFeeSettlement } from '@/hooks/useAgents';
import { useUploadScreenshot } from '@/hooks/useScreenshots';
import { getApiErrorMessage } from '@/api/client';
import { PaymentProof } from '@/components/common/PaymentProof';
import { ActionButton, EmptyState, Field, MetricCard, SectionHeader, Surface, StatusPill, TextField } from '@/components/ui/Surface';

export default function OwnerFeesPage() {
  const { data: summary, isLoading: loadingSummary } = useOwnerFeeSummary();
  const { data: settlements, isLoading } = useOwnerFeeSettlements();
  const { mutate: createSettlement, isPending } = useCreateFeeSettlement();
  const { mutateAsync: uploadScreenshot, isPending: uploading } = useUploadScreenshot();
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (summary && !amount && summary.owed > 0) {
      setAmount(String(summary.owed));
    }
  }, [summary, amount]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      let screenshotUrl: string | undefined;
      if (file) {
        const res = await uploadScreenshot(file);
        screenshotUrl = res.data;
      }
      createSettlement(
        { amount: Number(amount), screenshotUrl },
        {
          onSuccess: () => {
            setAmount('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSuccess('Fee settlement submitted! Awaiting super admin confirmation.');
          },
          onError: (err) => setError(getApiErrorMessage(err)),
        }
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Owner fees"
        title="Cash settlement"
        description="Your share of the owner&apos;s commission accrues on every game. Pay it in cash and upload proof, just like buying coins."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <MetricCard
          label="Cash owed to owner"
          value={loadingSummary ? '...' : (summary?.owed ?? 0).toLocaleString()}
          accent="gold"
        />
        <MetricCard
          label="Accrued (collected cash)"
          value={loadingSummary ? '...' : (summary?.accrued ?? 0).toLocaleString()}
          accent="primary"
        />
        <MetricCard
          label="Settled"
          value={loadingSummary ? '...' : (summary?.settled ?? 0).toLocaleString()}
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <Surface className="p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">New payment</p>
          <h2 className="mt-1 text-lg font-semibold text-bp-text">Pay owner fees in cash</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Field label="Amount">
              <TextField
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount you paid"
                required
                min="0"
              />
            </Field>
            <Field label="Transfer screenshot (proof of cash paid)">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-bp-border bg-bp-bg px-2 py-1.5 text-xs text-bp-text file:mr-2 file:rounded-md file:border-0 file:bg-bp-surface-elevated file:px-2 file:py-1 file:text-xs file:text-bp-text"
              />
            </Field>
            {file && <p className="-mt-2 truncate text-[11px] text-emerald-400">Attached: {file.name}</p>}
            {error && <p className="-mt-2 text-xs font-medium text-red-400">{error}</p>}
            {success && <p className="-mt-2 text-xs font-medium text-emerald-400">{success}</p>}
            <ActionButton type="submit" disabled={isPending || uploading} className="w-full">
              {isPending || uploading ? 'Submitting...' : 'Submit cash payment'}
            </ActionButton>
          </form>
        </Surface>

        <Surface className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">History</p>
              <h2 className="mt-1 text-lg font-semibold text-bp-text">Settlements</h2>
            </div>
            <span className="rounded-full border border-bp-border bg-bp-surface/70 px-3 py-1 text-xs font-semibold text-bp-text">
              {settlements?.length ?? 0}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
                <div className="h-16 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
              </div>
            ) : settlements?.length ? (
              settlements.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-bp-border bg-bp-surface/60 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PaymentProof url={req.screenshotUrl} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-bp-text">
                        {req.amount.toLocaleString()} cash paid
                      </p>
                      <p className="mt-0.5 text-xs text-bp-muted">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <p className="mt-1 text-xs font-medium text-red-400">Reason: {req.rejectionReason}</p>
                      )}
                      <div className="mt-1">
                        <StatusPill status={req.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No settlements" description="Cash payments you submit will appear here." />
            )}
          </div>
        </Surface>
      </div>
    </ProtectedRoute>
  );
}