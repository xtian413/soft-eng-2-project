import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WeightUnitState {
  isLbs: boolean;
  setIsLbs: (v: boolean) => void;
}

/**
 * Single source of truth for the user's preferred weight unit.
 * Defaults to lbs (matching LiftTab's existing default).
 * Persisted to AsyncStorage under 'gemi_weight_unit'.
 */
export const useWeightUnitStore = create<WeightUnitState>()(
  persist(
    (set) => ({
      isLbs: true,
      setIsLbs: (v) => set({ isLbs: v }),
    }),
    {
      name: 'gemi_weight_unit',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
