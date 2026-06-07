# features.md — Feature Registry
## Gemi | Branch: Frontend-integration
**Last Updated**: 2026-05-22T22:25:44+08:00

---

## ✅ Completed Features

### [F-001] Supabase Database Schema
- **Date**: 2026-05-22
- **Branch**: master
- **Commit**: `393f98d`
- **Description**: Full PostgreSQL schema with RLS via Supabase migrations.
- **Tables**: `profiles`, `workouts`, `workout_sets`, `diet_logs`, `body_progress`, `ai_insights`
- **Files**:
  - `supabase/migrations/001_profiles.sql`
  - `supabase/migrations/002_workouts.sql`
  - `supabase/migrations/003_workout_sets.sql`
  - `supabase/migrations/004_diet_logs.sql`
  - `supabase/migrations/005_body_progress.sql`
  - `supabase/migrations/006_ai_insights.sql`

---

### [F-002] Express Backend API
- **Date**: 2026-05-22
- **Branch**: master
- **Commit**: `393f98d`
- **Description**: Node.js + Express REST API with JWT auth middleware, Zod validation, and centralized error handling.
- **Routes**: `/workouts`, `/diet`, `/progress`
- **Files**:
  - `backend/src/index.ts`
  - `backend/src/routes/*.routes.ts`
  - `backend/src/controllers/*.controller.ts`
  - `backend/src/services/*.service.ts`
  - `backend/src/middleware/auth.ts`, `errorHandler.ts`, `validate.ts`

---

### [F-003] React Native Auth Screens (Mobile)
- **Date**: 2026-05-22
- **Branch**: master
- **Commit**: `393f98d`, `316331e`
- **Description**: Login and Register screens for Expo mobile app using Supabase Auth.
- **Files**:
  - `frontend/src/screens/auth/LoginScreen.tsx`
  - `frontend/src/screens/auth/RegisterScreen.tsx`
  - `frontend/src/store/authStore.ts`
  - `frontend/src/lib/supabase.ts`

---

### [F-004] Hybrid Web Frontend Setup
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `4142be1`
- **Description**: Vite + React 19 + TypeScript web app initialized in `/web/` (relocated from `frontend/web/`). Configured `tsconfig.app.json` to exclude `.native.tsx` files, resolving React 19 / React Native type conflicts.
- **Files**:
  - `web/src/main.tsx`
  - `web/src/App.tsx`
  - `web/tsconfig.app.json`
  - `web/vite.config.ts`

---

### [F-005] Web Login Page
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `4142be1`
- **Description**: Premium glassmorphic Login screen matching Stitch design. Email/password form with React Hook Form + Zod validation.
- **Design Source**: Stitch project `18296838918076701249`
- **Files**:
  - `web/src/pages/Auth/Login.tsx`
  - `web/src/pages/Auth/Auth.css`

---

### [F-006] Web Register Page
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `4142be1`
- **Description**: Premium glassmorphic Register screen. Includes: Full Name, Email, Password, Confirm Password, Gender selector, Height/Weight sliders (metric/imperial toggle), Goal chip selector (Lose Weight / Build Muscle / Maintain), Terms checkbox.
- **Schema Gap Fixed**: Added `full_name` and `weight_kg` fields missing from original AGENT.md spec.
- **Files**:
  - `web/src/pages/Auth/Register.tsx`
  - `web/src/pages/Auth/Auth.css`

---

### [F-007] React Router Web Navigation
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `c989869`
- **Description**: Full React Router DOM v6 routing. Routes: `/login`, `/register`, `/success`, `/dashboard`, `*` → redirect to `/login`.
- **Data Flow**: Profile data passed via `navigate('/dashboard', { state: data })`.
- **Files**:
  - `web/src/main.tsx` (BrowserRouter wrap)
  - `web/src/App.tsx` (Routes + Route definitions)

---

### [F-008] Web Dashboard — Bento Grid + Macro Tracker
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commits**: `c989869`, `f1b68cc`
- **Description**: High-fidelity Gym Tracker Dashboard matching Stitch screen `011f1f16f07e4bd9a9c7c6b9088371ff`. Features SVG progress ring, goal-adaptive calorie/macro targets, weekly review tracker, and primary design tokens.
- **Files**:
  - `web/src/pages/Dashboard/Dashboard.tsx`
  - `web/src/pages/Dashboard/Dashboard.css`

---

