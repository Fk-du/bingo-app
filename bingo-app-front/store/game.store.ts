import { create } from 'zustand';
import { GameStatus, CalledNumberResponse, BingoClaimResponse, PlayerCardView } from '@/types';

interface GameState {
  activeGameId: number | null;
  gameStatus: GameStatus | null;
  startTime: string | null;
  calledNumbers: CalledNumberResponse[];
  totalNumbersCalled: number;
  prizePool: number;
  playerCards: PlayerCardView[] | null;
  isConnecting: boolean;
  claimPending: BingoClaimResponse | null;
  setActiveGame: (gameId: number) => void;
  setGameStatus: (status: GameStatus) => void;
  setStartTime: (time: string | null) => void;
  addCalledNumber: (number: CalledNumberResponse) => void;
  setCalledNumbers: (numbers: CalledNumberResponse[]) => void;
  setTotalNumbersCalled: (count: number) => void;
  setPrizePool: (pool: number) => void;
  setPlayerCards: (cards: PlayerCardView[] | null) => void;
  setConnecting: (connecting: boolean) => void;
  setClaimPending: (claim: BingoClaimResponse | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  activeGameId: null,
  gameStatus: null,
  startTime: null,
  calledNumbers: [],
  totalNumbersCalled: 0,
  prizePool: 0,
  playerCards: null,
  isConnecting: true,
  claimPending: null,
  setActiveGame: (gameId) => set({ activeGameId: gameId }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setStartTime: (time) => set({ startTime: time }),
  addCalledNumber: (number) => set((state) => ({ calledNumbers: [...state.calledNumbers, number] })),
  setCalledNumbers: (numbers) => set({ calledNumbers: numbers }),
  setTotalNumbersCalled: (count) => set({ totalNumbersCalled: count }),
  setPrizePool: (pool) => set({ prizePool: pool }),
  setPlayerCards: (cards) => set({ playerCards: cards }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setClaimPending: (claim) => set({ claimPending: claim }),
  reset: () => set({
    activeGameId: null, gameStatus: null, startTime: null, calledNumbers: [],
    totalNumbersCalled: 0, prizePool: 0, playerCards: null, claimPending: null,
  }),
}));
