import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
}

type AuthError = {
  code?: string;
  message: string;
};

let authSubscription: { unsubscribe: () => void } | null = null;

/** Stores Supabase session state for the app. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      isLoading: true,
      initializeAuth: async () => {
        if (authSubscription) {
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (!error) {
          set({ session: data.session, user: data.session?.user ?? null });
        }

        authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
          set({ session, user: session?.user ?? null, isLoading: false });
        }).data.subscription;

        if (get().isLoading) {
          set({ isLoading: false });
        }
      },
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return error ? { code: error.code ?? undefined, message: error.message } : null;
      },
      signUp: async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        return error ? { code: error.code ?? undefined, message: error.message } : null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
      }),
    }
  )
);
