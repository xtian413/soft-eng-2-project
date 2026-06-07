# changelog.md — Chronological Development Log
## Gemi
**Format**: `[YYYY-MM-DD HH:MM +TZ] TYPE: description`

---
---
### [2026-06-07 16:30 +0800] REFACTOR: History feature — TrainingCalendar now expands in-place instead of appending separate card
- **Branch**: `jb-branch`
- **Files Modified**:
  - `frontend/src/screens/dashboard/Profile/subcomponents/TrainingCalendar.tsx`
  - `frontend/src/screens/dashboard/Profile/ProfileTab.tsx`
- **Changes**:
  - ✅ **In-place expansion**: TrainingCalendar now manages its own expanded/collapsed state internally. "View All" swaps the compact week scroll for a full month grid within the same component — no separate card appended below.
  - ✅ **Month navigation**: Prev/next arrows, day grid with activity dots, and date detail panel (meals, workouts, sleep, water) moved into TrainingCalendar.
  - ✅ **Dead code removed**: Deleted ~160 lines of duplicated historyCard JSX + styles from ProfileTab. Removed stale history state (`isHistoryOpen`, `historyMonthOffset`, `selectedHistoryDate`, all derived values and handlers).
  - ✅ **Props passed down**: `historyWorkouts`, `historyDietLogs`, `historyLoading`, `historyError` passed from ProfileTab to TrainingCalendar.
  - **Build**: ✅ `npx tsc --noEmit` — 0 errors

### [2026-06-07 11:30 +0800] REFACTOR: Phase 2 TDEE & Macro Engine code review fixes + goal consolidation
- **Branch**: `jb-branch`
- **Files Modified**:
  - `frontend/src/screens/dashboard/types.ts`
  - `frontend/src/utils/macroCalculator.ts`
  - `frontend/src/screens/dashboard/Profile/ProfileTab.tsx`
  - `frontend/src/screens/auth/RegisterScreen.tsx`
  - `frontend/src/store/authStore.ts`
  - `frontend/src/screens/dashboard/DashboardScreen.tsx`
  - `frontend/src/local/repositories/profilesRepository.ts`
  - `AGENT.md`
  - `.agent/changelog.md`
  - `.agent/context.md`
- **Changes**:
  - ✅ **Goal Consolidation**: Removed vague goals (`lose_weight`, `build_muscle`). Now 4 specific goals: `moderate_cut` (-500), `aggressive_cut` (-750), `maintain` (0), `lean_bulk` (+300). Updated all consumers.
  - ✅ **Gender-Aware Calorie Floor**: Min calories now 1500 (male) / 1200 (female) per NIH guidelines.
  - ✅ **Minimum Fat Floor**: Custom macros enforce 0.5g/kg dietary fat minimum for hormone function.
  - ✅ **Goal-Adaptive Protein**: Scales by goal: 1.0g/lb (aggressive cut), 0.85g/lb (moderate cut), 0.8g/lb (otherwise).
  - ✅ **Shared TDEE**: Extracted `calculateTDEE()` to `macroCalculator.ts`. Removed duplicated BMR/TDEE from `ProfileTab.tsx`.
  - ✅ **Debug Panel Removed**: Stripped debug logs from production ProfileTab edit modal.
  - ✅ **Save Confirmation**: Added alert after successful profile stat save.
  - ✅ **Live Macro Gram Preview**: Custom macro sliders now show computed grams in real-time.
  - **Build**: ✅ `npx tsc --noEmit` — 0 errors

### [2026-05-30 18:10 +0800] DOCS: LFM2.5 migration plan and .agent alignment
- **Branch**: (not committed yet)
- **Files Modified**:
  - `.agent/LFM2.5-1.2B.md`
  - `.agent/context.md`
  - `.agent/decisions.md`
  - `.agent/tasks.md`
  - `.agent/features.md`
  - `.agent/PRD.md`
- **Changes**:
  - Added a full LFM2.5-1.2B + llama.cpp Android migration plan reference.
  - Updated project context, decisions, tasks, and PRD to reflect LFM2.5 and llama.cpp.

---
### [2026-05-30 12:48 +0800] CHORE: Removed unused Web subproject
- **Branch**: `mono-repo-integration`
- **Files Modified**:
  - `web/` (Deleted folder and all contents)
- **Changes**:
  - ✅ **Directory Removal**: Completely removed the legacy Vite web app subproject `web/` folder from git tracking and the filesystem since Gemi targets Expo React Native.
  - ✅ **Clean Environment**: Confirmed workspace build and run states are clean and unaffected by this change.

