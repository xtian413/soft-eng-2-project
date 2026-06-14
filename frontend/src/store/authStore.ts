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
import { recordWeightLocalFirst } from '@/local/bodyProgressRecording';
import {
  getBodyProgressByUser,
  normalizeRecordedDate,
  upsertRemoteBodyProgressForUser,
} from '@/local/repositories/bodyProgressRepository';
import type { LocalProfile } from '@/local/schema';
import type { GoalKey, ActivityLevel } from '@/screens/dashboard/types';

const PENDING_AUTO_TUTORIAL_USER_KEY = 'gemi:pendingAutoTutorialUserId';

interface ProfileState {
  fullName: string | null;
  heightCm: number | null;
  weightKg: number | null;
  startingWeightKg: number | null;
  currentWeightKg: number | null;
  gender: 'male' | 'female' | null;
  goal: GoalKey | null;
  age: number | null;
  activityLevel: ActivityLevel | null;
  targetWeightKg: number | null;
  macroProteinPct: number | null;
  macroCarbsPct: number | null;
  macroFatsPct: number | null;
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
      goal: GoalKey;
      age?: number;
      activityLevel?: ActivityLevel;
      targetWeightKg?: number;
    }
  ) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updatePhysicalStats: (
    heightCm: number,
    weightKg: number,
    goal: GoalKey,
    gender?: 'male' | 'female',
    age?: number | null,
    activityLevel?: ActivityLevel | null,
    targetWeightKg?: number | null,
    macroProteinPct?: number | null,
    macroCarbsPct?: number | null,
    macroFatsPct?: number | null
  ) => Promise<{ message: string } | null>;
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
    startingWeightKg: (profile as any).starting_weight_kg ?? profile.weight_kg ?? null,
    currentWeightKg: weightKg,
    gender: profile.gender,
    goal: profile.goal,
    age: profile.age,
    activityLevel: profile.activity_level,
    targetWeightKg: profile.target_weight_kg,
    macroProteinPct: profile.macro_protein_pct,
    macroCarbsPct: profile.macro_carbs_pct,
    macroFatsPct: profile.macro_fats_pct,
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
  return value === 'moderate_cut' || value === 'aggressive_cut' || value === 'maintain' || value === 'lean_bulk'
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
            const pendingAutoTutorialUserId = await AsyncStorage.getItem(PENDING_AUTO_TUTORIAL_USER_KEY);
            console.log('[Tutorial][AuthStore] Auth state change observed', {
              event: _event,
              authenticatedUserId: user?.id ?? null,
              hasSession: !!session,
              pendingAutoTutorialKey: PENDING_AUTO_TUTORIAL_USER_KEY,
              pendingAutoTutorialValueAtAuthEvent: pendingAutoTutorialUserId,
            });
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
          goal: GoalKey;
          age?: number;
          activityLevel?: ActivityLevel;
          targetWeightKg?: number;
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
                weight_kg: metadata.weight,
                gender: metadata.gender,
                goal: metadata.goal,
                age: metadata.age,
                activity_level: metadata.activityLevel,
              },
            } : undefined,
          });
          if (error) {
            console.log('[Gemi] Supabase register error:', error.message);
            return { code: error.status?.toString(), message: error.message };
          }

          // If signup is successful and we have metadata, save to public.profiles and public.body_progress
          const userId = data.user?.id;
          console.log('[Tutorial][Register] Supabase signup succeeded', {
            userId: userId ?? null,
            hasSession: !!data.session,
            sessionUserId: data.session?.user?.id ?? null,
            autoSignedInBeforePendingFlagWrite: !!data.session?.user,
            willWritePendingAutoTutorialUserId: !!(userId && metadata),
            pendingAutoTutorialKey: PENDING_AUTO_TUTORIAL_USER_KEY,
            pendingAutoTutorialValue: userId ?? null,
          });
          if (userId && metadata) {
            console.log('[Tutorial][Register] Writing pending auto tutorial flag', {
              key: PENDING_AUTO_TUTORIAL_USER_KEY,
              value: userId,
            });
            await AsyncStorage.setItem(PENDING_AUTO_TUTORIAL_USER_KEY, userId);
            const storedPendingTutorialUserId = await AsyncStorage.getItem(PENDING_AUTO_TUTORIAL_USER_KEY);
            console.log('[Tutorial][Register] Pending auto tutorial flag after write', {
              key: PENDING_AUTO_TUTORIAL_USER_KEY,
              storedValue: storedPendingTutorialUserId,
              writeSucceeded: storedPendingTutorialUserId === userId,
            });

            // Safety-net upsert: if the DB trigger already created the row,
            // this updates it; if not, this creates it. No duplicate-key errors.
            // Explicitly set has_seen_onboarding = false for new accounts
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                full_name: metadata.fullName,
                height_cm: metadata.height,
                weight_kg: metadata.weight,
                gender: metadata.gender,
                goal: metadata.goal,
                age: metadata.age ?? null,
                activity_level: metadata.activityLevel ?? null,
                target_weight_kg: metadata.targetWeightKg ?? metadata.weight,
                has_seen_onboarding: false,
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
                recorded_date: normalizeRecordedDate(new Date().toISOString()),
              });

            if (weightError) {
              console.warn('[Gemi] Failed to save initial weight:', weightError.message);
            }

            // Persist initial profile locally with starting/current weights
            try {
              await upsertLocalProfile({
                user_id: userId,
                full_name: metadata.fullName,
                height_cm: metadata.height,
                weight_kg: metadata.weight,
                starting_weight_kg: metadata.weight,
                current_weight_kg: metadata.weight,
                gender: metadata.gender,
                goal: metadata.goal,
                age: metadata.age ?? null,
                activity_level: metadata.activityLevel ?? null,
                target_weight_kg: metadata.targetWeightKg ?? metadata.weight,
              });
            } catch (localErr) {
              console.warn('[Gemi] Failed to persist local profile on signup:', localErr);
            }

            // Expose updated profile immediately in Zustand
            set({
              profile: {
                fullName: metadata.fullName,
                heightCm: metadata.height,
                weightKg: metadata.weight,
                startingWeightKg: metadata.weight,
                currentWeightKg: metadata.weight,
                gender: metadata.gender,
                goal: metadata.goal,
                age: metadata.age ?? null,
                activityLevel: metadata.activityLevel ?? null,
                targetWeightKg: metadata.targetWeightKg ?? metadata.weight,
                macroProteinPct: null,
                macroCarbsPct: null,
                macroFatsPct: null,
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
      updatePhysicalStats: async (
        heightCm,
        weightKg,
        goal,
        gender,
        age,
        activityLevel,
        targetWeightKg,
        macroProteinPct,
        macroCarbsPct,
        macroFatsPct
      ) => {
        const userId = get().user?.id;
        const currentProfile = get().profile;
        if (!userId) return { message: 'Not logged in' };

        try {
          const localProfile = await upsertLocalProfile({
            user_id: userId,
            full_name: currentProfile?.fullName || get().user?.user_metadata?.full_name || null,
            height_cm: heightCm,
            weight_kg: weightKg,
            current_weight_kg: weightKg,
            gender: gender !== undefined ? gender : (currentProfile?.gender || 'male'),
            goal,
            age: age !== undefined ? age : (currentProfile?.age || 22),
            activity_level: activityLevel !== undefined ? activityLevel : (currentProfile?.activityLevel || 'lightly_active'),
            target_weight_kg: targetWeightKg !== undefined ? targetWeightKg : (currentProfile?.targetWeightKg || weightKg),
            macro_protein_pct: macroProteinPct !== undefined ? macroProteinPct : (currentProfile?.macroProteinPct || null),
            macro_carbs_pct: macroCarbsPct !== undefined ? macroCarbsPct : (currentProfile?.macroCarbsPct || null),
            macro_fats_pct: macroFatsPct !== undefined ? macroFatsPct : (currentProfile?.macroFatsPct || null),
          });

          await recordWeightLocalFirst({
            userId,
            weightKg,
            recordedAt: new Date().toISOString(),
            updateProfileCache: false,
          });

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
            .select('full_name, height_cm, weight_kg, goal, gender, age, activity_level, target_weight_kg, macro_protein_pct, macro_carbs_pct, macro_fats_pct')
            .eq('id', userId)
            .maybeSingle();

          if (error || !data) {
            if (error) {
              console.warn('[Gemi] Remote profile refresh skipped:', error.message);
            }
            return;
          }

          const { data: weightRows, error: weightError } = await supabase
            .from('body_progress')
            .select('id, weight_kg, body_fat_pct, recorded_at, recorded_date, created_at, updated_at')
            .eq('user_id', userId)
            .order('recorded_at', { ascending: false });

          if (weightError) {
            console.warn('[Gemi] Remote profile weight refresh skipped:', weightError.message);
          }

          let remoteWeightKg: number | null = normalizeNumber(data.weight_kg);
          if (Array.isArray(weightRows) && weightRows.length > 0) {
            const safeRows = weightRows
              .map((row) => {
                const weight = normalizeNumber(row.weight_kg);
                const recordedAt = typeof row.recorded_at === 'string' ? row.recorded_at : null;
                if (!row.id || weight === null || weight <= 0 || !recordedAt) return null;

                return {
                  id: String(row.id),
                  weight_kg: weight,
                  body_fat_pct: normalizeNumber(row.body_fat_pct),
                  recorded_at: recordedAt,
                  recorded_date: typeof row.recorded_date === 'string'
                    ? row.recorded_date
                    : normalizeRecordedDate(recordedAt),
                  created_at: row.created_at ? String(row.created_at) : undefined,
                  updated_at: row.updated_at ? String(row.updated_at) : undefined,
                };
              })
              .filter((row): row is NonNullable<typeof row> => row !== null);

            if (safeRows.length > 0) {
              await upsertRemoteBodyProgressForUser(userId, safeRows);
              remoteWeightKg = safeRows[0].weight_kg;
            }
          }

          const safeProfile = await upsertRemoteProfileForUser(userId, {
            full_name: typeof data.full_name === 'string' ? data.full_name : null,
            height_cm: normalizeNumber(data.height_cm),
            current_weight_kg: remoteWeightKg,
            gender: normalizeGender(data.gender),
            goal: normalizeGoal(data.goal),
            age: normalizeNumber(data.age),
            activity_level: typeof data.activity_level === 'string' ? data.activity_level as ActivityLevel : null,
            target_weight_kg: normalizeNumber(data.target_weight_kg),
            macro_protein_pct: normalizeNumber(data.macro_protein_pct),
            macro_carbs_pct: normalizeNumber(data.macro_carbs_pct),
            macro_fats_pct: normalizeNumber(data.macro_fats_pct),
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
