'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import NotificationsList from '@/components/NotificationsList';

export default function PlayerNotificationsPage() {
  return (
    <ProtectedRoute roles={[Role.PLAYER]}>
      <NotificationsList title="Your notifications" />
    </ProtectedRoute>
  );
}