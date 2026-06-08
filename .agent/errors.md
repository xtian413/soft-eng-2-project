# errors.md — Error & Debug History
## Gemi
**Last Updated**: 2026-06-07T15:10:00+08:00

---

## Error Log

---

### [ERR-001] React 19 / React Native Type Conflict
- **Date**: 2026-05-22
- **Severity**: Build-breaking
- **Symptom**: TypeScript compiler errors when `web/` tsconfig included `.native.tsx` files from the shared monorepo. `@types/react-native` JSX declarations conflicted with standard React DOM definitions.
- **Error Message**:
  ```
  error TS2345: Argument of type '...' is not assignable to parameter of type 'ReactNode'
  ```
- **Root Cause**: After relocating `/web/` from `frontend/web/` to the project root, the tsconfig glob patterns inadvertently picked up mobile-only `.native.tsx` files, which import `@types/react-native`. React Native's type definitions conflict with React 19's JSX factory types.
- **Fix**: Added exclusion patterns to `web/tsconfig.app.json`:
  ```json
  {
    "exclude": [
      "src/**/*.native.tsx",
      "src/**/*.native.ts"
    ]
  }
  ```
- **File**: `web/tsconfig.app.json`
- **Status**: ✅ Resolved — `commit 4142be1`

---

### [ERR-002] SVG Progress Ring Invisible (Missing `r` Attribute)
- **Date**: 2026-05-22
- **Severity**: Visual — feature broken
- **Symptom**: Circular calorie progress ring was completely invisible in the Dashboard. Only the fire icon and "X eaten" text appeared. The ring background and progress arc were not rendered.
- **Root Cause**: During the Dashboard TSX refactoring, both `<circle>` SVG elements were written without the `r="45"` (radius) and `fill="none"` attributes. Without `r`, the browser defaults the radius to `0`, rendering a zero-area circle that is invisible.
- **Broken Code**:
  ```tsx
  <circle cx="50" cy="50" className="lumina-progress-bg" />
  <circle cx="50" cy="50" className="lumina-progress-bar" ... />
  ```
- **Fix**:
  ```tsx
  <circle cx="50" cy="50" r="45" fill="none" className="lumina-progress-bg" />
  <circle cx="50" cy="50" r="45" fill="none" className="lumina-progress-bar" ... />
  ```
- **File**: `web/src/pages/Dashboard/Dashboard.tsx`
- **Status**: ✅ Resolved — `commit f1b68cc` (amended)
- **Discovered By**: User screenshot review

---

### [ERR-003] Unused Variable `radius` Compiler Error
- **Date**: 2026-05-22
- **Severity**: Build-breaking (strict TS)
- **Symptom**: `tsc -b` failed with:
  ```
  error TS6133: 'radius' is declared but its value is never read.
  ```
- **Root Cause**: `const radius = 45;` was declared in Dashboard.tsx for SVG circle computation but was never actually referenced (the value `45` was intended to be used inline as the SVG `r` attribute).
- **Fix**: Removed the unused `radius` variable declaration.
- **File**: `web/src/pages/Dashboard/Dashboard.tsx`
- **Status**: ✅ Resolved — `commit f1b68cc` (amended)

---

### [ERR-004] Macro Cards Misaligned on Mobile (Missing `text-align: center`)
- **Date**: 2026-05-22
- **Severity**: Visual — design mismatch
- **Symptom**: Calories label ("CALORIES REMAINING") and value ("1,075 / 2,800 kcal") were left-aligned instead of centered. Macro cards (Protein, Carbs, Fats) text was also left-aligned. Fats card was not spanning full width on mobile.
- **Root Cause**: CSS classes `.lumina-card-label`, `.lumina-calories-value`, and `.lumina-macro-card` were missing `text-align: center`, `justify-content: center`, and `align-items: center`. Grid column spans for mobile layout (`span 2` for Fats) were also absent.
- **Fix**: Added centering properties and explicit mobile grid column spans in `Dashboard.css`.
- **File**: `web/src/pages/Dashboard/Dashboard.css`
- **Status**: ✅ Resolved — `commit f1b68cc` (amended)
- **Discovered By**: User screenshot review

---

