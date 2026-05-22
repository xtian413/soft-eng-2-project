# AGENT.md — Smart Fitness AI
## AI Instruction Manual for Coding Sessions

> This file is the single source of truth for all AI-assisted development on this project.
> Every code suggestion, refactor, or new feature must comply with these rules without exception.

---

## 1. Project Identity

| Field | Value |
|---|---|
| App Name | Smart Fitness AI |
| Type | Mobile Application (iOS + Android) |
| Purpose | Workout, diet, and body weight tracking with on-device AI-generated insights |
| Author | Christian Gamos |
| Course | CCS 308-CS33S1 |

---

## 2. Technology Stack (Strict — Do Not Deviate)

### 2.1 Frontend
- **Framework**: React Native with Expo (managed workflow)
- **Navigation**: React Navigation v6 (Stack + Bottom Tabs)
- **UI Components**: React Native Paper OR custom components
- **State Management**: Zustand (lightweight, no Redux)
- **Charts / Visualization**: Victory Native or React Native Gifted Charts
- **Forms**: React Hook Form with Zod validation
- **API Client**: Axios with a shared base instance in `src/lib/api.ts`

### 2.2 Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Auth Middleware**: Supabase JWT verification via `@supabase/supabase-js`
- **Validation**: Zod (shared schemas where possible with frontend)
- **Environment Config**: `dotenv` with a `.env.example` committed to git
- **Error Handling**: Centralized error handler middleware (`middleware/errorHandler.ts`)

### 2.3 Database
- **Provider**: Supabase (PostgreSQL + Row Level Security)
- **Client**: `@supabase/supabase-js` v2
- **Migrations**: Managed via Supabase CLI (`supabase/migrations/`)
- **Auth**: Supabase Auth (email/password) — do NOT implement custom JWT logic

### 2.4 AI Service — CRITICAL RULES
- **Model**: Gemma 4 e2b (on-device only)
- **Runtime**: MediaPipe LLM Inference API via `@mediapipe/tasks-genai` OR `llama.cpp` WASM bindings via Expo modules
- **Execution**: All inference runs locally on the user's device. Zero network calls for AI generation.
- **❌ NEVER suggest**: OpenAI API, Google Gemini API, Anthropic API, HuggingFace Inference API, Replicate, or any other cloud-hosted AI endpoint
- **❌ NEVER use**: `fetch()` or `axios` calls to any external AI service
- **✅ ALWAYS**: Run `generateInsight()` from `src/ai/gemmaService.ts` which uses the local model only

---

## 3. Repository Structure

```
smart-fitness-ai/
├── AGENT.md                     ← You are here
├── .gitignore
├── README.md
│
├── frontend/                    ← Expo React Native app
│   ├── app.json
│   ├── babel.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── assets/
│   │   ├── fonts/
│   │   ├── icons/
│   │   └── ai-model/            ← Bundled Gemma 4 e2b weights (.bin / .task)
│   └── src/
│       ├── ai/
│       │   ├── gemmaService.ts  ← ONLY place AI inference is called
│       │   └── prompts.ts       ← Prompt templates for insight generation
│       ├── api/
│       │   ├── axiosClient.ts
│       │   ├── workoutApi.ts
│       │   ├── dietApi.ts
│       │   └── progressApi.ts
│       ├── components/
│       │   ├── common/          ← Buttons, Cards, Inputs, Loaders
│       │   ├── workout/
│       │   ├── diet/
│       │   └── progress/
│       ├── hooks/
│       │   ├── useWorkouts.ts
│       │   ├── useDiet.ts
│       │   └── useInsights.ts
│       ├── lib/
│       │   ├── supabase.ts      ← Supabase client init (frontend)
│       │   └── validation.ts    ← Shared Zod schemas
│       ├── navigation/
│       │   ├── AppNavigator.tsx
│       │   ├── AuthNavigator.tsx
│       │   └── TabNavigator.tsx
│       ├── screens/
│       │   ├── auth/
│       │   │   ├── LoginScreen.tsx
│       │   │   └── RegisterScreen.tsx
│       │   ├── dashboard/
│       │   │   └── DashboardScreen.tsx
│       │   ├── workout/
│       │   │   ├── WorkoutListScreen.tsx
│       │   │   ├── LogWorkoutScreen.tsx
│       │   │   └── WorkoutDetailScreen.tsx
│       │   ├── diet/
│       │   │   ├── DietLogScreen.tsx
│       │   │   └── NutritionSummaryScreen.tsx
│       │   ├── progress/
│       │   │   ├── ProgressScreen.tsx
│       │   │   └── BodyWeightScreen.tsx
│       │   └── insights/
│       │       └── InsightsScreen.tsx
│       ├── store/
│       │   ├── authStore.ts
│       │   ├── workoutStore.ts
│       │   └── dietStore.ts
│       └── types/
│           ├── workout.types.ts
│           ├── diet.types.ts
│           └── insight.types.ts
│
├── backend/                     ← Node.js + Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts             ← Server entry point
│       ├── config/
│       │   └── supabase.ts      ← Supabase admin client (service role key)
│       ├── middleware/
│       │   ├── auth.ts          ← JWT verification via Supabase
│       │   ├── errorHandler.ts
│       │   └── validate.ts      ← Zod request validation middleware
│       ├── routes/
│       │   ├── workout.routes.ts
│       │   ├── diet.routes.ts
│       │   └── progress.routes.ts
│       ├── controllers/
│       │   ├── workout.controller.ts
│       │   ├── diet.controller.ts
│       │   └── progress.controller.ts
│       ├── services/
│       │   ├── workout.service.ts
│       │   └── diet.service.ts
│       └── types/
│           └── express.d.ts     ← Augment req.user type
│
└── supabase/
    ├── config.toml
    └── migrations/
        ├── 001_users.sql
        ├── 002_workouts.sql
        ├── 003_diet_logs.sql
        ├── 004_body_progress.sql
        └── 005_ai_insights.sql
```

