# changelog.md — Chronological Development Log
## Gemi
**Format**: `[YYYY-MM-DD HH:MM +TZ] TYPE: description`

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
    - Gemma AI Coach chat tab (simulated offline inference, 1.2s delay, keyword responses)
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
