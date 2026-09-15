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

export function useOwnerFeeSummary() {
  return useQuery({
    queryKey: ['fee-summary'],
    queryFn: async () => {
      const res = await agentsApi.getFeeSummary();
      return res.data;
    },
  });
}

export function useAllOwnerFeeSummary() {
  return useQuery({
    queryKey: ['fee-summary', 'all'],
    queryFn: async () => {
      const res = await agentsApi.getAllFeeSummary();
      return res.data;
    },
  });
}

export function useOwnerFeeSettlements() {
  return useQuery({
    queryKey: ['fee-settlements'],
    queryFn: async () => {
      const res = await agentsApi.getFeeSettlements();
      return res.data;
    },
  });
}

export function useCreateFeeSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agentsApi.createFeeSettlement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee-settlements'] }),
  });
}

export function useHandleFeeSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: string; reason?: string }) =>
      agentsApi.handleFeeSettlement(id, { action, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['fee-summary'] });
    },
  });
}
