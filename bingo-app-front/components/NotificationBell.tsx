import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBell } from '@/components/ui/Icons';
import { useUnreadCount } from '@/hooks/useNotifications';
import { capCount } from '@/lib/counter';

function notificationsHref(pathname: string) {
  if (pathname.startsWith('/player')) return '/player/notifications';
  if (pathname.startsWith('/super-admin')) return '/super-admin/notifications';
  return '/admin/notifications';
}

export default function NotificationBell({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const { data: unread = 0 } = useUnreadCount();

  return (
    <Link
      href={notificationsHref(pathname)}
      aria-label="Notifications"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-bp-border bg-bp-surface-elevated text-bp-muted transition hover:text-bp-text ${className}`}
    >
      <IconBell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bp-primary px-1 text-[10px] font-bold leading-none text-white">
          {capCount(unread)}
        </span>
      )}
    </Link>
  );
}