### [ERR-005] `react-router-dom` Peer Dependency Conflict
- **Date**: 2026-05-22
- **Severity**: Install warning (non-breaking with flag)
- **Symptom**: `npm install react-router-dom` failed with peer dependency conflict against React 19.
- **Root Cause**: `react-router-dom` at the time of install had upstream peer requirements specifying React `^18`, not yet updated for React 19.
- **Fix**: Used `--legacy-peer-deps` flag:
  ```bash
  npm install react-router-dom --legacy-peer-deps
  ```
- **File**: `web/package.json`
- **Status**: ✅ Resolved — `commit c989869`

---

### [ERR-006] Unused Interface 'FoodLog' causes TypeScript compilation failure
- **Date**: 2026-05-22
- **Severity**: Build-breaking (strict TS)
- **Symptom**: `tsc -b` failed with:
  ```
  error TS6196: 'FoodLog' is declared but never used.
  ```
- **Root Cause**: Interface `FoodLog` was left in `Dashboard.tsx` from the initial stub but not utilized by any functions in the interactive food tracking design.
- **Fix**: Removed the unused `FoodLog` interface from `Dashboard.tsx`.
- **File**: `web/src/pages/Dashboard/Dashboard.tsx`
- **Status**: ✅ Resolved — `commit b266c5bb`

---

### [ERR-007] Unused State 'sleepHours' causes compiler build warning / failure
- **Date**: 2026-05-22
- **Severity**: Build-breaking (strict TS)
- **Symptom**: `tsc -b` failed with unused state variable warnings for the sleep tracking mock.
- **Root Cause**: `useState` hook generated a `setSleepHours` setter which was never invoked because sleep tracking in this sprint is static and read-only.
- **Fix**: Converted `sleepHours` into a read-only variable constant, eliminating the unused state hooks and resolving strict TS verification checks.
- **File**: `web/src/pages/Dashboard/Dashboard.tsx`
- **Status**: ✅ Resolved — `commit b266c5bb`

---

### [ERR-008] pure Type Import ESM Syntax Error in Browser Loader
- **Date**: 2026-05-22
- **Severity**: Runtime-breaking
- **Symptom**: The browser console shows an unhandled runtime error:
  ```
  SyntaxError: The requested module '/src/data/foodAdapter.ts' does not provide an export named 'GemiFoodItem'
  ```
  The page stays blank or fails to render components when navigating to the Food Logging tab.
- **Root Cause**: Vite compiling TS interfaces in combined runtime imports:
  `import { fetchLocalFoodDatabase, GemiFoodItem } from '../../data/foodAdapter';`
  Since `GemiFoodItem` is a TypeScript-only interface, it has no generated runtime JavaScript export. The browser's native ESM loader looks for a compiled runtime object named `GemiFoodItem` and errors out.
- **Fix**: Separated the TS interface definition into its own type-only import declaration:
  ```typescript
  import { fetchLocalFoodDatabase } from '../../data/foodAdapter';
  import type { GemiFoodItem } from '../../data/foodAdapter';
  ```
- **File**: `web/src/pages/Dashboard/Dashboard.tsx`
- **Status**: ✅ Resolved

---

