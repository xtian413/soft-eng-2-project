# tasks.md — Task Tracker
## Gemi
**Last Updated**: 2026-05-22T22:25:44+08:00

---

## 🔴 Current / Active Tasks

> Tasks being actively worked on right now.

*(None active — previous session completed all immediate tasks.)*

---

## 🟡 Pending Tasks

### [TASK-001] Supabase Auth Integration — Web
- **Priority**: P0
- **Sprint**: 2
- **Description**: Connect web `Login.tsx` and `Register.tsx` to real Supabase Auth. On success, store session and redirect to `/dashboard`.
- **Acceptance Criteria**:
  - [ ] `supabase.auth.signUp()` called on register with email + password
  - [ ] Profile row inserted into `profiles` table after signup
  - [ ] `supabase.auth.signInWithPassword()` called on login
  - [ ] Auth state persisted (Zustand or React Context)
  - [ ] `/dashboard` redirects to `/login` if no active session
- **Files to Modify**:
  - `web/src/pages/Auth/Login.tsx`
  - `web/src/pages/Auth/Register.tsx`
  - `web/src/lib/supabase.ts` (create if not exists)
  - `web/src/store/authStore.ts` (create if not exists)

---

### [TASK-002] Real Gemma WASM Inference — Web
- **Priority**: P1
- **Sprint**: 4
- **Description**: Replace simulated coach responses in Dashboard Coach tab with actual on-device Gemma 4 e2b inference via `@mediapipe/tasks-genai`.
- **Acceptance Criteria**:
  - [ ] Model asset bundled via Vite static asset import
  - [ ] `loadGemmaModel()` called on Dashboard mount
  - [ ] `generateInsight(prompt)` replaces simulated delay + keyword matching
  - [ ] Loading state shown while model initializes
  - [ ] Fallback UI: "Insight unavailable — model loading" on error
- **Files to Create/Modify**:
  - `web/src/ai/gemmaService.ts` (create — mirrors mobile implementation)
  - `web/src/pages/Dashboard/Dashboard.tsx`

---

### [TASK-003] Workout Logging Screen — Web
- **Priority**: P1
- **Sprint**: 3
- **Description**: Build the Lift tab into a full workout logging experience. Users can add exercises, sets, reps, and weight.
- **Acceptance Criteria**:
  - [ ] Add exercise button opens exercise selector
  - [ ] Set/rep/weight inputs per exercise
  - [ ] Save workout calls `POST /workouts` via Supabase client
  - [ ] Success toast + data persisted to Supabase

---

### [TASK-004] Supabase Integration for Diet Logging — Web
- **Priority**: P1
- **Sprint**: 3
- **Description**: Bind the already implemented high-fidelity Diet/Food Logging screen to real Supabase `diet_logs` database tables (depends on TASK-001).
- **Acceptance Criteria**:
  - [ ] Fetches logged meals dynamically from Supabase database `diet_logs` table
  - [ ] Inserts new logged meals or snacks into the database via Supabase client
  - [ ] Syncs calories remaining and progress totals automatically with database values on mount
  - [ ] Retains full offline responsive fallback mechanics

---

### [TASK-005] Mobile Dashboard Screen
- **Priority**: P1
- **Sprint**: 3
- **Description**: Implement `frontend/src/screens/dashboard/DashboardScreen.tsx` with summary cards for today's calories, protein, recent workout, and AI insight.
- **Acceptance Criteria**:
  - [ ] Macro summary cards (real Supabase data)
  - [ ] Recent workout card
  - [ ] Gemma AI insight (generated via `gemmaService.ts`)
  - [ ] Navigation to all major screens

---

### [TASK-006] Auth Guard — Web Router
- **Priority**: P0
- **Sprint**: 2
- **Description**: Protect `/dashboard` route from unauthenticated access. Redirect to `/login` if no Supabase session.
- **Acceptance Criteria**:
  - [ ] `ProtectedRoute` wrapper component created
  - [ ] Checks Supabase session on mount
  - [ ] Redirects unauthenticated users to `/login`
  - [ ] Shows loading spinner while checking session

---

### [TASK-007] Body Progress Tracking — Mobile
- **Priority**: P2
- **Sprint**: 5
- **Description**: Implement `ProgressScreen.tsx` and `BodyWeightScreen.tsx` with weight trend chart.
- **Acceptance Criteria**:
  - [ ] Body weight entry form
  - [ ] Historical weight trend line chart (Victory Native or Gifted Charts)
  - [ ] Body fat percentage optional field
  - [ ] Data persisted to `body_progress` table

