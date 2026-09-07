'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import NotificationsList from '@/components/NotificationsList';

export default function AdminNotificationsPage() {
  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <NotificationsList title="Room notifications" />
    </ProtectedRoute>
  );
}