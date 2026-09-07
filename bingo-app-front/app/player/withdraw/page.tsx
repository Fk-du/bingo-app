'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useCreateWithdrawal } from '@/hooks/useWithdrawals';
import { ActionButton, Field, SectionHeader, Surface, TextField } from '@/components/ui/Surface';

export default function WithdrawPage() {
  const [amount, setAmount] = useState('');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [success, setSuccess] = useState(false);
  const { mutate: withdraw, isPending, error } = useCreateWithdrawal();

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    withdraw(
      { amount: Number(amount), payoutDetails },
      {
        onSuccess: () => {
          setAmount('');
          setPayoutDetails('');
          setSuccess(true);
        },
      },
    );
  };

  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <SectionHeader
        eyebrow="Withdraw"
        title="Payout request"
        description="Submit a withdrawal without leaving the player experience."
      />

      <Surface className="max-w-2xl p-4">
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-300">
            Withdrawal request submitted! An admin will review and process it shortly.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-300">
            {(error as unknown as { userMessage?: string }).userMessage || (error as Error).message || 'Withdrawal failed. Please try again.'}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Amount">
            <TextField
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
            />
          </Field>
          <Field label="Payout details" hint="Bank account, mobile money, or crypto address">
            <TextField
              type="text"
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
              placeholder="Required"
              required
            />
          </Field>
          <ActionButton type="submit" disabled={isPending} variant="danger" className="w-full">
            {isPending ? 'Submitting...' : 'Request withdrawal'}
          </ActionButton>
        </form>
      </Surface>
    </ProtectedRoute>
  );
}
