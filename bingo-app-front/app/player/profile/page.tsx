'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useAuthStore } from '@/store/auth.store';
import { useInviteLink, useInviteStats } from '@/hooks/useInvite';
import { ActionButton, Surface } from '@/components/ui/Surface';
import { IconProfile } from '@/components/ui/Icons';

const MENU_ITEMS = [
  { href: '/player/profile', label: 'My Profile' },
  { href: '/player/history', label: 'Game History' },
  { href: '#invite', label: 'Invite Friends', isInvite: true },
  { href: '#', label: 'How to Play' },
  { href: '#', label: 'Support' },
  { href: '#', label: 'About BingoPlus' },
];

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { data: inviteLink } = useInviteLink();
  const { data: stats } = useInviteStats();
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    'Player';

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (!inviteLink) return;
    const text = encodeURIComponent(`Join BingoPlus and play with me! 🎱\n\n${inviteLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${text}`, '_blank');
  };

  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <div className="flex flex-col items-center py-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-bp-primary bg-bp-primary/20">
          <IconProfile className="h-10 w-10 text-bp-primary" />
        </div>
        <h1 className="mt-3 text-xl font-bold text-bp-text">{displayName}</h1>
        <p className="text-sm text-bp-muted">Player</p>
        {user?.username && <p className="text-xs text-bp-muted">@{user.username}</p>}
        {user?.phoneNumber && <p className="text-xs text-bp-muted">📞 {user.phoneNumber}</p>}
      </div>

      {!user?.phoneNumber && (
        <Surface className="mb-3 border-bp-warning/40 p-4">
          <p className="text-sm font-semibold text-bp-warning">Verify your account</p>
          <p className="mt-1 text-xs text-bp-muted">
            Open the BingoPlus bot and tap <span className="text-bp-text">Share Phone Number</span> so we can verify your account.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_BOT_LINK ?? `https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'lucky_winners_bingo_test_bot'}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block"
          >
            <ActionButton variant="primary">Open Bot</ActionButton>
          </a>
        </Surface>
      )}

      <Surface className="divide-y divide-bp-border overflow-hidden p-0">
        {MENU_ITEMS.map((item) =>
          item.isInvite ? (
            <button
              key={item.label}
              type="button"
              onClick={() => setShowInvite((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-sm text-bp-text transition hover:bg-bp-surface-elevated"
            >
              <span>{item.label}</span>
              <span className="text-bp-muted">{showInvite ? '−' : '›'}</span>
            </button>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between px-4 py-3.5 text-sm text-bp-text transition hover:bg-bp-surface-elevated"
            >
              <span>{item.label}</span>
              <span className="text-bp-muted">›</span>
            </Link>
          )
        )}
      </Surface>

      {showInvite && (
        <Surface className="mt-3 p-4">
          <p className="text-sm font-semibold text-bp-gold">Invite Friends</p>
          <p className="mt-1 text-xs text-bp-muted">Share your link — friends who register through it will join your games.</p>

          {stats && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-bp-border bg-bp-bg px-3 py-2 text-center">
                <p className="text-lg font-bold text-bp-text">{stats.totalRegistrations}</p>
                <p className="text-[10px] text-bp-muted">Friends joined</p>
              </div>
              <div className="rounded-xl border border-bp-border bg-bp-bg px-3 py-2 text-center">
                <p className="text-lg font-bold text-bp-text">{stats.activeCodes}</p>
                <p className="text-[10px] text-bp-muted">Active links</p>
              </div>
            </div>
          )}

          {inviteLink && (
            <div className="mt-3 rounded-xl border border-bp-border bg-bp-bg p-3">
              <p className="truncate text-xs text-bp-muted break-all">{inviteLink}</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton variant="primary" onClick={handleCopy} className="w-full">
              {copied ? '✓ Copied!' : 'Copy Link'}
            </ActionButton>
            <ActionButton variant="success" onClick={handleShare} className="w-full">
              Share
            </ActionButton>
          </div>
        </Surface>
      )}

      <ActionButton variant="ghost" onClick={logout} className="mt-6 w-full text-bp-danger">
        Log Out
      </ActionButton>
    </ProtectedRoute>
  );
}
