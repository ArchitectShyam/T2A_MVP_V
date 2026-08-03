"use client";

import { create } from "zustand";

export type TaskFilter = "all" | "active" | "completed";

/**
 * Ephemeral UI state only (never server data). Here: the tasks list filter.
 */
interface UiState {
  filter: TaskFilter;
  setFilter: (filter: TaskFilter) => void;
}

export const useUiStore = create<UiState>((set) => ({
  filter: "all",
  setFilter: (filter) => set({ filter }),
}));
