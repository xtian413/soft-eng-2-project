# PRD.md — Product Requirements Document
## Gemi
**Project**: CCS 308-CS33S1 | **Author**: Christian Gamos | **Last Updated**: 2026-05-22

---

## 1. Product Overview

**Gemi** is a cross-platform health and fitness tracking application with on-device AI-generated insights. It runs as a native mobile app (iOS + Android via Expo React Native) and a companion Progressive Web App (Vite + React) sharing the same backend and database.

The core differentiator is **fully offline, on-device AI inference** using Gemma 4 e2b — no cloud AI APIs are ever called.

---

## 2. Goals & Objectives

| # | Goal | Priority |
|---|------|----------|
| 1 | Enable users to log workouts (sets, reps, weight) | P0 |
| 2 | Enable users to log daily diet/nutrition | P0 |
| 3 | Track body weight and composition over time | P0 |
| 4 | Generate personalized AI fitness insights on-device | P0 |
| 5 | Provide a beautiful, premium web dashboard companion | P1 |
| 6 | Maintain strict data privacy — no data leaves the device for AI | P0 |

---

## 3. Target Users

- Fitness enthusiasts tracking hypertrophy and nutrition
- Athletes who want private, on-device AI coaching
- University/course project stakeholders (CCS 308-CS33S1)

---

## 4. Technology Stack

### Frontend — Mobile
| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (managed workflow) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State | Zustand |
| Forms | React Hook Form + Zod |
| API Client | Axios (`src/lib/api.ts`) |
| AI Runtime | MediaPipe LLM Inference (`@mediapipe/tasks-genai`) |

### Frontend — Web
| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 19 + TypeScript |
| Routing | React Router DOM v6 |
| Styling | Vanilla CSS (design tokens from Stitch) |
| AI (Web sim) | Simulated offline Gemma coach (placeholder until WASM binding) |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ |
| Framework | Express.js |
| Auth | Supabase JWT verification |
| Validation | Zod |

### Database
| Layer | Technology |
|-------|-----------|
| Provider | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Migrations | Supabase CLI (`supabase/migrations/`) |

---

## 5. Database Schema

### `profiles`
```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  height_cm numeric,
  weight_kg numeric,         -- Added: missing from original spec
  goal text,                 -- 'lose_weight' | 'build_muscle' | 'maintain'
  created_at timestamptz default now()
);
```
> **Note**: `weight_kg` was identified as missing from the original AGENT.md spec and added during Register page implementation.

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
  duration_seconds integer
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
  context_id uuid,
  insight_text text not null,
  generated_at timestamptz default now()
);
```

---

## 6. Key Non-Functional Requirements

- **AI Privacy**: Zero network calls for AI inference. All inference via local Gemma 4 e2b model.
- **Type Safety**: All source files in strict TypeScript. No `any` without justification.
- **Security**: RLS enabled on every Supabase table. Service role key never in frontend.
- **Performance**: Web app builds under 300ms. Mobile app targets 60fps.
- **Code Style**: Functional components only. Named exports. Zod validation on all forms.

---

## 7. Sprint Plan

| Sprint | Week | Focus |
|--------|------|-------|
| 1 | Week 1 | Setup, architecture, wireframes, schema, Expo init |
| 2 | Week 2 | Supabase Auth — registration, login, session management |
| 3 | Week 3 | Workout logging UI + API, diet logging UI + API |
| 4 | Week 4 | On-device Gemma integration, insight generation pipeline |
| 5 | Week 5 | Analytics screens, charts, body weight trend visualization |
| 6 | Week 6 | Testing (unit + E2E), bug fixes, final documentation |

---

## 8. AI Service Contract

- **Entry point**: `frontend/src/ai/gemmaService.ts` — the ONLY file that touches the model
- **Function**: `generateInsight(prompt: string): Promise<string>`
- **Model**: Gemma 4 e2b (`assets/ai-model/gemma4-e2b.bin`)
- **Triggers**: After workout log, on weekly progress screen, on-demand from Insights tab
- **Fallback UI**: "Insight unavailable — model loading" on error

---

*PRD generated from AGENT.md — update both files when requirements change.*
