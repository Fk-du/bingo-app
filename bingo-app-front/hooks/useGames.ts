import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamesApi } from '@/api';
import { AutomationConfigRequest, CreateGameRequest, GameSettingsUpdateRequest } from '@/types';

export function useActiveGames() {
  return useQuery({
    queryKey: ['games', 'active'],
    queryFn: async () => {
      const res = await gamesApi.getActive();
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function usePendingClaimCards(gameId: number | undefined, active: boolean) {
  return useQuery({
    queryKey: ['games', gameId, 'claim-cards'],
    queryFn: async () => {
      if (!gameId) return [];
      const res = await gamesApi.getPendingClaimCards(gameId);
      return res.data ?? [];
    },
    enabled: !!gameId && active,
    refetchInterval: active ? 3000 : false,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGameRequest) => gamesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useStartGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useCancelGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function usePauseGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useResumeGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.resume(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useEndGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => gamesApi.end(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useRegisterForGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cardId }: { id: number; cardId?: number }) => gamesApi.register(id, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['games', 'state'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}

export function usePendingClaims(gameId: number) {
  return useQuery({
    queryKey: ['games', 'claims', 'pending', gameId],
    queryFn: async () => {
      const res = await gamesApi.getPendingClaims(gameId);
      return res.data;
    },
    enabled: !!gameId,
    refetchInterval: 5000,
  });
}

export function useSaveMarks() {
  return useMutation({
    mutationFn: ({ id, cardId, markedNumbers, autoMark }: { id: number; cardId?: number; markedNumbers: number[]; autoMark?: boolean }) =>
      gamesApi.saveMarks(id, cardId, markedNumbers, autoMark),
  });
}

export function useClaimBingo() {
  return useMutation({
    mutationFn: ({ id, cardId, markedNumbers, autoMark }: { id: number; cardId?: number; markedNumbers?: number[]; autoMark?: boolean }) =>
      gamesApi.claim(id, cardId, markedNumbers, autoMark),
  });
}

export function useRejectClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, claimId, reason }: { gameId: number; claimId: number; reason?: string }) =>
      gamesApi.rejectClaim(gameId, claimId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useFairnessProof(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['games', 'fairness', id],
    queryFn: async () => {
      const res = await gamesApi.getFairness(id);
      return res.data;
    },
    enabled: !!id && enabled,
    staleTime: Infinity,
  });
}

export function useApproveAllClaims() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId }: { gameId: number }) => gamesApi.approveAllClaims(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useRestartGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId }: { gameId: number }) => gamesApi.restartGame(gameId),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['games', 'state', vars.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games', 'fairness', vars.gameId] });
    },
  });
}

export function useGameState(id: number) {
  return useQuery({
    queryKey: ['games', 'state', id],
    queryFn: async () => {
      const res = await gamesApi.getState(id);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useAdminGameState(id: number) {
  return useQuery({
    queryKey: ['games', 'admin-state', id],
    queryFn: async () => {
      const res = await gamesApi.getAdminState(id);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useGameAudit(id: number) {
  return useQuery({
    queryKey: ['games', 'audit', id],
    queryFn: async () => {
      const res = await gamesApi.audit(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateGameSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: GameSettingsUpdateRequest }) =>
      gamesApi.updateSettings(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['games'] }),
  });
}

export function useCallNextNumber(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gamesApi.callNext(gameId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games', 'admin-state', gameId] });
      queryClient.invalidateQueries({ queryKey: ['games', 'state', gameId] });
    },
  });
}

export function useAdminGameHistory() {
  return useQuery({
    queryKey: ['games', 'history'],
    queryFn: async () => {
      const res = await gamesApi.getHistory();
      return res.data;
    },
  });
}

export function usePlayerGameHistory() {
  return useQuery({
    queryKey: ['games', 'player-history'],
    queryFn: async () => {
      const res = await gamesApi.getPlayerHistory();
      return res.data;
    },
  });
}

export function usePlayerCardHistory() {
  return useQuery({
    queryKey: ['games', 'player-card-history'],
    queryFn: async () => {
      const res = await gamesApi.getPlayerCardHistory();
      return res.data;
    },
  });
}

export function useAutomation() {
  return useQuery({
    queryKey: ['games', 'automation'],
    queryFn: async () => {
      const res = await gamesApi.getAutomation();
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function useSaveAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AutomationConfigRequest) => gamesApi.saveAutomation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games', 'automation'] });
      queryClient.invalidateQueries({ queryKey: ['games', 'active'] });
    },
  });
}