---

## ✅ Completed Tasks

### [TASK-C001] Initialize Project Repository
- **Completed**: 2026-05-22 | **Commit**: `393f98d`
- AGENT.md, .gitignore, Supabase schema, backend scaffolding, Expo mobile app init.

### [TASK-C002] Supabase Database Migrations
- **Completed**: 2026-05-22 | **Commit**: `393f98d`
- All 6 migration files created with RLS policies.

### [TASK-C003] Express Backend API Scaffold
- **Completed**: 2026-05-22 | **Commit**: `393f98d`
- Workout, diet, progress routes + controllers + services.

### [TASK-C004] Mobile Auth Screens
- **Completed**: 2026-05-22 | **Commit**: `393f98d`, `316331e`
- LoginScreen, RegisterScreen, authStore, Supabase client. Signup bug fixed in `316331e`.

### [TASK-C005] Web Frontend Initialization + Relocation
- **Completed**: 2026-05-22 | **Commit**: `4142be1`
- Vite + React 19 web app initialized. Relocated from `frontend/web/` → `/web/`. tsconfig fixed.

### [TASK-C006] Web Login + Register Pages
- **Completed**: 2026-05-22 | **Commit**: `4142be1`
- Full-featured auth pages matching Stitch design. Name, goal selector, unit toggles added.

### [TASK-C007] React Router Integration
- **Completed**: 2026-05-22 | **Commit**: `c989869`
- BrowserRouter, Routes, all pages wired. Profile data passed via navigation state.

### [TASK-C008] Web Dashboard Implementation
- **Completed**: 2026-05-22 | **Commits**: `c989869`, `f1b68cc`
- Full bento grid dashboard. Calories ring, macro trackers, coach chat, lift tab, food tab, profile tab. Pixel-perfect Stitch match after SVG fix.

### [TASK-C009] Create `.agent/` Persistent Project Memory
- **Completed**: 2026-05-22
- PRD, features, errors, decisions, tasks, context, changelog files created.

### [TASK-C010] Diet Logging Screen UI & Offline Interactive State Sync — Web
- **Completed**: 2026-05-22 | **Commit**: `b266c5bb`
- High-fidelity Stitch-matched food diary tracking panel, interactive checklist cards, water tracker drop increments, offline natural language quick logging parser, toast system, and active macro bento-grid progress sync.

### [TASK-C011] Premium Gemi Food Database & Logging Hub — Web
- **Completed**: 2026-05-22
- Implemented fading nutrient summary carousels, custom highlighted micronutrient bento grids (unlocked without paywall), offline USDA Foundation Foods Database dynamic loaders with portion scaling multipliers, and mock laser viewfinder barcode scanning selectors.

### [TASK-C012] Custom Food + HCI Water & Sleep Improvements — Web
- **Completed**: 2026-05-22
- **Files Modified**: `Dashboard.tsx`, `Dashboard.css`, `foodAdapter.ts`
- **Changes**:
  - ✅ **Custom Food Form**: "Create Custom Food" 3rd modal tab with validated form (name, serving size/unit, calories, protein, carbs, fat, fiber, sodium). Internally stored as `GemiFoodItem` objects in `customFoods[]` state. Custom foods appear under "My Foods" filter pill. After creation, auto-navigates user to the portion configurator for that item.
  - ✅ **Real Food DB Search**: Fixed dynamic JSON import in `foodAdapter.ts` by resolving `.default` (since ESM dynamic imports in Vite return a Module namespace object where the JSON is situated on `.default`). Filtered out null descriptions.
  - ✅ **Dashboard DB Loading Trigger**: Updated search triggers so that the database is loaded if `isOptionsModalOpen` is true, ensuring dashboard "Add Food" bento card triggers successfully load USDA records even when on the Home/Dashboard tab.
  - ✅ **Water Intake (HCI)**: Replaced single-glass increment with customizable goal-oriented tracker (e.g. 4L goal support). Dynamic number of glass toggle buttons rendering based on selected target (e.g. 4L goal = 16 glasses). High touch target minimum WCAG compliant (44px) button sizes optimized for mobile views.
  - ✅ **Sleep Log (HCI)**: Replaced static `sleepHours` display with bedtime/wake-time `<input type="time">` pickers. Clear contextual copy added: "Log last night → this morning" with labels: "Slept at (last night)" and "Woke up (this morning)" ensuring complete sleep schedules clarity.
  - **Build**: ✅ `tsc --noEmit && vite build` — 1.90s, 0 errors