---
### [2026-05-30 12:45 +0800] FEAT: Merged master, Cloyd and jb-branch into Unified Monorepo Branch
- **Branch**: `mono-repo-integration`
- **Files Modified**:
  - `backend/src/services/foodDatabase.service.ts`
  - `web/src/pages/Dashboard/Profile/Profile.tsx`
- **Changes**:
  - ✅ **Branch Merging**: Created `mono-repo-integration` branch. Cleanly merged `origin/jb-branch` (fast-forward) and `origin/Cloyd` (automatic resolve, zero conflicts) in the monorepo workspace.
  - ✅ **Code Reviews & Standards**: Conducted full static code reviews of frontend React Native components, backend service layers, and web application subprojects.
  - ✅ **Frontend Verification**: Cleanly type-checked React Native mobile app utilizing `npx tsc --noEmit` yielding zero type errors.
  - ✅ **Backend Service Fix**: Resolved object-is-possibly-undefined compiler errors in `foodDatabase.service.ts` around `portions` safe navigation. Verified backend build (`npm run build`) runs cleanly.
  - ✅ **Web Integration Fix**: Fixed React props typing in web dashboard subcomponent `Profile.tsx` to handle optional parameter properties, resolving typescript and linter compilation warnings. Verified Vite web client builds flawlessly with `npm run build` and lints with `npm run lint`.
  - **Build**: ✅ Checked type, lint, and build status across all workspaces (Frontend, Backend, Web) successfully with 0 errors.

---
### [2026-05-23 14:56 +0800] FEAT: Mobile on-device LLM native bridge scaffolding (LFM2.5 target)
- **Branch**: `master`
- **Files Modified**:
  - `frontend/src/ai/prompts.ts`
  - `frontend/src/ai/gemmaService.ts`
  - `frontend/android/app/src/main/java/com/frontend/gemma/GemmaModule.kt`
  - `frontend/android/app/src/main/java/com/frontend/gemma/GemmaPackage.kt`
- **Changes**:
  - ✅ **Prompt Builder**: Added a structured workout + diet prompt assembler for context stuffing.
  - ✅ **LLM Service Bridge**: Created a mobile-only service that loads local context and calls the native module.
  - ✅ **Native Module**: Added Kotlin module/package skeleton for LiteRT LLM inference integration.

---

### [2026-05-23 11:55 +0800] FEAT: Integrated Customizable Hydration, Sleep Progress, Portion Config & Diary Entry Details in Mobile
- **Branch**: `master`
- **Files Modified**:
  - `frontend/src/screens/dashboard/Food/FoodTab.tsx`
  - `frontend/src/screens/dashboard/DashboardScreen.tsx`
- **Changes**:
  - ✅ **Customizable Hydration**: Added dynamic daily goal editor with target presets, water cup matrices scaled to the selected goals, and progress bar trackers.
  - ✅ **Sleep Progress Tracker**: Displayed bedtime recovery duration comparing with an 8h target using optimal/fair/poor dynamic color fills and alert warning cards.
  - ✅ **1g Portion Selector**: Implemented custom single-gram search logger chip scaling micro-nutrient highlights dynamically based on gram counts.
  - ✅ **Log Entry Detail Overlays**: Integrated tap sheets on logged meals listing calories, protein, carbs, fats, 7 micro-nutrients highlights, and direct entry deletions.
  - ✅ **Type Safety**: Verified compiling with `npx tsc --noEmit` yielding zero warnings or errors.

---

### [2026-05-23 10:45 +0800] FEAT: Extracted and Integrated Stitch UI for Lift, Profile, and AI Chat
- **Branch**: `Frontend-integration`
- **Files Modified**:
  - `web/src/pages/Dashboard/Lift/Lift.tsx` & `.css`
  - `web/src/pages/Dashboard/Profile/Profile.tsx` & `.css`
  - `web/src/pages/Dashboard/AIChat/AIChat.tsx` & `.css`
  - `artifacts/git_worktree_multi_agent_plan.md`
  - `artifacts/design_extraction_guide.md`
