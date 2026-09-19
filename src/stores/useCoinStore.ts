import { create } from "zustand";
import { CoinTransaction } from "../types";
import { coinRepository } from "../database/repositories/coinRepository";
import { usePlayerStore } from "./usePlayerStore";

interface CoinState {
  transactions: CoinTransaction[];
  isLoading: boolean;
  loadTransactions: (limit?: number) => Promise<void>;
  getBalance: () => number;
  loadTransactionsByDate: (date: string) => Promise<void>;
}

export const useCoinStore = create<CoinState>((set, get) => ({
  transactions: [],
  isLoading: false,

  loadTransactions: async (limit: number = 50) => {
    set({ isLoading: true });
    try {
      const records = await coinRepository.getTransactions(limit);
      set({
        transactions: records.map((r: any) => ({
          id: r.id,
          amount: r.amount,
          type: r.type as "earn" | "spend",
          description: r.description,
          source: r.source,
          timestamp: r.timestamp,
        })),
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load transactions", error);
      set({ isLoading: false });
    }
  },

  getBalance: () => {
    const profile = usePlayerStore.getState().profile;
    return profile?.coins || 0;
  },

  loadTransactionsByDate: async (date: string) => {
    set({ isLoading: true });
    try {
      const records = await coinRepository.getTransactionsByDate(date);
      set({
        transactions: records.map((r: any) => ({
          id: r.id,
          amount: r.amount,
          type: r.type as "earn" | "spend",
          description: r.description,
          source: r.source,
          timestamp: r.timestamp,
        })),
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load transactions by date", error);
      set({ isLoading: false });
    }
  },
}));
