# context.md — Project-Wide Context & Notes
## Gemi
**Last Updated**: 2026-05-22T23:15:00+08:00

---

## 🗺️ Project Overview Snapshot

| Field | Value |
|-------|-------|
| App Name | Gemi |
| Course | CCS 308-CS33S1 |
| Author | Christian Gamos (`chris.gamos.13@gmail.com`) |
| Repo | `soft-eng-2-project` |
| Active Branch | `Frontend-integration` |
| Base Branch | `master` |
| Web App URL (dev) | `http://localhost:5173/` |

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
│       ├── ai/           ← gemmaService.ts (on-device inference ONLY)
│       ├── api/, components/, hooks/, lib/, navigation/, screens/, store/, types/
├── supabase/             ← Supabase migrations + config
│   └── migrations/       ← 001–006 SQL files + timestamped duplicates
└── web/                  ← Vite + React 19 web companion app
    └── src/
        ├── pages/
        │   ├── Auth/     ← Login.tsx, Register.tsx, Auth.css
        │   └── Dashboard/ ← Dashboard.tsx, Dashboard.css
        ├── App.tsx       ← Route definitions
        └── main.tsx      ← BrowserRouter entry point
```

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

### React Router Navigation Flow
```
/login → (register link) → /register → (submit) → /success → (launch) → /dashboard
/dashboard → (sign out) → /login
* → /login (catch-all redirect)
```
Profile data passed: `navigate('/dashboard', { state: { fullName, email, gender, height, weight, goal } })`

### Goal → Targets Mapping
| Goal | Calories | Protein | Carbs | Fats |
|------|----------|---------|-------|------|
| `build_muscle` | 2800 kcal | 180g | 300g | 75g |
| `lose_weight` | 2000 kcal | 160g | 200g | 60g |
| `maintain` | 2400 kcal | 140g | 250g | 70g |

### Food Logging & State Synchronization Context
* **Initial Balanced Load**: The Stitch prototype default of `1,450 kcal` eaten, `850 kcal` remaining under a calorie target of `2,300 kcal` is represented by setting `80g Protein`, `120g Carbs`, `45g Fats`, and a `baseSnackCalories` offset of `245 kcal`.
* **Dynamic Calculations**:
  * $\text{Calories Eaten} = (\text{Protein} \times 4) + (\text{Carbs} \times 4) + (\text{Fats} \times 9) + \text{baseSnackCalories}$
  * $\text{Calories Remaining} = \text{Target Calories} - \text{Calories Eaten}$
* **Interactive Toggles**:
  * **Water Logger**: Fully customizable daily target (e.g. 4L goal support). Dynamically draws the number of glasses based on 250mL servings (capped at 12 maximum). WCAG-compliant touch targets (44px) wrap beautifully on narrow viewport screens. Shows a progress bar and remaining amount.
  * **Sleep Logger**: Bedtime and Wake-up time HTML pickers. Features exact sleep schedule labels: "Slept at (last night)" and "Woke up (this morning)" with support for cross-midnight math, progress indicator, and warnings for sleep < 6h.
  - **Meal Checklist**: Breakfast, Lunch, Dinner, and Snacks. Breakfast starts preloaded with 540 kcal egg & toast. dinner has togglable Grilled Salmon. Snacks can be added directly via search or barcode scans.
  - **AI Quick Log**: Parses text for calories (e.g. `"200 kcal"`) or keyword mappings (e.g. eggs, toast, steak) and dynamically increments user macros with a matching toast alert.
  - **USDA Foundation Foods & Scale Configurator**: Ingested dynamically from a local FDC database JSON file. Dynamic module resolution requires parsing `.default` since dynamic imports in ES Modules return namespace containers. Searching is available globally from any view, as triggers monitor modal state (`isOptionsModalOpen`).
  - **Barcode Scan Simulator**: Animates a mock scan viewfinder laser overlay; typing or scanning mocks the retrieval of commercial staples (Hummus).

---

## ⚠️ Known Constraints & Gotchas

1. **`react-router-dom` install**: Must use `--legacy-peer-deps` due to React 19 peer constraint.
2. **`.native.tsx` files**: `web/tsconfig.app.json` must exclude `src/**/*.native.tsx` and `src/**/*.native.ts` or type conflicts occur.
3. **TypeScript ESM pure type imports**: Browsers throwing runtime `SyntaxError` when importing TypeScript interfaces inside standard runtime declarations. Pure interfaces must be imported explicitly with `import type` (ERR-008).
4. **AI is simulated in web**: The coach chat in `Dashboard.tsx` uses keyword matching with a 1.2s fake delay. Real WASM inference is Sprint 4.
5. **No auth guard yet**: `/dashboard` is accessible without login. `ProtectedRoute` component is pending (TASK-006).
6. **Profile data is transient**: User profile from registration lives in React Router location state. No persistence until Supabase auth is wired (TASK-001).
7. **Stitch images**: The profile avatar image in Dashboard uses a Google AIDA public URL. Should be replaced with actual user avatar from Supabase Storage in production.
8. **Supabase migration duplicates**: There are both named (`001_profiles.sql`) and timestamped (`20260522055821_001_profiles.sql`) migration files. The timestamped ones are the ones Supabase CLI actually uses.

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
