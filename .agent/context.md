# context.md — Project-Wide Context & Notes
## Gemi
**Last Updated**: 2026-06-08T23:25:00+08:00

---

## 🗺️ Project Overview Snapshot

| Field | Value |
|-------|-------|
| App Name | Gemi |
| Course | CCS 308-CS33S1 |
| Author | Christian Gamos (`chris.gamos.13@gmail.com`) |
| Repo | `soft-eng-2-project` |
| Active Branch | `ai-optimization` |
| Base Branch | `master` |
| Web App URL (dev) | N/A — web/ subproject deleted; project is now pure Expo React Native |

---

## 📁 Directory Structure (Current State)

```
soft-eng-2-project/
├── .agent/               ← AI persistent memory (this folder)
├── .gitignore
├── .vscode/
├── AGENT.md              ← Source of truth for AI coding rules
├── artifacts/            ← Stitch HTML exports and reference files
├── backend/              ← Node.js + Express API
│   └── src/
│       ├── config/, controllers/, middleware/, routes/, services/, types/, utils/
├── frontend/             ← Expo React Native app (iOS + Android)
│   └── src/
│       ├── ai/           ← on-device inference (LFM2.5 via llama.cpp; rename gemmaService.ts later)
│       ├── api/, components/, hooks/, lib/, navigation/, screens/, store/, types/
│       ├── local/        ← SQLite local-first repositories, migrations, sync
│       └── theme/        ← Design tokens (colors, typography)
├── supabase/             ← Supabase migrations + config
│   └── migrations/       ← 001–006 SQL files + timestamped duplicates
```
> **Note:** The `web/` Vite companion app was deleted (2026-05-30, `mono-repo-integration`). Gemi is now pure Expo React Native.

### Goal System (4 goals, consolidated 2026-06-07)
| Goal | Calorie Offset | Protein (g/lb) |
|------|---------------|-----------------|
| `moderate_cut` | -500 kcal | 0.85 |
| `aggressive_cut` | -750 kcal | 1.0 |
| `maintain` | 0 | 0.8 |
| `lean_bulk` | +300 kcal | 0.8 |

---

## 🎨 Design System

- **Design Tool**: Google Stitch (Material Design 3 based)
- **Stitch Project ID**: `18296838918076701249`
- **Key Screen IDs**:
  | Screen | Stitch ID |
  |--------|-----------|
  | Dashboard with Floating Nav | `011f1f16f07e4bd9a9c7c6b9088371ff` |
  | Food / Diet Logging Screen | `79d7e80c80e6442ca40085e2917177e1` |
  | Login | (fetched from Stitch project) |
  | Register | (fetched from Stitch project) |
- **Color Tokens** (key subset):
  | Token | Value | Usage |
  |-------|-------|-------|
  | `--primary` | `#006591` | Main brand color |
  | `--primary-container` | `#0ea5e9` | Accent / CTA buttons, progress bars |
  | `--on-primary` | `#ffffff` | Text on primary |
  | `--surface-container-lowest` | `#ffffff` | Card backgrounds |
  | `--background` | `#f8f9ff` | Page background |
  | `--on-surface` | `#0b1c30` | Primary text |
  | `--on-surface-variant` | `#3e4850` | Secondary text |
  | `--secondary-container` | `#fd761a` | Fats / streak fire accent |
  | `--tertiary-fixed-dim` | `#f7be1d` | Carbs yellow accent |
  | `--outline` | `#6e7881` | Muted text, borders |
  | `--protein-accent` | `#60a5fa` | Protein sky blue accent |
  | `--carbs-accent` | `#f59e0b` | Carbs tangerine accent |
  | `--fats-accent` | `#ec4899` | Fats hot pink accent |
- **Typography**: Inter (Google Fonts) — weights 400/500/600/700/800
- **CSS Class Namespace**: `lumina-` prefix on all component classes

---

## 🔑 Key Technical Context

### SVG Circular Progress Ring
The calorie progress ring in `Dashboard.tsx` uses these exact values from the Stitch HTML spec:
- `viewBox="0 0 100 100"`
- `cx="50" cy="50" r="45"`
- `fill="none"` (both circles)
- `stroke-width: 8` (via CSS)
- `strokeDasharray={282}` (circumference = 2π × 45 ≈ 282.74, rounded to 282)
- `strokeDashoffset` computed as: `282 - (percentComplete / 100) * 282`
- SVG rotated -90° via CSS `transform: rotate(-90deg)` to start from 12 o'clock

