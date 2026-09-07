'use client';

import { ReactNode } from 'react';
import AppLayout, { NavItem } from '@/components/layout/AppLayout';
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
  return (
    <AppLayout title="Agent Panel" navItems={navItems}>
      {children}
    </AppLayout>
  );
}
