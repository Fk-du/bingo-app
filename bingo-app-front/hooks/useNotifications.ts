import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { notificationsApi } from '@/api';
import { getWsBaseUrl } from '@/lib/backend';
import { getTelegramInitData } from '@/lib/telegram';

export const notificationsQueryKey = ['notifications'];
export const notificationsUnreadKey = ['notifications', 'unread'];

export function useNotifications(limit = 30) {
  return useQuery({
    queryKey: [...notificationsQueryKey, limit],
    queryFn: async () => {
      const res = await notificationsApi.list(limit);
      return res.data ?? [];
    },
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationsUnreadKey,
    queryFn: async () => {
      const res = await notificationsApi.unreadCount();
      return res.data?.count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: notificationsUnreadKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      queryClient.invalidateQueries({ queryKey: notificationsUnreadKey });
    },
  });
}

/**
 * Long-lived STOMP subscription to the authenticated user's notification queue.
 * Mount once (e.g. inside AppLayout) so every role gets real-time bell updates.
 */
export function useNotificationsChannel() {
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const initData = getTelegramInitData() ?? '';

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${getWsBaseUrl()}?token=${encodeURIComponent(initData)}`),
      connectHeaders: {
        Authorization: `tma ${initData}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (message: IMessage) => {
          try {
            const payload = JSON.parse(message.body);
            if (payload?.type === 'NOTIFICATION') {
              queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
              queryClient.invalidateQueries({ queryKey: notificationsUnreadKey });
            }
          } catch {
            console.error('Failed to parse notification event');
          }
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [queryClient]);

  return clientRef;
}