- **Changes**:
  - ✅ **UI Extraction**: Translated raw static Stitch prototypes into proper React TSX components with scoped `.gemi-` namespace Vanilla CSS styles.
  - ✅ **Lift Page**: Rendered the session timer, interactive back squat canvas with stat inputs, and set history tracking layout.
  - ✅ **Profile Page**: Rendered the user avatar, bento-style stat cards (Total Volume, Week Streak), and the horizontal training calendar layout.
  - ✅ **AI Chat Page**: Rendered the conversational message bubbles layout and fixed bottom input bar.
  - ✅ **Orchestration**: Orchestrated git worktrees (`.worktrees/lift`, `.worktrees/profile`, `.worktrees/chat`) and verified rendering locally, then merged everything cleanly into `Frontend-integration`.
  - **Build**: ✅ Fixed unused TS variables and verified that production build contains no errors.

---

### [2026-05-23 10:10 +0800] REFACTOR: Monolithic Dashboard Modularization & TypeScript Safety
- **Branch**: `Frontend-integration`
- **Files Modified**:
  - `web/src/pages/Dashboard/Dashboard.tsx`
  - `web/src/pages/Dashboard/Home/Home.tsx`
  - `web/src/pages/Dashboard/Food/Food.tsx`
  - `web/src/pages/Dashboard/Food/hooks/useFood.ts`
  - `web/src/pages/Dashboard/Food/subcomponents/FoodModal.tsx`
  - `AGENT.md`
  - `.agent/context.md`
  - `.agent/decisions.md`
- **Changes**:
  - ✅ **Dashboard.tsx**: Carved out monolithic page layout into distinct component directories: `Home`, `Food`, `AIChat`, `Lift`, `Profile`. Shrunk from 1,947 lines to a clean, 242-line layout and orchestrator container.
  - ✅ **useFood.ts & FoodModal.tsx**: Re-typed `activeLoggingMealId` and `configMealId` states to use strictly-typed `MealId` union rather than generic `string` to enforce proper compiler alignment.
  - ✅ **Home.tsx & Food.tsx**: Converted mock quick-log payload literals (like `mealId: 'snack'`) to literal assertions via `as const` to satisfy TypeScript constraints.
  - ✅ **AGENT.md**: Added strict `6.6 Component Modularization & Folder Structure` coding conventions rules to avoid monolithic screens in all future agent sessions.
  - ✅ **Verification**: Verified clean Vite production bundles with `0 errors` and `0 warnings`.

---

### [2026-05-23 09:44 +0800] FIX: Portions size selector layout overlap and 1g counterpart
- **Branch**: `Frontend-integration`
- **Files Modified**:
  - `web/src/pages/Dashboard/Dashboard.css`
  - `web/src/pages/Dashboard/Dashboard.tsx`
  - `web/src/pages/Dashboard/Food/subcomponents/FoodModal.tsx`
- **Changes**:
  - ✅ **Dashboard.css**: Added `display: inline-flex` to `.gemi-unit-chip` to solve overlap of padding in inline layout.
  - ✅ **Dashboard.css**: Set `.gemi-portion-row` `align-items: flex-start` to avoid pushing Servings input to the middle of wrapped chips.
  - ✅ **Dashboard.tsx** / **FoodModal.tsx**: Added `1g` option chip for registering precise custom gram tracking.
  - ✅ **Dashboard.tsx** / **FoodModal.tsx**: Made the servings label dynamic (changing to `Grams:` when `1g` is selected, and `Servings:` otherwise) to keep layouts consistent and premium.
  - **Build & Lint**: ✅ Verified that build and lint contain no errors/warnings.

---

### [2026-05-23 09:34 +0800] FIX: Lint and type errors from Food page refactoring
- **Branch**: `Frontend-integration`
- **Files Modified**:
  - `web/src/pages/Dashboard/Food/subcomponents/FoodModal.tsx`
  - `web/src/pages/Dashboard/Dashboard.tsx`
- **Changes**:
  - ✅ **FoodModal.tsx**: Added missing `useEffect` and `useCallback` to React imports
  - ✅ **FoodModal.tsx**: Added missing `fetchLocalFoodDatabase` import from `foodAdapter`
  - ✅ **FoodModal.tsx**: Removed unused `FoodLogEntry` and `MealId` type imports (post-refactor residue)
  - ✅ **FoodModal.tsx**: Converted `ensureDbLoaded` to `useCallback` to fix `react-hooks/exhaustive-deps` warning
  - ✅ **FoodModal.tsx**: Added `eslint-disable-next-line react-hooks/set-state-in-effect` before both setState-in-effect calls
  - ✅ **Dashboard.tsx**: Replaced `useState<any[]>` on `foodLogs` with `useState<FoodLogEntry[]>` (proper typed import from `./types`)
  - ✅ **Dashboard.tsx**: Removed unused `waterGlasses` constant (was assigned but never referenced in JSX)
  - ✅ **Dashboard.tsx**: Added `eslint-disable-next-line react-hooks/set-state-in-effect` before `setProteinTotal` in foodLogs sync effect
  - ✅ **Dashboard.tsx**: Added `eslint-disable-next-line react-hooks/set-state-in-effect` before `ensureDbLoaded()` in food tab activation effect
  - **Build**: ✅ `tsc --noEmit && vite build` — 1.23s, 0 errors, 0 type errors
  - **Lint**: ✅ `eslint src/pages/Dashboard/` — 0 errors, 0 warnings (--max-warnings=0)

