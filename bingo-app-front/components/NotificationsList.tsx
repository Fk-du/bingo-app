'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { EmptyState, SectionHeader, Surface } from '@/components/ui/Surface';
import { AppNotification, NotificationType } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  [NotificationType.DEPOSIT_REQUEST]: 'text-bp-gold',
  [NotificationType.WITHDRAWAL_REQUEST]: 'text-bp-gold',
  [NotificationType.FUND_REQUEST]: 'text-bp-gold',
  [NotificationType.CLAIM_PENDING]: 'text-bp-warning',
  [NotificationType.DEPOSIT_APPROVED]: 'text-emerald-500',
  [NotificationType.WITHDRAWAL_APPROVED]: 'text-emerald-500',
  [NotificationType.PLAYER_FUNDED]: 'text-emerald-500',
  [NotificationType.ADMIN_FUNDED]: 'text-emerald-500',
  [NotificationType.FUND_REQUEST_APPROVED]: 'text-emerald-500',
  [NotificationType.WIN]: 'text-emerald-500',
  [NotificationType.COMMISSION_CREDITED]: 'text-emerald-500',
  [NotificationType.ADMIN_APPROVED]: 'text-emerald-500',
  [NotificationType.ADMIN_RESUMED]: 'text-emerald-500',
  [NotificationType.ADMIN_WARNING]: 'text-bp-warning',
  [NotificationType.ADMIN_SUSPENDED]: 'text-red-500',
  [NotificationType.DEPOSIT_REJECTED]: 'text-red-500',
  [NotificationType.WITHDRAWAL_REJECTED]: 'text-red-500',
  [NotificationType.FUND_REQUEST_REJECTED]: 'text-red-500',
  [NotificationType.ADMIN_REJECTED]: 'text-red-500',
  [NotificationType.INSUFFICIENT_CREDIT]: 'text-bp-gold',
  [NotificationType.MIN_WITHDRAWAL]: 'text-bp-gold',
  [NotificationType.MISSING_PAYMENT_SCREENSHOT]: 'text-bp-gold',
  [NotificationType.NEW_PLAYER]: 'text-bp-primary',
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsList({ title }: { title: string }) {
  const { data: notifications = [], isLoading } = useNotifications(50);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unread = notifications.filter((n) => !n.readAt);
  const pathname = usePathname();
  const navBase = pathname.startsWith('/player')
    ? '/player'
    : pathname.startsWith('/super-admin')
      ? '/super-admin'
      : '/admin';

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Notifications"
        title={title}
        description="Deposits, withdrawals, funding, winnings and account updates."
      />

      {unread.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-xs font-semibold text-bp-primary transition hover:text-bp-text"
          >
            Mark all as read
          </button>
        </div>
      )}

      <Surface className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
            <div className="h-20 animate-pulse rounded-[18px] border border-bp-border bg-bp-surface/60" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications yet" description="Deposits, withdrawals and winnings will appear here." />
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                navBase={navBase}
                onOpen={() => markRead.mutate(notification.id)}
              />
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}

function NotificationRow({
  notification,
  navBase,
  onOpen,
}: {
  notification: AppNotification;
  navBase: string;
  onOpen: () => void;
}) {
  const accent = TYPE_COLORS[notification.type] ?? 'text-bp-muted';
  const href = notificationHref(notification, navBase);

  const row = (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-bp-text">{notification.title}</p>
        <span className="shrink-0 text-[11px] text-bp-muted">{timeAgo(notification.createdAt)}</span>
      </div>
      <p className="text-sm text-bp-muted">{notification.body}</p>
      {!notification.readAt && (
        <span className={`mt-1 inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${accent}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          New
        </span>
      )}
    </div>
  );

  const baseClass = `block rounded-[18px] border p-4 transition ${
    notification.readAt
      ? 'border-bp-border bg-bp-surface/40'
      : 'border-bp-border bg-bp-surface-elevated shadow-sm'
  }`;

  if (href) {
    return (
      <li>
        <Link href={href} onClick={onOpen} className={`${baseClass} hover:border-bp-primary/40`}>
          {row}
        </Link>
      </li>
    );
  }

  return <li className={baseClass}>{row}</li>;
}

function notificationHref(notification: AppNotification, navBase: string): string | null {
  if (navBase === '/player') {
    if (notification.referenceType === 'GAME' && notification.referenceId != null) {
      return `${navBase}/game/${notification.referenceId}`;
    }
    return null;
  }

  const refType = notification.referenceType;
  if (refType === 'GAME' && notification.referenceId != null) {
    return navBase === '/super-admin'
      ? null
      : `${navBase}/games/${notification.referenceId}`;
  }
  if (refType === 'COIN_REQUEST') return `${navBase}/coins`;
  if (refType === 'WITHDRAWAL') return `${navBase}/withdrawals`;
  if (refType === 'FUND_REQUEST') {
    return navBase === '/super-admin' ? `${navBase}/agents` : `${navBase}/fund-requests`;
  }
  return null;
}