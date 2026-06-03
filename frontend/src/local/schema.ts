export const GEMI_USER_DATABASE_NAME = 'gemi_user.db';

export const LOCAL_SCHEMA_VERSION = 3;

export const LOCAL_TABLES = {
  schemaMigrations: 'schema_migrations',
  profiles: 'profiles',
  workouts: 'workouts',
  workoutSets: 'workout_sets',
  routines: 'routines',
  routineExercises: 'routine_exercises',
  dietLogs: 'diet_logs',
  bodyProgress: 'body_progress',
  aiInsights: 'ai_insights',
  syncQueue: 'sync_queue',
} as const;

export const SYNC_STATUSES = ['pending', 'synced', 'failed'] as const;

export type SyncStatus = (typeof SYNC_STATUSES)[number];

export interface LocalBaseRecord {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: SyncStatus;
  last_synced_at: string | null;
}

export interface LocalDietLog extends LocalBaseRecord {
  remote_id: string | null;
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  vitamin_c_mg: number | null;
  folate_mcg: number | null;
  serving_size: number | null;
  serving_unit: string | null;
  source_food_id: string | null;
  logged_at: string;
}

export interface CreateLocalDietLogInput {
  user_id: string;
  id?: string;
  remote_id?: string | null;
  meal_name: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  vitamin_c_mg?: number | null;
  folate_mcg?: number | null;
  serving_size?: number | null;
  serving_unit?: string | null;
  source_food_id?: string | null;
  logged_at: string;
}

export type UpdateLocalDietLogInput = Partial<
  Omit<CreateLocalDietLogInput, 'id' | 'user_id'>
>;

export interface LocalWorkout extends LocalBaseRecord {
  remote_id: string | null;
  name: string;
  notes: string | null;
  performed_at: string;
}

export interface LocalWorkoutSet extends LocalBaseRecord {
  remote_id: string | null;
  workout_id: string;
  exercise_name: string;
  muscle_group: string | null;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  rir: number | null;
  est_1rm: number | null;
}

export interface CompletedWorkoutInput {
  name: string;
  performedAt: string;
  notes?: string | null;
  sets: Array<{
    exerciseName: string;
    muscleGroup?: string | null;
    setNumber: number;
    reps?: number | null;
    weightKg?: number | null;
    durationSeconds?: number | null;
    rir?: number | null;
    estimated1rm?: number | null;
  }>;
}

export interface LocalWorkoutWithSets extends LocalWorkout {
  sets: LocalWorkoutSet[];
}
