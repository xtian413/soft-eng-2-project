import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { retryPendingProfileSync } from '@/local/profileSync';
import {
  getProfileByUser,
  upsertLocalProfile,
  upsertRemoteProfileForUser,
} from '@/local/repositories/profilesRepository';
import { createBodyProgressLocal } from '@/local/repositories/bodyProgressRepository';
import {
  getBodyProgressByUser,
  upsertRemoteBodyProgressForUser,
} from '@/local/repositories/bodyProgressRepository';
import type { LocalProfile } from '@/local/schema';

interface ProfileState {
  fullName: string | null;
  heightCm: number | null;
  weightKg: number | null;
  gender: 'male' | 'female' | null;
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
      gender: 'male' | 'female';
      goal: 'lose_weight' | 'build_muscle' | 'maintain';
    }
  ) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updatePhysicalStats: (heightCm: number, weightKg: number, goal: 'lose_weight' | 'build_muscle' | 'maintain') => Promise<{ message: string } | null>;
}

type AuthError = {
  code?: string;
  message: string;
};

let authSubscription: { unsubscribe: () => void } | null = null;

function localProfileToState(
  profile: LocalProfile,
  weightKg: number | null
): ProfileState {
  return {
    fullName: profile.full_name,
    heightCm: profile.height_cm,
    weightKg,
    gender: profile.gender,
    goal: profile.goal,
  };
}

async function getLatestLocalWeightKg(userId: string, profile?: LocalProfile | null) {
  const rows = await getBodyProgressByUser(userId);
  return rows.length > 0 ? rows[rows.length - 1].weight_kg : profile?.weight_kg ?? null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeGender(value: unknown): ProfileState['gender'] {
  return value === 'male' || value === 'female' ? value : null;
}

function normalizeGoal(value: unknown): ProfileState['goal'] {
  return value === 'lose_weight' || value === 'build_muscle' || value === 'maintain'
    ? value
    : null;
}

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
          gender: 'male' | 'female';
          goal: 'lose_weight' | 'build_muscle' | 'maintain';
        }
      ) => {
        const hasEnv = !!process.env.EXPO_PUBLIC_SUPABASE_URL;
        if (!hasEnv) {
          return { message: 'Supabase env vars are not configured. Please add them in your .env file to enable authentication.' };
        }

        try {
          // Pass all registration metadata into raw_user_meta_data so
          // the Postgres trigger can read it and auto-create the profile row.
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: metadata ? {
              data: {
                full_name: metadata.fullName,
                height_cm: metadata.height,
                gender: metadata.gender,
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
            // Safety-net upsert: if the DB trigger already created the row,
            // this updates it; if not, this creates it. No duplicate-key errors.
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                full_name: metadata.fullName,
                height_cm: metadata.height,
                gender: metadata.gender,
                goal: metadata.goal,
              });

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
                weightKg: metadata.weight,
                gender: metadata.gender,
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
          await AsyncStorage.removeItem('auth-store');
        } catch (e) {
          console.log('[Gemi] Supabase SignOut error:', e);
        }
        set({ session: null, user: null, profile: null });
      },
      updatePhysicalStats: async (heightCm, weightKg, goal) => {
        const userId = get().user?.id;
        const currentProfile = get().profile;
        if (!userId || !currentProfile) return { message: 'Not logged in' };

        try {
          const localProfile = await upsertLocalProfile({
            user_id: userId,
            full_name: currentProfile.fullName,
            height_cm: heightCm,
            weight_kg: weightKg,
            gender: currentProfile.gender,
            goal,
          });

          // Keep profile weight as a current-value cache; body_progress remains history.
          if (currentProfile.weightKg !== weightKg) {
            await createBodyProgressLocal({
              user_id: userId,
              weight_kg: weightKg,
              recorded_at: new Date().toISOString(),
            });
          }

          set({
            profile: localProfileToState(localProfile, weightKg)
          });

          void retryPendingProfileSync(userId);
          return null; // Success
        } catch (e: any) {
          console.warn('[Gemi] updatePhysicalStats error:', e);
          return { message: e.message || 'An unexpected error occurred.' };
        }
      },
      fetchProfile: async () => {
        const userId = get().user?.id;
        if (!userId) {
          set({ profile: null });
          return;
        }
        try {
          const localProfile = await getProfileByUser(userId);
          if (localProfile) {
            const localWeightKg = await getLatestLocalWeightKg(userId, localProfile);
            set({ profile: localProfileToState(localProfile, localWeightKg) });
          }

          void retryPendingProfileSync(userId);

          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, height_cm, goal, gender')
            .eq('id', userId)
            .maybeSingle();

          if (error || !data) {
            if (error) {
              console.warn('[Gemi] Remote profile refresh skipped:', error.message);
            }
            return;
          }

          const { data: weightData, error: weightError } = await supabase
            .from('body_progress')
            .select('id, weight_kg, recorded_at, created_at')
            .eq('user_id', userId)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (weightError) {
            console.warn('[Gemi] Remote profile weight refresh skipped:', weightError.message);
          }

          const remoteWeightKg = normalizeNumber(weightData?.weight_kg);
          if (weightData?.id && weightData.recorded_at && remoteWeightKg !== null && remoteWeightKg > 0) {
            await upsertRemoteBodyProgressForUser(userId, [{
              id: String(weightData.id),
              weight_kg: remoteWeightKg,
              recorded_at: String(weightData.recorded_at),
              created_at: weightData.created_at ? String(weightData.created_at) : undefined,
            }]);
          }

          const safeProfile = await upsertRemoteProfileForUser(userId, {
            full_name: typeof data.full_name === 'string' ? data.full_name : null,
            height_cm: normalizeNumber(data.height_cm),
            weight_kg: remoteWeightKg,
            gender: normalizeGender(data.gender),
            goal: normalizeGoal(data.goal),
          });

          const finalLocalProfile = await getProfileByUser(userId) ?? safeProfile;
          const finalWeightKg = await getLatestLocalWeightKg(userId, finalLocalProfile);
          set({
            profile: localProfileToState(
              finalLocalProfile,
              finalWeightKg ?? finalLocalProfile.weight_kg ?? remoteWeightKg
            )
          });
        } catch (e) {
          if (!get().profile) {
            try {
              const localProfile = await getProfileByUser(userId);
              if (localProfile) {
                const localWeightKg = await getLatestLocalWeightKg(userId, localProfile);
                set({ profile: localProfileToState(localProfile, localWeightKg) });
              }
            } catch (localError) {
              console.warn('[Gemi] Failed to read cached user profile:', localError);
            }
          } else {
            console.warn('[Gemi] Failed to refresh user profile:', e);
          }
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