---

## 4. Database Schema Reference

### `users` (managed by Supabase Auth — extend via profiles)
```sql
-- profiles table extends auth.users
create table profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  height_cm numeric,
  goal text,  -- 'lose_weight' | 'build_muscle' | 'maintain'
  created_at timestamptz default now()
);
```

### `workouts`
```sql
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  notes text,
  performed_at timestamptz not null,
  created_at timestamptz default now()
);
```

### `workout_sets`
```sql
create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null,
  reps integer,
  weight_kg numeric,
  duration_seconds integer  -- for time-based exercises
);
```

### `diet_logs`
```sql
create table diet_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  meal_name text not null,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  logged_at timestamptz not null,
  created_at timestamptz default now()
);
```

### `body_progress`
```sql
create table body_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  weight_kg numeric not null,
  body_fat_pct numeric,
  recorded_at timestamptz not null
);
```

### `ai_insights`
```sql
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  context_type text not null,  -- 'workout' | 'diet' | 'progress' | 'general'
  context_id uuid,             -- nullable FK to the related record
  insight_text text not null,
  generated_at timestamptz default now()
);
```

> **RLS Rule**: Every table must have `enable row level security` and a policy that restricts access to `auth.uid() = user_id`.

---

## 5. AI Service Rules (Non-Negotiable)

### 5.1 The One True AI File
All AI inference logic lives exclusively in `frontend/src/ai/gemmaService.ts`.

```typescript
// frontend/src/ai/gemmaService.ts
// ✅ This is the ONLY file that touches the on-device model.
// ❌ DO NOT import or call any cloud AI API anywhere in this project.

import { LlmInference } from '@mediapipe/tasks-genai';

let modelInstance: LlmInference | null = null;

export async function loadGemmaModel(): Promise<void> {
  // Load bundled model from assets — no network request
  modelInstance = await LlmInference.createFromOptions({
    baseOptions: { modelAssetPath: require('../../assets/ai-model/gemma4-e2b.bin') },
    maxTokens: 512,
    topK: 40,
    temperature: 0.7,
    randomSeed: 101,
  });
}

export async function generateInsight(prompt: string): Promise<string> {
  if (!modelInstance) {
    throw new Error('Gemma model not loaded. Call loadGemmaModel() first.');
  }
  const result = await modelInstance.generateResponse(prompt);
  return result;
}
```