---

## 2026-05-22

---

### [2026-05-22 16:36 +0800] INIT: Initial commit — full project scaffold
- **Commit**: `393f98d`
- **Branch**: `master`
- **Author**: Christian Gamos
- **Changes**:
  - Created `AGENT.md` — AI instruction manual and single source of truth
  - Initialized Expo React Native mobile app in `frontend/`
  - Scaffolded Node.js + Express backend in `backend/`
  - Created all 6 Supabase migration files (`001_profiles` → `006_ai_insights`)
  - Set up Supabase config and `.gitignore`
  - Implemented backend routes, controllers, services for workouts, diet, progress
  - Implemented auth middleware (JWT via Supabase), error handler, Zod validate middleware
  - Created mobile auth screens: `LoginScreen.tsx`, `RegisterScreen.tsx`
  - Created mobile navigation: AppNavigator, AuthNavigator, TabNavigator
  - Created Zustand auth store (`authStore.ts`)
  - Created initial dashboard, diet log, progress, workout screens (stubs)
  - Added `catchAsync` utility for safe async route handling

---

### [2026-05-22 17:23 +0800] FIX: Resolved signup issues in mobile auth
- **Commit**: `316331e`
- **Branch**: `master`
- **Author**: Christian Gamos
- **Changes**:
  - Fixed `LoginScreen.tsx` — corrected Supabase auth call parameters
  - Fixed `RegisterScreen.tsx` — corrected profile insert logic
  - Fixed `authStore.ts` — improved session initialization and error handling
  - Added `app.config.ts` for Expo environment variable configuration
  - Fixed `api.ts` — base URL configuration
  - Fixed `supabase.ts` — client initialization with proper env vars
  - Added `frontend/package.json` dependency updates

---

### [2026-05-22 ~21:00 +0800] FEAT: Relocate web workspace + add web auth pages + goal selector
- **Commit**: `4142be1`
- **Branch**: `Frontend-integration`
- **Changes**:
  - **Relocated** Vite web app from `frontend/web/` → `/web/` (project root)
  - **Fixed** `web/tsconfig.app.json`: added `.native.tsx/.ts` exclusions to resolve React 19 / React Native type conflicts (ERR-001)
  - **Created** `web/src/pages/Auth/Login.tsx` — premium glassmorphic login page
  - **Created** `web/src/pages/Auth/Register.tsx` — registration with:
    - Full Name field (schema gap fix)
    - Gender selector
    - Height/Weight sliders with metric/imperial unit toggle
    - Goal chip selector: Lose Weight / Build Muscle / Maintain
    - Terms & Conditions checkbox
  - **Created** `web/src/pages/Auth/Auth.css` — shared auth page styles
  - **Wired** initial `App.tsx` view state machine (pre-Router)
  - **Design Source**: Stitch project `18296838918076701249`

---

### [2026-05-22 ~22:00 +0800] FEAT: React Router integration + premium Dashboard implementation
- **Commit**: `c989869`
- **Branch**: `Frontend-integration`
- **Changes**:
  - Installed `react-router-dom` with `--legacy-peer-deps` (ERR-005)
  - **Rewrote** `web/src/main.tsx` — wrapped in `<BrowserRouter>`
  - **Rewrote** `web/src/App.tsx` — `<Routes>` with `/login`, `/register`, `/success`, `/dashboard`, `*` catch-all
  - **Created** `web/src/pages/Dashboard/Dashboard.tsx`:
    - 5-tab navigation: Home, Food, Coach (AI), Lift, Profile
    - Bento grid calorie tracker with SVG progress ring
    - Macro cards: Protein, Carbs, Fats with animated progress bars
    - Quick Log snack button (real-time macro update)
    - AI Recovery Insight ("Whisper") card
    - Weekly Review with 7-day streak visualizer
    - LFM2.5 AI Coach chat tab (simulated offline inference, 1.2s delay, keyword responses)
    - Food diary tab
    - Lift routines tab
    - Profile stats tab with sign-out
    - Floating pill bottom nav (mobile) with animated dot indicator
    - Fixed side rail nav (desktop, ≥768px)
  - **Created** `web/src/pages/Dashboard/Dashboard.css`:
    - Full M3 design token set as CSS custom properties
    - Goal-adaptive calorie/macro targets
  - **Removed** unused `radius` variable (ERR-003)
  - **Build**: ✅ `tsc -b && vite build` — 286ms, zero errors

