import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/api';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await agentsApi.list();
      return res.data;
    },
  });
}

export function useAgentStats(id: number | null) {
  return useQuery({
    queryKey: ['agents', 'stats', id],
    queryFn: async () => {
      const res = await agentsApi.getStats(id as number);
      return res.data;
    },
    enabled: id != null,
  });
}

export function useAgentWarnings(id: number | null) {
  return useQuery({
    queryKey: ['agents', 'warnings', id],
    queryFn: async () => {
      const res = await agentsApi.getWarnings(id as number);
      return res.data;
    },
    enabled: id != null,
  });
}

export function useInviteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agentsApi.invite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      agentsApi.updateStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useWarnAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => agentsApi.warn(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents', 'warnings'] }),
  });
}

export function useFundRequests() {
  return useQuery({
    queryKey: ['fund-requests'],
    queryFn: async () => {
      const res = await agentsApi.getFundRequests();
      return res.data;
    },
  });
}

export function useCreateFundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agentsApi.createFundRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fund-requests'] }),
  });
}

export function useHandleFundRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: string; reason?: string }) =>
      agentsApi.handleFundRequest(id, { action, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fund-requests'] }),
  });
}
