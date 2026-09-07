import { useQuery } from '@tanstack/react-query';
import { inviteApi } from '@/api/invite.api';

export function useInviteLink() {
  return useQuery({
    queryKey: ['invite', 'me'],
    queryFn: async () => {
      const res = await inviteApi.getMyLink();
      return res.data as string;
    },
  });
}

export function useInviteStats() {
  return useQuery({
    queryKey: ['invite', 'stats'],
    queryFn: async () => {
      const res = await inviteApi.getMyStats();
      return res.data;
    },
  });
}
