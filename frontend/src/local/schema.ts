import type { MealId, GoalKey, ActivityLevel } from '@/screens/dashboard/types';

export const GEMI_USER_DATABASE_NAME = 'gemi_user.db';

export const LOCAL_SCHEMA_VERSION = 11;

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
  dailyLogs: 'daily_logs',
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

export interface LocalProfile extends LocalBaseRecord {
  full_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: 'male' | 'female' | null;
  goal: GoalKey | null;
  age: number | null;
  activity_level: ActivityLevel | null;
  target_weight_kg: number | null;
  macro_protein_pct: number | null;
  macro_carbs_pct: number | null;
  macro_fats_pct: number | null;
}

export interface LocalDailyLog extends LocalBaseRecord {
  remote_id: string | null;
  date: string;            // 'YYYY-MM-DD'
  bedtime: string | null;  // 'HH:MM' 24h
  waketime: string | null;
  sleep_hours: number | null;
  water_ml: number | null;
  water_goal_ml: number | null;
}

export interface LocalBodyProgress extends LocalBaseRecord {
  remote_id: string | null;
  weight_kg: number;
  body_fat_pct: number | null;
  recorded_at: string;
  recorded_date: string;
}

export interface LocalAiInsight extends LocalBaseRecord {
  title: string | null;
  summary: string | null;
  nutrition: string | null;
  training: string | null;
  next_step: string | null;
  confidence: string | null;
  payload_json: string | null;
  data_snapshot_hash: string | null;
  generated_at: string;
}

export interface LocalDietLog extends LocalBaseRecord {
  remote_id: string | null;
  meal_id: MealId;
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
  meal_id?: MealId;
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

export interface LocalRoutine extends LocalBaseRecord {
  remote_id: string | null;
  remote_template_workout_id: string | null;
  routine_name: string;
}

export interface LocalRoutineExercise extends LocalBaseRecord {
  remote_id: string | null;
  routine_id: string;
  exercise_name: string;
  muscle_group: string | null;
  sort_order: number;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
}

export interface CreateLocalRoutineInput {
  routineName: string;
  remoteId?: string | null;
  remoteTemplateWorkoutId?: string | null;
  exercises: Array<{
    id?: string;
    remoteId?: string | null;
    exerciseName: string;
    muscleGroup?: string | null;
    sortOrder: number;
    sets?: number | null;
    reps?: number | null;
    weightKg?: number | null;
  }>;
}

export interface LocalRoutineWithExercises extends LocalRoutine {
  exercises: LocalRoutineExercise[];
}