### 5.2 Prompt Templates
All prompt templates are in `frontend/src/ai/prompts.ts`. They must:
- Be concise (stay within Gemma 4 e2b's context window)
- Include relevant numeric data (sets, reps, weight deltas, calorie averages)
- Request a single short paragraph of actionable insight (2–4 sentences)
- NOT request medical advice or diagnosis language

### 5.3 When to Generate Insights
Insights are generated:
1. After a workout is logged — compare against previous same-exercise session
2. On the weekly progress screen — summarize body weight trend + diet average
3. On demand from the Insights tab — user taps "Generate Insight"

---

## 6. Coding Conventions

### 6.1 Language
- All source files use **TypeScript** (strict mode)
- `tsconfig.json` must have `"strict": true`

### 6.2 Naming
| Entity | Convention | Example |
|---|---|---|
| Files | kebab-case | `workout-service.ts` |
| React Components | PascalCase | `WorkoutCard.tsx` |
| Functions/variables | camelCase | `getUserWorkouts()` |
| Database columns | snake_case | `weight_kg` |
| Constants | SCREAMING_SNAKE | `MAX_SETS_PER_EXERCISE` |
| Types/Interfaces | PascalCase with `I` prefix for interfaces | `IWorkout`, `WorkoutSet` |

### 6.3 Imports
- Use absolute imports via `tsconfig` path aliases: `@/components/...`, `@/hooks/...`, `@/ai/...`
- Never use deep relative paths like `../../../../`

### 6.4 Error Handling
- Backend: all async route handlers wrapped in a `catchAsync()` utility that forwards to `errorHandler` middleware
- Frontend: all API calls use try/catch with a toast notification on failure
- AI service: show a UI fallback message ("Insight unavailable — model loading") if `generateInsight()` throws

### 6.5 Comments
- Only write comments for non-obvious logic
- Every exported function must have a single-line JSDoc: `/** Logs a new workout set to Supabase */`

---

## 7. Supabase Interaction Rules

### 7.1 Frontend (Authenticated User Queries)
- Use the anon key only
- Always call via the typed client: `import { supabase } from '@/lib/supabase'`
- Use RLS — never pass `user_id` manually in insert queries; use `auth.uid()` in RLS policies instead

```typescript
// ✅ Correct
const { data, error } = await supabase
  .from('workouts')
  .insert({ name, performed_at })  // user_id set by RLS trigger
  .select()
  .single();

// ❌ Wrong
const { data } = await supabase
  .from('workouts')
  .insert({ name, user_id: currentUser.id, performed_at });
```

### 7.2 Backend (Admin Operations Only)
- Use the service role key — stored in `.env` as `SUPABASE_SERVICE_ROLE_KEY`, never exposed to frontend
- The backend only performs operations that require elevated permissions (e.g., aggregated analytics, admin queries)
- Most CRUD goes through the frontend Supabase client directly — the Express backend is for business logic + AI context assembly, not a simple proxy

### 7.3 Auth Flow
- Auth is handled entirely by Supabase Auth on the frontend
- After login, store the session in Zustand's `authStore`
- Pass the JWT as `Authorization: Bearer <token>` when calling the Express backend
- Backend middleware verifies the JWT via `supabase.auth.getUser(token)`

---

## 8. Sprint Reference

| Sprint | Focus |
|---|---|
| Week 1 | Setup, architecture, wireframes, Supabase schema, Expo init |
| Week 2 | Supabase Auth — registration, login, session management |
| Week 3 | Workout logging UI + API, diet logging UI + API |
| Week 4 | On-device Gemma integration, insight generation pipeline |
| Week 5 | Analytics screens, charts, body weight trend visualization |
| Week 6 | Testing (unit + E2E with Detox), bug fixes, final documentation |

---

## 9. What the AI Must Never Do

1. ❌ Suggest or use any cloud-based AI API for the insight feature (OpenAI, Gemini, Claude, etc.)
2. ❌ Store the Supabase service role key in the frontend
3. ❌ Use JavaScript — all files must be TypeScript
4. ❌ Use `any` type without an explicit `// eslint-disable-next-line` comment and justification
5. ❌ Write raw SQL in controllers — use the Supabase client or a dedicated service function
6. ❌ Skip RLS — every Supabase table must have row-level security enabled
7. ❌ Use class components — only functional React components with hooks
8. ❌ Commit `.env` files — always use `.env.example` with placeholder values

---

## 10. Environment Variables

### `backend/.env.example`
```
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NODE_ENV=development
```

### `frontend/.env.example` (via `app.config.ts` extra)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
```

> Use `EXPO_PUBLIC_` prefix for all Expo env vars that need to be accessible in the app bundle.