### Mobile Grid Layout (Bento)
On mobile (< 768px): `grid-template-columns: repeat(2, 1fr)`
- Calories card: `grid-column: span 2; grid-row: span 2`
- Protein: `grid-column: span 1`
- Carbs: `grid-column: span 1`
- Fats: `grid-column: span 2` (full width on mobile)
- Quick Log: `grid-column: span 2`

On desktop (≥ 768px): `grid-template-columns: repeat(4, 1fr)`
- All macro cards: `grid-column: span 1`

### TrainingCalendar Component (2026-06-07, updated 15:00)

The `TrainingCalendar` component in `ProfileTab` manages its own expanded/collapsed state internally:

- **Compact mode (unexpanded)**: Wrapped in a themed `compactCard` container matching the rest of the Profile tab (`surfaceContainerLowest`, `radius.lg`, border+shadow). Header uses a three-column layout: left (`‹ 📅 ›` nav arrows + Calendar icon), center ("Fitness Journey" title), and right ("View All" + chevron). A weekday labels row (`Su Mo Tu We Th Fr Sa`) sits above a 7-column grid of day cells. Day cells use `surfaceContainerLow` background with centered date numbers and blue activity dots. Today's cell is highlighted with a `Colors.primary` border. Week navigation via `weekOffset` state browses past/future weeks computed from `historyWorkouts`/`historyDietLogs`/`historyDailyLogs`.
- **Expanded mode**: Full month grid inside a themed `historyCard` container. Includes month navigation arrows, 3-letter weekday headers aligned with the grid, activity dots on tracked days (workouts, diet logs, sleep, or water), and a detail panel with section dividers for meals, workouts, sleep, and water.
- **Grid sizing**: Both compact and expanded cell sizes calculated dynamically via `(containerMaxWidth - cardPadding*2 - gap*6) / 7` using `useWindowDimensions`.
- **Toggle**: "View All" / "Weekly View" text link; month/week offsets reset on toggle.
- **Data flow**: `ProfileTab` fetches history data (workouts, diet logs, and local daily logs via `getDailyLogsByUser`) eagerly on mount and passes `historyWorkouts`, `historyDietLogs`, `historyDailyLogs`, `historyLoading`, `historyError` as props. Compact mode falls back to `days` prop when history data is empty.
- **Title**: Renamed from "Training Calendar" to "Fitness Journey".

### 🚀 Local LLM Developer Host-Bridge Mode (2026-06-08)
- **Problem**: Emulator CPU limits result in slow local LLM generation (~85s per prompt) and high risk of OOM app crashes when loading 2GB+ model files.
- **Solution**: Implemented `USE_HOST_LLM_BRIDGE = true` inside `frontend/src/ai/lfmService.ts`.
- **Mechanism**:
  - The app skips loading the massive model file into the Android emulator's RAM.
  - All inference requests are proxied via `10.0.2.2:11434/api/generate` to Ollama or llama.cpp server running on the host laptop, leveraging the native CPU/GPU hardware.
  - Unlocks sub-second response times for development and testing.
- **Reference**: Detailed troubleshooting steps (such as the SD card `tee` permissions workaround and Expanded Emulator Partition setups) are detailed in `frontend/LFM_OPTIMIZATION_GUIDE.md`.

### React Router Navigation Flow
```
/login → (register link) → /register → (submit) → /success → (launch) → /dashboard
/dashboard → (sign out) → /login
* → /login (catch-all redirect)
```
Profile data passed: `navigate('/dashboard', { state: { fullName, email, gender, height, weight, goal } })`

### Auth Screens — Registration & Login (2026-06-07)
- **Error handling**: Both screens use `AuthErrorBanner` (4 variants: error/warning/success/info) instead of `Alert.alert`. Messages are mapped to user-friendly text (e.g., "already registered" → info banner with "Go to Login" link; invalid credentials → error banner).
- **Date of Birth**: Uses `DatePickerSelect` — three tappable chips (Month, Day, Year) each opening a modal with scrollable FlatList. Internal value stored as YYYY-MM-DD string for backward compatibility with Zod schema.
- **Target Weight**: Optional field in Physical Stats card. Falls back to current weight when not provided. Saved to `target_weight_kg` in profiles table and `targetWeightKg` in Zustand profile state.
- **Signup metadata**: `authStore.signUp()` now passes `age`, `activity_level`, and `weight_kg` to `raw_user_meta_data` for Postgres triggers. Saves `target_weight_kg` to profiles upsert.
- **Password toggles**: Eye/EyeOff independent toggle per field (Password, Confirm Password).
- **Beginner labels**: Goal selector uses friendlier names ("Fat Loss", "Stay Fit", etc.). Activity level buttons show frequency descriptions.