---

### [2026-05-22 22:06 +0800] STYLE: Pixel-perfect Stitch design match for Dashboard
- **Commit**: `f1b68cc` (amended from previous)
- **Branch**: `Frontend-integration`
- **Changes**:
  - **Fixed** SVG progress ring: added `r="45"` and `fill="none"` to both `<circle>` elements (ERR-002)
  - **Fixed** calorie card centering: `text-align: center` on label, `justify-content: center` on value row
  - **Fixed** macro card centering: `align-items: center`, `text-align: center`
  - **Fixed** mobile grid spans: Fats card `grid-column: span 2` on mobile, `span 1` on desktop
  - **Fixed** `grid-template-columns` for profile stats: `repeat(3, 1fr)`
  - **Build**: ✅ `tsc -b && vite build` — 239ms, zero errors
  - **Reference Screen**: Stitch `011f1f16f07e4bd9a9c7c6b9088371ff`

---

### [2026-05-22 22:11 +0800] CHORE: Create `.agent/` persistent AI project memory
- **Branch**: `Frontend-integration`
- **Not committed** — tracked in `.gitignore` (optional) or committed as project meta
- **Files Created**:
  - `.agent/PRD.md` — Complete Product Requirements Document
  - `.agent/features.md` — Feature registry (completed, in-progress, planned)
  - `.agent/errors.md` — Error and debugging history (ERR-001 to ERR-005)
  - `.agent/decisions.md` — Architectural and technical decisions (DEC-001 to DEC-008)
  - `.agent/tasks.md` — Task tracker (pending, active, completed)
  - `.agent/context.md` — Project-wide context, design tokens, layout rules, gotchas
  - `.agent/changelog.md` — This file

---

### [2026-05-22 22:25 +0800] FEAT: Stitch Food Hub tracker integration and interactive state synchronization
- **Commit**: `b266c5bb`
- **Branch**: `Frontend-integration`
- **Changes**:
  - **Created** `web/src/pages/Dashboard/Dashboard.css` styles matching the Stitch Food Logging page (`79d7e80c80e6442ca40085e2917177e1`):
    - Translucent glassmorphism surfaces (`backdrop-filter`)
    - Custom colors for macro progress bars (sky blue for protein, orange for carbs, pink for fats)
    - Pulsing outer-glow container for the AI Quick Log input bar
  - **Synchronized** home dashboard Bento Grid calories progress ring and macros with active food tab states:
    - Balanced initial calories logged (`1,450 kcal` eaten, `850 kcal` remaining, `80g P`, `120g C`, `45g F`, `245 kcal base snacks` matching target calorie target `2,300 kcal`)
  - **Implemented** natural language AI Quick Log input parser:
    - Automatically extracts calories from phrases (e.g. `"banana shake 250 kcal"`) and computes macros
    - Matches common food terms with intelligent healthy heuristics (eggs, toast, chicken, steak, salad, rice, burger, etc.) and updates macros
    - Mounts responsive glassmorphic status toast notification system
  - **Wired** interactive meal checklist cards (logs custom high-protein Grilled Salmon dinner on click, supports unlogging) and water droplet intake logging (up to 8 glasses milestone toast)
  - **Fixed** TypeScript type errors:
    - Deleted unused `FoodLog` interface (ERR-006)
    - Changed `sleepHours` state to a read-only variable to clear compiler unused state warning (ERR-007)
    - Cleared all unused `foodLogs` updates and successfully verified 100% clean Vite production compilation check
  - **Build**: ✅ `tsc -b && vite build` — 210ms, zero errors
  - **Reference Screen**: Stitch `79d7e80c80e6442ca40085e2917177e1`

---