### [ERR-009] Food Logged on Breakfast Appears Under Snacks
- **Date**: 2026-06-07
- **Severity**: Data integrity — user-facing misattribution
- **Symptom**: When a user logs food on breakfast (either via the meal diary "+" button or the Quick Log parser), the entry appears under the "Snacks & Extras" section instead of "Breakfast." The calorie totals still compute, but meal grouping is wrong.
- **Root Cause**: Three interacting factors:

  1. **Quick Log defaults to `'snack'`** (`frontend/src/screens/dashboard/Food/FoodTab.tsx:273`):
     ```typescript
     const [quickMealId, setQuickMealId] = useState<MealId>('snack');
     ```
     The Quick Log meal selector chip defaults to Snack. If a user types a food description and hits Parse without first tapping the Breakfast chip, the entry is saved with `mealId='snack'`.

  2. **`normalizeMealId` silently defaults unknown values to `'snack'`** — duplicated in both:
     - `frontend/src/local/dietLogsMapper.ts:5-9`
     - `frontend/src/local/repositories/dietLogsRepository.ts:84-88`
     ```typescript
     function normalizeMealId(value: string | null | undefined): MealId {
       return value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack'
         ? value
         : 'snack';  // anything else → 'snack'
     }
     ```
     If `meal_id` comes back as `null`/`undefined` from any source (e.g., Supabase migration not applied, backend column missing), the entry is silently reassigned to `'snack'`. This propagates through the remote sync cycle:
     ```
     saveDietLogLocalFirst → syncCreatedDietLogToRemote → refreshFoodLogs →
       fetchDietLogs → upsertRemoteDietLogForUser(…normalizeMealId(log.meal_id)) →
       if log.meal_id is null → overwrites local 'breakfast' with 'snack'
     ```

  3. **Backend and Supabase migration also default to `'snack'`**:
     - `backend/src/services/diet.service.ts:70`: `meal_id: input.meal_id ?? 'snack'`
     - `supabase/migrations/20260605090000_008_diet_logs_meal_id.sql:5`: `set meal_id = 'snack' where meal_id is null;`
     - Column default is `'snack'`, so any insert omitting `meal_id` gets `'snack'`.

  4. **Minor race condition**: `LoggedItemDetailsModal` initializes `editMealId` to `'snack'` before the `useEffect` syncs it from the actual entry's `mealId` (`frontend/src/screens/dashboard/Food/LoggedItemDetailsModal.tsx:50`).

  5. **Backend Not Recompiled**: After modifying `diet.service.ts` to fallback to `'breakfast'`, the backend was not recompiled using `npm run build`. The Express server continued running the old `dist/` Javascript, which completely omitted `meal_id` from the Supabase insert query, forcing Supabase to use its column default (`'snack'`).

  6. **Local SQLite Default**: The local SQLite schema creation script (`frontend/src/local/migrations.ts`) also had `DEFAULT 'snack'` for `meal_id`. While local offline creation properly supplied the value, any programmatic insert omitting it locally would trigger this default.

- **Fix**:
  - **P0**: Change Quick Log default to `'breakfast'` (`FoodTab.tsx:273`): `useState<MealId>('breakfast')`
  - **P1**: Add warning logs in `normalizeMealId()` when receiving unexpected values instead of silently defaulting to `'snack'`
  - **P2**: Verify Supabase migration `008` has been applied to the remote instance
  - **P2**: Initialize `editMealId` from `viewingLoggedItem.mealId` directly instead of defaulting to `'snack'` in `LoggedItemDetailsModal`
  - **P0**: Change fallback `input.meal_id ?? 'snack'` to `input.meal_id ?? 'breakfast'` in `backend/src/services/diet.service.ts`
  - **P0**: Change fallback `DEFAULT 'snack'` to `DEFAULT 'breakfast'` in `supabase/migrations/20260605090000_008_diet_logs_meal_id.sql`
  - **P0**: Change fallback `DEFAULT 'snack'` to `DEFAULT 'breakfast'` in `frontend/src/local/migrations.ts`
  - **P0**: Run `npm run build` in the backend directory to compile the updated typescript logic.
- **Files**:
  - `frontend/src/screens/dashboard/Food/FoodTab.tsx`
  - `frontend/src/local/dietLogsMapper.ts`
  - `frontend/src/local/repositories/dietLogsRepository.ts`
  - `frontend/src/local/migrations.ts`
  - `frontend/src/screens/dashboard/Food/LoggedItemDetailsModal.tsx`
  - `backend/src/services/diet.service.ts`
  - `supabase/migrations/20260605090000_008_diet_logs_meal_id.sql`
- **Status**: ✅ Resolved

---

### [ERR-010] User Registration Supabase Sync Mismatch
- **Date**: 2026-06-07
- **Severity**: Critical / Block-breaking
- **Symptom**: User registration fails to complete successfully, or user profile statistics fail to sync and persist on Supabase, leading to sync errors or incomplete user profile onboarding.
- **Root Cause**: Mismatch between the frontend and Supabase database schemas:
  1. The remote `profiles` table lacked several new columns (`age`, `activity_level`, `target_weight_kg`, etc.) present in the local SQLite database.
  2. The remote `profiles` table had a check constraint restricting the `goal` column to legacy strings (`lose_weight`, `build_muscle`, `maintain`). Frontend registration submitted newer keys (`moderate_cut`, `lean_bulk`, etc.), causing Postgres inserts to fail.
  3. The trigger function `public.handle_new_user()` did not insert the new registration metadata fields (`age`, `activity_level`, etc.) into the profile table on registration.
