'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TutorialPersistedState {
  hasSeenTutorialA: boolean;
  hasSeenTutorialB: boolean;
  hasSeenTutorialC: boolean;
  hasSeenTutorialD: boolean;
}

interface TutorialVolatileState {
  isTutorialAOpen: boolean;
  isTutorialBOpen: boolean;
  isTutorialCOpen: boolean;
  isTutorialDOpen: boolean;
}

interface TutorialActions {
  markTutorialASeen: () => void;
  markTutorialBSeen: () => void;
  markTutorialCSeen: () => void;
  markTutorialDSeen: () => void;
  openTutorialA: () => void;
  closeTutorialA: () => void;
  openTutorialB: () => void;
  closeTutorialB: () => void;
  openTutorialC: () => void;
  closeTutorialC: () => void;
  openTutorialD: () => void;
  closeTutorialD: () => void;
}

type TutorialState = TutorialPersistedState & TutorialVolatileState & TutorialActions;

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTutorialA: false,
      hasSeenTutorialB: false,
      hasSeenTutorialC: false,
      hasSeenTutorialD: false,
      isTutorialAOpen: false,
      isTutorialBOpen: false,
      isTutorialCOpen: false,
      isTutorialDOpen: false,

      markTutorialASeen: () => set({ hasSeenTutorialA: true }),
      markTutorialBSeen: () => set({ hasSeenTutorialB: true }),
      markTutorialCSeen: () => set({ hasSeenTutorialC: true }),
      markTutorialDSeen: () => set({ hasSeenTutorialD: true }),
      openTutorialA: () => set({ isTutorialAOpen: true }),
      closeTutorialA: () => set({ isTutorialAOpen: false }),
      openTutorialB: () => set({ isTutorialBOpen: true }),
      closeTutorialB: () => set({ isTutorialBOpen: false }),
      openTutorialC: () => set({ isTutorialCOpen: true }),
      closeTutorialC: () => set({ isTutorialCOpen: false }),
      openTutorialD: () => set({ isTutorialDOpen: true }),
      closeTutorialD: () => set({ isTutorialDOpen: false }),
    }),
    {
      name: 'retail-tutorial',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
      partialize: (state) => ({
        hasSeenTutorialA: state.hasSeenTutorialA,
        hasSeenTutorialB: state.hasSeenTutorialB,
        hasSeenTutorialC: state.hasSeenTutorialC,
        hasSeenTutorialD: state.hasSeenTutorialD,
      }),
    },
  ),
);
