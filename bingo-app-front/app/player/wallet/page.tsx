'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useAuthStore } from '@/store/auth.store';
import { useCreateCoinRequest, useCoinRequests } from '@/hooks/useCoins';
import { useUploadScreenshot } from '@/hooks/useScreenshots';
import { useWallet } from '@/hooks/usePlayers';
import { getApiErrorMessage } from '@/api/client';
import { PaymentProof } from '@/components/common/PaymentProof';
import { ActionButton, StatusPill, Surface, TextField } from '@/components/ui/Surface';
import { IconCoin } from '@/components/ui/Icons';

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];

export default function WalletPage() {
  const user = useAuthStore((s) => s.user);
  const [showBuy, setShowBuy] = useState(false);
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 5000);
    return () => clearTimeout(t);
  }, [success]);
  const { mutate: topUp, isPending } = useCreateCoinRequest();
  const { mutateAsync: uploadScreenshot, isPending: uploading } = useUploadScreenshot();
  const { data: requests, isLoading: loadingRequests } = useCoinRequests();
  const { data: wallet } = useWallet();

  const balance = wallet?.balance ?? user?.balance ?? 0;

  const submitRequest = async (coins: number) => {
    setError(null);
    setSuccess(null);
    try {
      let screenshotUrl: string | undefined;
      if (file) {
        const res = await uploadScreenshot(file);
        screenshotUrl = res.data;
      }
      topUp(
        { amount: coins, screenshotUrl },
        {
          onSuccess: () => {
            setAmount('');
            setFile(null);
            setPendingConfirm(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSuccess('Coin request submitted! Pending admin approval.');
          },
          onError: (e) => setError(getApiErrorMessage(e)),
        }
      );
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitRequest(Number(amount));
  };

  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <Surface className="relative overflow-hidden p-5">
        <div className="absolute -right-4 -top-4 opacity-20">
          <IconCoin className="h-24 w-24" />
        </div>
        <p className="text-sm text-bp-muted">Your Balance</p>
        <p className="mt-1 text-4xl font-black text-bp-gold">
          {balance.toLocaleString()}
        </p>
        <p className="mt-0.5 text-xs text-bp-muted">coins available</p>
      </Surface>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ActionButton variant="primary" className="w-full" onClick={() => setShowBuy((v) => !v)}>
          Buy Coins
        </ActionButton>
        <Link href="/player/withdraw">
          <ActionButton variant="ghost" className="w-full">
            Withdraw
          </ActionButton>
        </Link>
      </div>

      {showBuy && (
        <div className="mt-4 space-y-3">
          {user?.depositAccountInfo && (
            <Surface className="p-4">
              <p className="mb-2 text-sm font-semibold text-bp-gold">Send deposit to</p>
              <pre className="whitespace-pre-wrap text-sm text-slate-200">{user.depositAccountInfo}</pre>
              <p className="mt-2 text-xs text-bp-muted">After sending, upload your payment screenshot below.</p>
            </Surface>
          )}
          <p className="text-sm font-semibold text-bp-text">Quick amounts</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_AMOUNTS.map((coins) => (
              <ActionButton
                key={coins}
                variant="success"
                onClick={() => setPendingConfirm(coins)}
                disabled={isPending || uploading}
              >
                {coins.toLocaleString()} coins
              </ActionButton>
            ))}
          </div>

          {pendingConfirm && (
            <Surface className="p-4">
              <p className="text-sm font-medium text-bp-text">
                Request <span className="font-black text-bp-gold">{pendingConfirm.toLocaleString()} coins</span>?
              </p>
              <p className="mt-1 text-xs text-bp-muted">
                Attach your payment screenshot before confirming so it can be verified quickly.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <ActionButton
                  variant="success"
                  onClick={() => {
                    submitRequest(pendingConfirm);
                    setPendingConfirm(null);
                  }}
                  disabled={isPending || uploading}
                >
                  Confirm
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  onClick={() => setPendingConfirm(null)}
                  disabled={isPending || uploading}
                >
                  Cancel
                </ActionButton>
              </div>
            </Surface>
          )}

          <Surface className="p-4">
            <p className="mb-3 text-sm font-medium text-bp-muted">Or enter a custom amount</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <TextField
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom amount"
                required
                min="1"
                aria-label="Custom coin amount"
                className="flex-1"
              />
              <ActionButton type="submit" disabled={isPending || uploading} className="shrink-0">
                Request
              </ActionButton>
            </form>
            <div className="mt-3">
              <label className="text-xs text-bp-muted">
                Payment screenshot (optional)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full rounded-lg border border-bp-border bg-bp-bg px-2 py-1.5 text-xs text-bp-text file:mr-2 file:rounded-md file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-xs file:text-slate-200"
                />
              </label>
              {file && (
                <p className="mt-1 truncate text-[11px] text-bp-success">Attached: {file.name}</p>
              )}
            </div>
            {error && <p className="mt-2 text-xs font-medium text-red-400">{error}</p>}
            {success && <p className="mt-2 text-xs font-medium text-emerald-400">{success}</p>}
          </Surface>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-bp-text">Recent Transactions</p>
        {loadingRequests ? (
          <div className="h-16 animate-pulse rounded-2xl bg-bp-surface" />
        ) : !requests || requests.length === 0 ? (
          <Surface className="p-4 text-center text-sm text-bp-muted">No transactions yet.</Surface>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <Surface key={req.id} className="flex items-center gap-3 p-3">
                <PaymentProof url={req.screenshotUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-bp-text">Coin Request</p>
                  <p className="text-xs text-bp-muted">{new Date(req.createdAt).toLocaleDateString()}</p>
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <p className="mt-1 text-xs font-medium text-red-400">Reason: {req.rejectionReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-bp-success">+{req.amount}</p>
                  <StatusPill status={req.status} />
                </div>
              </Surface>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