### Goal → Targets Mapping
| Goal | Calories | Protein | Carbs | Fats |
|------|----------|---------|-------|------|
| `build_muscle` | 2800 kcal | 180g | 300g | 75g |
| `lose_weight` | 2000 kcal | 160g | 200g | 60g |
| `maintain` | 2400 kcal | 140g | 250g | 70g |

### Food Logging & State Synchronization Context
* **MealId Lifecycle & `'snack'` Default Bias (2026-06-07)**:
  - The `MealId` type is `'breakfast' | 'lunch' | 'dinner' | 'snack'`.
  - **Critical pattern**: Every layer that touches `meal_id` defaults unknown/null values to `'snack'`:
    - `normalizeMealId()` in `dietLogsMapper.ts` and `dietLogsRepository.ts` → `'snack'`
    - Backend `diet.service.ts:70` → `input.meal_id ?? 'snack'`
    - Supabase migration `008` → `set meal_id = 'snack' where meal_id is null;` + column default `'snack'`
  - **Consequence**: If `meal_id` is absent/null at any point (e.g., migration not applied, backend drops the field), every returning diet log silently gets `'snack'` — overwriting the correct local value during remote sync.
  - **Quick Log default**: `quickMealId` state in `FoodTab.tsx` initializes to `'snack'`. The Quick Log meal selector chip defaults to Snack — user must explicitly tap Breakfast/Lunch/Dinner before parsing.
  - See ERR-009.
* **Initial Balanced Load**: The Stitch prototype default of `1,450 kcal` eaten, `850 kcal` remaining under a calorie target of `2,300 kcal` is represented by setting `80g Protein`, `120g Carbs`, `45g Fats`, and a `baseSnackCalories` offset of `245 kcal`.
* **Dynamic Calculations**:
  * $\text{Calories Eaten} = (\text{Protein} \times 4) + (\text{Carbs} \times 4) + (\text{Fats} \times 9) + \text{baseSnackCalories}$
  * $\text{Calories Remaining} = \text{Target Calories} - \text{Calories Eaten}$
* **Interactive Toggles**:
  * **Water Logger**: Fully customizable daily target (e.g. 4L goal support). Dynamically draws the number of glasses based on 250mL servings (capped at 12 maximum). WCAG-compliant touch targets (44px) wrap beautifully on narrow viewport screens. Shows a progress bar and remaining amount.
  * **Sleep Logger**: Bedtime and Wake-up time custom React Native modal scroll pickers. Features sleep schedule metrics, sleep quality tracking, color-coded visual feedback based on target (8h goal) aligned with the primary design theme, progress indicator, and warning banner for sleep < 6h.
  - **Meal Checklist**: Breakfast, Lunch, Dinner, and Snacks. Breakfast starts preloaded with 540 kcal egg & toast. dinner has togglable Grilled Salmon. Snacks can be added directly via search or barcode scans.
  - **AI Quick Log**: Parses text for calories (e.g. `"200 kcal"`) or keyword mappings (e.g. eggs, toast, steak) and dynamically increments user macros with a matching toast alert.
  - **USDA Foundation Foods & Scale Configurator**: Ingested dynamically from a local FDC database JSON file. Dynamic module resolution requires parsing `.default` since dynamic imports in ES Modules return namespace containers. Searching is available globally from any view, as triggers monitor modal state (`isOptionsModalOpen`).
  - **Barcode Scan Simulator**: Animates a mock scan viewfinder laser overlay; typing or scanning mocks the retrieval of commercial staples (Hummus).

---

## ⚠️ Known Constraints & Gotchas

