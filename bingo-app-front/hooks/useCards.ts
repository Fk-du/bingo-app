import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi } from '@/api';

const PAGE_SIZE = 100;

export function useAvailableCards(page = 1) {
  return useQuery({
    queryKey: ['cards', 'available', page],
    queryFn: async () => {
      const res = await cardsApi.getAvailable(page, PAGE_SIZE);
      return res.data;
    },
    staleTime: 5000,
  });
}

export function useCardRequests() {
  return useQuery({
    queryKey: ['cards', 'requests'],
    queryFn: async () => {
      const res = await cardsApi.getCardRequests();
      return res.data;
    },
    refetchInterval: 15000,
  });
}

export function useCreateCardRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quantity: number) => cardsApi.createCardRequest(quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards', 'requests'] }),
  });
}

export function useProcessCardRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'APPROVE' | 'REJECT'; reason?: string }) =>
      cardsApi.processCardRequest(id, { action, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['cards', 'available'] });
    },
  });
}