### [F-009] LFM2.5 AI Coach Chat Tab (Simulated)
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `c989869`
- **Description**: Interactive chat panel simulating offline LFM2.5 inference. Smart contextual responses for: protein/nutrition queries, workout/RPE queries, fatigue/recovery queries. Typing indicator animation. Auto-scroll to latest message.
- **Note**: This is a simulation placeholder. Real on-device LFM2.5 inference via llama.cpp will replace this in Sprint 4.
- **Files**:
  - `web/src/pages/Dashboard/Dashboard.tsx` (Chat tab section)

---

### [F-010] Floating Bottom Nav + Desktop Side Rail
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `f1b68cc`
- **Description**: Mobile floating pill-shaped bottom nav (backdrop-blur) with animated active indicator dot transition. Desktop fixed side navigation rail. Both match Stitch design exactly.
- **Tabs**: Home (dashboard), Food, Coach (AI center action), Lift, Profile
- **Files**:
  - `web/src/pages/Dashboard/Dashboard.tsx`
  - `web/src/pages/Dashboard/Dashboard.css`

---

### [F-011] Diet Logging Screen (Web)
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: `b266c5bb`
- **Description**: High-fidelity Diet / Food Tracking screen matching Stitch screen `79d7e80c80e6442ca40085e2917177e1`. Features macro progress bars, clickable water logging up to 8 glasses, a dinner log checklist card toggle, and natural language AI quick logging with fallback heuristics. Shared states instantly update the Home bento grid progress ring.
- **Files**:
  - `web/src/pages/Dashboard/Dashboard.tsx`
  - `web/src/pages/Dashboard/Dashboard.css`

---

### [F-019] Premium Gemi Food Database & Logging Hub
- **Date**: 2026-05-22
- **Branch**: Frontend-integration
- **Commit**: (not committed yet)
- **Description**: Upgraded the Diet Logging interface with a premium, high-fidelity user experience:
  - **Fading Hero Carousel**: 3 panels (Energy Rings, Macros, Bento Micronutrients Grid) transitioning with fade animations.
  - **Offline USDA Database**: debounced search and category pills matching 10,000+ foods, dynamically loaded on-demand.
  - **Portion & Scale Calculator bottom drawer**: real-time metric/multiplier scaling computations.
  - **Manual Barcode Scan Simulator**: laser scan HUD viewfinder matching stapled products.
- **Files**:
  - `web/src/pages/Dashboard/Dashboard.tsx`
  - `web/src/pages/Dashboard/Dashboard.css`
  - `web/src/data/foodAdapter.ts`
  - `web/src/data/Food Database/FoodData_Central_foundation_food_json_2026-04-30.json`

---

### [F-020] Mobile LFM2.5 Native Bridge Scaffolding
- **Date**: 2026-05-23
- **Branch**: master
- **Commit**: (not committed yet)
- **Description**: Added the mobile on-device prompt builder, offline context bridge, and Kotlin native module/package skeletons for local inference (to be migrated to llama.cpp + LFM2.5).
- **Files**:
  - `frontend/src/ai/prompts.ts`
  - `frontend/src/ai/gemmaService.ts`
  - `frontend/android/app/src/main/java/com/frontend/gemma/GemmaModule.kt`
  - `frontend/android/app/src/main/java/com/frontend/gemma/GemmaPackage.kt`

---

## 🔄 In Progress Features

### [F-012] Supabase Auth Integration (Web)
- **Status**: Pending
- **Description**: Connect web Login/Register forms to Supabase Auth. Store session in React state/context. Protect `/dashboard` route with auth guard.
- **Blocker**: None

### [F-013] Real On-Device LFM2.5 Inference (Web)
- **Status**: Pending (Sprint 4)
- **Description**: Replace simulated coach responses with actual LFM2.5 inference via llama.cpp in the web app.
- **Blocker**: Requires model asset bundling

---

## 📋 Planned Features

| ID | Feature | Sprint | Notes |
|----|---------|--------|-------|
| F-014 | Workout logging screen (web) | Sprint 3 | Match Lift tab Stitch design |
| F-015 | Body progress charts | Sprint 5 | Victory Native / recharts |
| F-016 | Mobile dashboard screen | Sprint 3 | DashboardScreen.tsx |
| F-017 | E2E tests with Detox | Sprint 6 | Auth + workout log flows |
| F-018 | Profile edit / settings | Sprint 5 | Update height, weight, goal |
