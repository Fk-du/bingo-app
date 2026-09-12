'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useMe } from '@/hooks/useAuth';
import { ActionButton, Surface } from '@/components/ui/Surface';

const BOT_LINK =
  process.env.NEXT_PUBLIC_BOT_LINK ?? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'lucky_winners_bingo_test_bot'}`;

export function VerificationRequired() {
  const user = useAuthStore((s) => s.user);
  const { refetch } = useMe();
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user?.phoneNumber) {
      document.location.reload();
    }
  }, [user]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await refetch();
    } finally {
      setChecking(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(BOT_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Surface className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-bp-warning bg-bp-warning/10 text-2xl">
            📱
          </div>
          <h1 className="mt-4 text-lg font-bold text-bp-text">Verify your account</h1>
          <p className="mt-2 text-sm text-bp-muted">
            To open the Mini App, open the BingoPlus bot and tap
            {' '}
            <span className="font-medium text-bp-text">Share Phone Number</span>.
            Your phone number and username keep the room secure and identify your account.
          </p>

          <a
            href={BOT_LINK}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block"
          >
            <ActionButton variant="primary" className="w-full">
              Open Bot
            </ActionButton>
          </a>
          <ActionButton variant="ghost" className="mt-2 w-full" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy bot link'}
          </ActionButton>

          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="mt-3 w-full cursor-pointer text-xs font-medium text-bp-muted underline-offset-2 hover:underline"
          >
            {checking ? 'Checking...' : "I've shared it — check again"}
          </button>
        </Surface>
      </div>
    </div>
  );
}