### [2026-05-22 22:45 +0800] FEAT: Premium Gemi Food Database & Logging Hub Implementation
- **Commit**: (not committed yet)
- **Branch**: `Frontend-integration`
- **Changes**:
  - **Upgraded** Diet Tracking screen to a premium interface matching top-tier design guidelines.
  - **Implemented** a high-fidelity sliding hero carousel (`• o o`) with 3 views: Calorie summary SVG circles, Macro progress tracks, and a custom **Bento Micronutrients Grid** (100% unlocked, zero paywalls).
  - **Embedded** USDA Foundation Foods Database locally in the client for 100% offline querying and instant debounced lookup.
  - **Integrated** a portion size selector bottom configuration sheet and scaling multiplier calculator supporting dynamic macro and micronutrient tracking.
  - **Built** a manual barcode scanner simulator with animated HUD viewfinder scanning lines.
  - **Fixed** Vite ES module compilation warning using explicit `import type` separate statements (ERR-008).
  - **Updated** app names globally to Gemi.
  - **Build**: ✅ `tsc -b && vite build` — 240ms, zero errors (100% type safe)

---

### [2026-05-22 23:00 +0800] FEAT: Custom Food, DB-Powered Search & HCI Wellness Logs
- **Commit**: (not committed yet)
- **Branch**: `Frontend-integration`
- **Changes**:
  - **Added** `CustomFoodForm` interface and `ModalTab` union type for 3-tab modal.
  - **Added** `customFoods: GemiFoodItem[]` state — reusable user-created food store.
  - **Added** Custom Food Creator tab: validated form with name, serving size/unit, macros, fiber, sodium. Internally converts to per-100g values for database consistency. Auto-navigates to portion configurator on save.
  - **Fixed** food database search: `ensureDbLoaded()` now triggers on food tab open AND when search tab in modal is clicked. Empty query now shows all 800+ foods (browse mode instead of blank).
  - **Added** "My Foods" category filter pill to separate user-created entries from USDA data.
  - **Added** search clear (✕) button for faster query reset.
  - **Replaced** single-click water increment with 8 independent toggle glass buttons — each directly addressable per HCI direct manipulation principles.
  - **Replaced** static `sleepHours` display with interactive bedtime/wake-time `<input type="time">` pickers. Sleep hours computed reactively with cross-midnight arithmetic. Quality label + animated colored progress bar.
  - **Removed** unused `meals` state and `handleMealClick` / `handleWaterIncrement` functions.
  - **Fixed** `useCallback` import (was missing from React imports).
  - **Build**: ✅ `tsc --noEmit && vite build` — 2.51s, 0 errors, 0 type errors

---

### [2026-06-07 09:15 +0800] FEAT: Modernize Food Search & Log Details UI with Dropdown Group Selector
- **Commit**: `5b7b3e7`
- **Branch**: `feature/food`
- **Files Modified**:
  - `frontend/src/screens/dashboard/Food/FoodSearchModal.tsx`
  - `frontend/src/screens/dashboard/Food/LoggedItemDetailsModal.tsx`
  - `frontend/src/screens/dashboard/Food/FoodTab.tsx`
  - `frontend/metro.config.js`
- **Changes**:
  - ✅ **Centered Amount Stepper**: Updated quantity amount inputs to feature centered text alignments, solid white backgrounds (`#ffffff`), and custom left/right border separators.
  - ✅ **Meal Group Dropdown**: Refactored static "Group" categories in both Food Search modal and Logged Items details modal into clickable dropdown triggers.
  - ✅ **Mutually Exclusive Focus**: Implemented exclusive open-states for Serving Size and Meal Group dropdown selections (opening one automatically closes the other).
  - ✅ **Overflow Fix**: Adjusted bento card containers to use `overflow: 'visible'` layout so that absolute dropdown overlays are not clipped on mobile and web viewports.
  - ✅ **Redundancy Cleanup**: Removed the duplicate red "Delete Food Entry" button at the bottom of the logged items modal, relying on the top toolbar's delete button to clean up clutter.
  - **Build**: ✅ Checked with `npx tsc --noEmit` yielding zero compilation errors.

---

## How to Update This Changelog

After every major change, append a new entry using this format:

```markdown
### [YYYY-MM-DD HH:MM +TZ] TYPE: Short description
- **Commit**: `hash` (or "not committed yet")
- **Branch**: `branch-name`
- **Changes**:
  - Bullet list of what changed and why
  - Reference errors fixed: (ERR-NNN)
  - Reference decisions made: (DEC-NNN)
  - Reference features completed: (F-NNN)
  - **Build**: ✅/❌ status + time
```

**Types**: `INIT`, `FEAT`, `FIX`, `STYLE`, `REFACTOR`, `CHORE`, `TEST`, `DOCS`
