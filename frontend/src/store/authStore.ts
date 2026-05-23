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

        try {
          const { data, error } = await supabase.auth.getSession();
          if (!error) {
            set({ session: data.session, user: data.session?.user ?? null });
          }

          authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
            set({ session, user: session?.user ?? null, isLoading: false });
          }).data.subscription;
        } catch (err) {
          console.warn('[Gemi] Auth init failed (Supabase not configured):', err);
        } finally {
          if (get().isLoading) {
            set({ isLoading: false });
          }
        }
      },
      signIn: async (email: string, password: string) => {
        const hasEnv = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!hasEnv) {
          return { message: 'Supabase env vars are not configured. Please add them in your .env file to enable authentication.' };
        }

        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            console.log('[Gemi] Supabase login error:', error.message);
            return { code: error.status?.toString(), message: error.message };
          }
          return null;
        } catch (e: any) {
          console.warn('[Gemi] Supabase connection failed:', e);
          return { message: e.message || 'An unexpected authentication error occurred.' };
        }
      },
      signUp: async (email: string, password: string) => {
        const hasEnv = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!hasEnv) {
          return { message: 'Supabase env vars are not configured. Please add them in your .env file to enable authentication.' };
        }

        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) {
            console.log('[Gemi] Supabase register error:', error.message);
            return { code: error.status?.toString(), message: error.message };
          }
          return null;
        } catch (e: any) {
          console.warn('[Gemi] Supabase sign up connection failed:', e);
          return { message: e.message || 'An unexpected authentication error occurred.' };
        }
      },
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.log('[Gemi] Supabase SignOut error:', e);
        }
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