1. **`react-router-dom` install**: Must use `--legacy-peer-deps` due to React 19 peer constraint.
2. **`.native.tsx` files**: `web/tsconfig.app.json` must exclude `src/**/*.native.tsx` and `src/**/*.native.ts` or type conflicts occur.
3. **TypeScript ESM pure type imports**: Browsers throwing runtime `SyntaxError` when importing TypeScript interfaces inside standard runtime declarations. Pure interfaces must be imported explicitly with `import type` (ERR-008).
4. **AI is simulated in web**: The coach chat in `Dashboard.tsx` uses keyword matching with a 1.2s fake delay. Real on-device LFM2.5 inference is Sprint 4.
5. **No auth guard yet**: `/dashboard` is accessible without login. `ProtectedRoute` component is pending (TASK-006).
6. **User Profile Sync**: The registration flow is wired to save profile data (age, goal, activity level, height, weight, target weight) to Supabase Auth metadata and upsert it into the profiles database table. A remote Postgres trigger on signup handles profiles creation from raw metadata.
7. **Stitch images**: The profile avatar image in Dashboard uses a Google AIDA public URL. Should be replaced with actual user avatar from Supabase Storage in production.
8. **Supabase migration duplicates**: There are both named (`001_profiles.sql`) and timestamped (`20260522055821_001_profiles.sql`) migration files. The timestamped ones are the ones Supabase CLI actually uses.
9. **`normalizeMealId` silently defaults unknown values to `'snack'`**: Both `dietLogsMapper.ts` and `dietLogsRepository.ts` contain a `normalizeMealId()` function that returns `'snack'` for any value not strictly matching one of the four valid MealId values. This means `null`, `undefined`, or any unexpected string silently maps to `'snack'`. Combined with the remote sync cycle (`fetchDietLogs → upsertRemoteDietLogForUser → normalizeMealId(log.meal_id)`), a missing `meal_id` on the remote side overwrites a correct local value with `'snack'`. The backend service (`diet.service.ts:70`) and Supabase migration (`008`) also default to `'snack'`. See ERR-009.
10. **Quick Log defaults to `'snack'` meal**: The `quickMealId` state in `FoodTab.tsx` initializes to `'snack'`. The Quick Log card renders meal selector chips (Breakfast, Lunch, Dinner, Snack) with Snack pre-selected. If a user types a food description and hits "Parse" without first tapping the Breakfast chip, the entry is saved under Snacks. See ERR-009.

---

## 🔮 Future Risks & Potential Error Vectors (For Future Reference)

1. **Shared State Prop-Drilling vs. State Store:**
   - *Risk:* As multiple tabs (like `Lift`, `Food`, and `AIChat`) scale and require reactive access to shared states, drilling functions (like `setFoodLogs`, `setToastMessage`) down through `Dashboard.tsx` will clutter component interfaces.
   - *Future Solution:* Transition key shared scopes to a lightweight client-side **Zustand** store (as recommended in `AGENT.md` Section 2.1) to isolate container rendering from state operations.
2. **ESM Dynamic Imports for local binary/WASM assets:**
  - *Risk:* Vite dynamic loaders might crash or ignore ESM dynamic namespaces when loading the local LFM2.5 runtime model in Sprint 4 if not resolved with `.default` or absolute resolver path overrides.
  - *Future Solution:* Ensure local dynamic models explicitly map through verified asset aliases and handle module namespace bindings with fallback triggers.
3. **Transient React State Loss on Viewport Refresh:**
   - *Risk:* User logs (meals, sleep targets, water tracking) exist strictly in transient React memory. A browser reload wipes all progress completely.
   - *Future Solution:* Wire up persistence hooks (e.g. standard `localStorage` wrapper hooks) or push entries directly to Supabase endpoints (`diet_logs`, `workouts`) when the backend DB connection is established.
4. **Transient User Onboarding Location Routing:**
   - *Risk:* If a user accesses `/dashboard` directly without routing through `/login` or `/register`, `location.state` will be null, crashing profile metadata displays.
   - *Future Solution:* Wrap `/dashboard` in a session auth guard (`ProtectedRoute`) that falls back to query profiles from Supabase or loads client-side caches.

---

## 👥 Team Context

- **Lead Developer**: Christian Gamos
- **AI Pair Programmer**: Antigravity (Google DeepMind)
- **Git Workflow**: Feature branches off `master`. Current active branch: `Frontend-integration`.
- **Commit Convention**: Conventional Commits (`feat:`, `fix:`, `style:`, `chore:`, `refactor:`)
- **Do NOT auto-commit**: User reviews and approves all commits before they are staged.

---

## 🔗 External References

- Stitch Design Tool: `https://stitch.withgoogle.com/u/2/projects/18296838918076701249`
- Supabase Dashboard: (project-specific URL in `.env`)
- Google Fonts Inter: `https://fonts.googleapis.com/css2?family=Inter`
- Material Symbols: `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined`
