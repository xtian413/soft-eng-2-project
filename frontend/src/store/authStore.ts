import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

interface ProfileState {
  fullName: string | null;
  heightCm: number | null;
  goal: 'lose_weight' | 'build_muscle' | 'maintain' | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: ProfileState | null;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signUp: (
    email: string,
    password: string,
    metadata?: {
      fullName: string;
      height: number;
      weight: number;
      goal: 'lose_weight' | 'build_muscle' | 'maintain';
    }
  ) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
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
      profile: null,
      isLoading: true,
      initializeAuth: async () => {
        if (authSubscription) {
          return;
        }

        try {
          const { data, error } = await supabase.auth.getSession();
          if (!error) {
            const user = data.session?.user ?? null;
            set({ session: data.session, user });
            if (user) {
              await get().fetchProfile();
            }
          }

          authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
            const user = session?.user ?? null;
            set({ session, user, isLoading: false });
            if (user) {
              await get().fetchProfile();
            } else {
              set({ profile: null });
            }
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
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            console.log('[Gemi] Supabase login error:', error.message);
            return { code: error.status?.toString(), message: error.message };
          }
          if (data.user) {
            set({ user: data.user });
            await get().fetchProfile();
          }
          return null;
        } catch (e: any) {
          console.warn('[Gemi] Supabase connection failed:', e);
          return { message: e.message || 'An unexpected authentication error occurred.' };
        }
      },
      signUp: async (
        email: string,
        password: string,
        metadata?: {
          fullName: string;
          height: number;
          weight: number;
          goal: 'lose_weight' | 'build_muscle' | 'maintain';
        }
      ) => {
        const hasEnv = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!hasEnv) {
          return { message: 'Supabase env vars are not configured. Please add them in your .env file to enable authentication.' };
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: metadata ? {
              data: {
                full_name: metadata.fullName,
                goal: metadata.goal,
              },
            } : undefined,
          });
          if (error) {
            console.log('[Gemi] Supabase register error:', error.message);
            return { code: error.status?.toString(), message: error.message };
          }

          // If signup is successful and we have metadata, save to public.profiles and public.body_progress
          const userId = data.user?.id;
          if (userId && metadata) {
            // Update profile
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                full_name: metadata.fullName,
                height_cm: metadata.height,
                goal: metadata.goal,
              })
              .eq('id', userId);

            if (profileError) {
              console.warn('[Gemi] Failed to save profile details:', profileError.message);
            }

            // Insert body progress (initial weight)
            const { error: weightError } = await supabase
              .from('body_progress')
              .insert({
                user_id: userId,
                weight_kg: metadata.weight,
                recorded_at: new Date().toISOString(),
              });

            if (weightError) {
              console.warn('[Gemi] Failed to save initial weight:', weightError.message);
            }

            // Expose updated profile immediately in Zustand
            set({
              profile: {
                fullName: metadata.fullName,
                heightCm: metadata.height,
                goal: metadata.goal,
              }
            });
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
        set({ session: null, user: null, profile: null });
      },
      fetchProfile: async () => {
        const userId = get().user?.id;
        if (!userId) {
          set({ profile: null });
          return;
        }
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, height_cm, goal')
            .eq('id', userId)
            .maybeSingle();

          if (!error && data) {
            set({
              profile: {
                fullName: data.full_name,
                heightCm: data.height_cm ? parseFloat(data.height_cm) : null,
                goal: data.goal as any,
              }
            });
          }
        } catch (e) {
          console.warn('[Gemi] Failed to fetch user profile:', e);
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
      }),
    }
  )
);
