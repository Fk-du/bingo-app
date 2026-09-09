'use client';

import { ReactNode } from 'react';
import AppLayout, { NavItem } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/auth.store';
import { Role } from '@/types/enums';
import { IconDashboard, IconGames, IconLobby, IconMore, IconPlayers, IconRequests, IconWallet } from '@/components/ui/Icons';

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: IconDashboard, exact: true },
  { href: '/admin/games', label: 'Games', icon: IconGames },
  { href: '/admin/players', label: 'Players', icon: IconPlayers },
  { href: '/admin/coins', label: 'Coin Requests', icon: IconRequests },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: IconWallet },
  { href: '/admin/broadcast', label: 'Broadcast', icon: IconLobby },
  { href: '/admin/profile', label: 'More', icon: IconMore },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);

  // Admins are locked out of every admin capability until the super admin
  // approves their account. While pending (or rejected) show a notice instead
  // of the agent panel so no admin API is called.
  if (user && user.role === Role.ADMIN && !user.adminApproved) {
    const rejected = !user.active;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bp-bg p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold text-bp-text">
            {rejected ? 'Account not approved' : 'Account awaiting approval'}
          </h1>
          <p className="mt-2 text-sm text-bp-muted">
            {rejected
              ? 'Your admin account was not approved by the super admin. Contact the platform owner for details.'
              : 'Your admin account is pending super admin approval. You cannot manage your room or generate player invite links until the super admin approves your account. Please check back later.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Agent Panel" navItems={navItems}>
      {children}
    </AppLayout>
  );
}
