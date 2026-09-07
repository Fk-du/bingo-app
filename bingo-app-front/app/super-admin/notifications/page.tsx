'use client';

import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import NotificationsList from '@/components/NotificationsList';

export default function SuperAdminNotificationsPage() {
  return (
    <ProtectedRoute roles={[Role.SUPER_ADMIN]}>
      <NotificationsList title="Platform notifications" />
    </ProtectedRoute>
  );
}