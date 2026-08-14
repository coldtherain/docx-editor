import { create } from 'zustand';

interface AppState {
  scenarioMap: Record<string, string>;
  values: Record<string, string>;
  setScenarioMap(m: Record<string, string>): void;
  setValue(uuid: string, v: string): void;
}

export const useAppStore = create<AppState>((set) => ({
  scenarioMap: {},
  values: {},
  setScenarioMap: (m) => set({ scenarioMap: m }),
  setValue: (uuid, v) => set((s) => ({ values: { ...s.values, [uuid]: v } })),
}));