- **Fix**: Created the `009_update_profiles_schema.sql` migration to add missing columns, update the check constraint to support the new goal strings, and revise the `public.handle_new_user()` trigger function to correctly insert/upsert all signup metadata.
- **Files**:
  - `supabase/migrations/20260607090000_009_update_profiles_schema.sql`
- **Status**: ✅ Resolved

---

*Append new errors below using the `[ERR-NNN]` format.*

---

### [ERR-011] `gradlew` EACCES — Missing Execute Permission on Linux
- **Date**: 2026-06-08
- **Severity**: Build-blocking
- **Symptom**: `npm run android` fails immediately with:
  ```
  Error: spawn /home/jed/Gemi/soft-eng-2-project/frontend/android/gradlew EACCES
  ```
  The Gradle wrapper script cannot be executed.
- **Root Cause**: Git on Windows does not preserve Unix file permission bits. When the repository is cloned on Linux, `android/gradlew` loses its `+x` (executable) bit and becomes a plain text file that the OS refuses to spawn as a process.
- **Fix**:
  ```bash
  chmod +x android/gradlew
  ```
  To persist the fix in Git so it never happens again:
  ```bash
  git update-index --chmod=+x android/gradlew
  git commit -m "chore: mark gradlew as executable"
  ```
- **Files**: `frontend/android/gradlew`
- **Commit**: `880ec75`
- **Status**: ✅ Resolved

---

### [ERR-012] Backend `Network Error` — `localhost:3000` Unreachable from Android Emulator
- **Date**: 2026-06-08
- **Severity**: Runtime — all backend API calls fail silently
- **Symptom**: Every API call from the running app logs:
  ```
  [Gemi] Network error — no response received. Check that your backend is running
  and that EXPO_PUBLIC_API_BASE_URL points to the correct host.
  Current baseURL: http://localhost:3000 Network Error
  ```
  Diet logs, food enrichment, profile sync, body-progress, and workout sync all fail. The backend IS running fine on port 3000.
- **Root Cause**: Inside an Android emulator, `localhost` (or `127.0.0.1`) resolves to the **emulator's own loopback interface**, not the host machine. The host machine is reachable only via the special Android emulator gateway `10.0.2.2`.
- **Fix**: Update `frontend/.env`:
  ```diff
  -EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
  +EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
  ```
  Then rebuild the app (`npm run android`) since `EXPO_PUBLIC_*` variables are baked into the JS bundle at build time — a Metro restart alone is not sufficient.
- **Files**: `frontend/.env`
- **Status**: ✅ Resolved

---

### [ERR-013] `routines_user_id_fkey` Foreign Key Violation on Routine Sync
- **Date**: 2026-06-08
- **Severity**: Data sync failure (routine not persisted to remote)
- **Symptom**: Background routine sync retry logs:
  ```
  [LiftTab] Background routine sync retry failed:
  { code: "23503", details: "Key is not present in table \"profiles\".",
    message: "insert or update on table \"routines\" violates foreign key constraint
    \"routines_user_id_fkey\"" }
  ```
  The local routine (id `d099143a-71b1-44da-a01d-907d967ee83f`) is repeatedly retried but never syncs.
- **Root Cause**: The `routines` table has a foreign key on `user_id` referencing `profiles(id)`. The authenticated user (`ef29e47e-b63d-4d69-899a-e80439b4d418`) does not yet have a row in the `profiles` table on this Supabase instance (likely a fresh / test account that bypassed the registration trigger, or migration `009` was not applied).
- **Fix (choose one)**:
  1. **Apply migration 009**: Run `supabase db push` to apply `009_update_profiles_schema.sql` which updates the `handle_new_user()` trigger. Then re-register (or manually insert a profiles row for the affected user ID).
  2. **Manual insert** (quick workaround for dev):
     ```sql
     INSERT INTO profiles (id) VALUES ('ef29e47e-b63d-4d69-899a-e80439b4d418')
     ON CONFLICT (id) DO NOTHING;
     ```
- **Files**: `supabase/migrations/20260607090000_009_update_profiles_schema.sql`
- **Status**: ⚠️ Identified — fix depends on Supabase migration state

---

*Append new errors below using the `[ERR-NNN]` format.*
