# decisions.md — Architectural & Technical Decisions
## Gemi
**Last Updated**: 2026-05-22T22:25:44+08:00

---

## Decision Log

---

### [DEC-001] On-Device AI Only — No Cloud AI APIs
- **Date**: 2026-05-22 (Project Inception)
- **Status**: Active — Non-negotiable
- **Decision**: All AI inference runs on the user's device using Gemma 4 e2b via MediaPipe LLM Inference API. Zero network calls for AI generation.
- **Rationale**:
  1. **Privacy**: User fitness data (weight, diet, workout history) is sensitive. Sending it to cloud APIs is a privacy risk.
  2. **Cost**: Cloud AI APIs incur per-token costs that scale poorly for a student project.
  3. **Offline capability**: Users can get insights without internet connectivity.
  4. **Course requirement**: Explicit project constraint.
- **Implications**: AI model weights (~1-2GB) must be bundled in the app assets. Cold-load time may be noticeable on first launch.
- **Alternatives Rejected**: OpenAI GPT-4o, Google Gemini API, Anthropic Claude API, HuggingFace Inference API.

---

### [DEC-002] Supabase for Auth + Database (No Custom JWT)
- **Date**: 2026-05-22 (Project Inception)
- **Status**: Active
- **Decision**: Use Supabase Auth for all authentication. Do NOT implement custom JWT issuance logic.
- **Rationale**: Supabase Auth handles refresh token rotation, email verification, password reset flows out of the box. Custom JWT is unnecessary complexity and a security risk if implemented incorrectly.
- **RLS Requirement**: Every table must have Row Level Security enabled with `auth.uid() = user_id` policies.
- **Frontend**: Uses anon key only. Never expose service role key to client code.
- **Backend**: Express API uses service role key (server-side only) for admin operations.

---

### [DEC-003] Zustand for State Management (No Redux)
- **Date**: 2026-05-22 (Project Inception)
- **Status**: Active
- **Decision**: Use Zustand for global client state (auth session, workout store, diet store).
- **Rationale**: Redux is significantly heavier and requires more boilerplate for a project of this scale. Zustand is minimal, TypeScript-friendly, and integrates cleanly with React hooks.
- **Alternatives Rejected**: Redux Toolkit, MobX, Context API (too verbose for cross-component state).

---

### [DEC-004] Web App as Companion to Mobile (Separate Vite Project)
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Build a separate Vite + React web app (`/web/`) that shares the same Supabase backend and design system, rather than trying to use React Native Web inside the Expo project.
- **Rationale**: React Native Web adds significant complexity to Expo's build pipeline and has frequent compatibility issues with third-party libraries (charts, forms, gestures). A standalone Vite project gives full access to the web ecosystem without constraints.
- **Design System**: The web app uses Vanilla CSS with design tokens sourced from the Stitch design tool (Google Material Design 3 color system).
- **Implications**: Two separate frontend codebases. Shared types must be manually kept in sync (future: extract to shared `packages/` workspace).

---

### [DEC-005] Web Folder Relocated to Project Root (`/web/`)
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Moved the web frontend from `frontend/web/` to `/web/` at the project root.
- **Rationale**: The `frontend/` directory is the Expo mobile app. Co-locating the Vite web project inside it caused the Expo bundler and TypeScript to attempt resolving web-only imports in the mobile build context, causing type errors and build failures.
- **Fix Applied**: Added `"exclude": ["src/**/*.native.tsx", "src/**/*.native.ts"]` to `web/tsconfig.app.json` after relocation to prevent web tsconfig from picking up mobile-specific files.
- **Commit**: `4142be1`

---

### [DEC-006] Vanilla CSS with Stitch Design Tokens (No Tailwind)
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Style the web app with Vanilla CSS using CSS custom properties matching the Stitch/Material Design 3 token system. Do NOT use Tailwind CSS.
- **Rationale**:
  1. The Stitch tool outputs Tailwind-based HTML prototypes, but converting to clean, maintainable Vanilla CSS gives full control over specificity and animations.
  2. Tailwind's purge/JIT behavior can cause unexpected disappearing styles in dynamic class generation.
  3. Vanilla CSS is easier for collaborators unfamiliar with Tailwind to read and modify.
- **Token Namespace**: All CSS custom properties use the `--` prefix with M3 naming (`--primary`, `--surface-container-lowest`, `--on-surface`, etc.).
- **Class Namespace**: All component classes prefixed with `lumina-` to avoid collisions.

---

### [DEC-007] React Router DOM v6 for Web Navigation
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Use `react-router-dom` v6 with `<BrowserRouter>` for web page transitions.
- **Routes Defined**:
  | Path | Component | Notes |
  |------|-----------|-------|
  | `/login` | `Login` | Default entry point |
  | `/register` | `Register` | New user onboarding |
  | `/success` | `OnboardingSuccess` | Post-registration confirmation |
  | `/dashboard` | `Dashboard` | Main app hub (auth-protected, future) |
  | `*` | Redirect → `/login` | Catch-all |
- **Profile Data Passing**: Via `navigate('/dashboard', { state: profileData })` — no global store yet.
- **Install Note**: Required `--legacy-peer-deps` due to React 19 peer constraint (see ERR-005).

---

### [DEC-008] Simulated Gemma Coach for Web (Placeholder)
- **Date**: 2026-05-22
- **Status**: Temporary — replace in Sprint 4
- **Decision**: Implement a simulated offline Gemma response system in the web dashboard Coach tab, rather than leaving it unimplemented.
- **Rationale**: Provides a fully interactive and demonstrable product while WASM model bundling is being set up. The simulation uses keyword matching on user input to provide contextually relevant fitness responses with a realistic 1.2s inference delay.
- **Replacement Plan**: In Sprint 4, replace with actual `@mediapipe/tasks-genai` WASM inference using the Gemma 4 e2b `.task` file.

---

### [DEC-009] Mathematically Balanced State Offsets for Initial Load
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: To represent an initial state of `1,450 kcal` eaten, `850 kcal` remaining under a calorie target of `2,300 kcal` exactly mirroring the Stitch mockup, we initialized the macros to exactly `80g Protein`, `120g Carbs`, and `45g Fats` and added a `baseSnackCalories` offset of `245 kcal` representing unspecified snacks already consumed.
- **Rationale**:
  1. Simply hardcoding the metrics makes them non-interactive and fake when the user logs new food.
  2. Simply summing the default macros yields $(80 \times 4) + (120 \times 4) + (45 \times 9) = 1,205\text{ kcal}$, which would show a visual calorie gap ($1,450 - 1,205 = 245\text{ kcal}$).
  3. The `baseSnackCalories` offset balances the initial thermal calculation precisely, so any subsequent quick logs or dinner logs are mathematically correct and sync across BOTH the Bento progress ring and the Food Tracking sub-tab automatically.

---

### [DEC-010] Client-Side Natural Language Food Parsing Heuristics
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Implement a regex-based offline parser that extracts explicit calorie indicators (e.g. `"banana shake 250 kcal"` or `"400 cal"`) from the Quick Log input and uses a pre-defined map of premium healthy macro heuristics for common inputs (eggs, toast, chicken, steak, rice, burger, etc.).
- **Rationale**: Connects the text input to active macro state adjustments immediately. This provides a highly compelling demonstration of "AI Quick Logging" responsiveness even when backend Supabase services are offline or pending connection.

---

### [DEC-011] Local USDA Foundation Foods Database & Portion Ingestion
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Embed the USDA Foundation Foods database (~10k rows) locally in the client `/web/src/data/` directory and implement a dynamic mapping adapter to parse portions, names, and micro targets offline.
- **Rationale**:
  1. **Zero latency**: Provides immediate off-line query filtering under 10ms.
  2. **Decoupled Adapter**: Translates external schemas into a standard `GemiFoodItem` domain contract, allowing any CSV collection of foods or exercises to be swapped in later by just editing `mapFdcToGemiFoodItem`.
  3. **Zero Package Bloat**: Dynamic ESM `import()` splits the JSON bundle so it is only loaded into the user's browser memory if/when they visit the Diet Tracker tab.

---

### [DEC-012] ESM Import Interface Deobfuscation via Explicit Type Separation
- **Date**: 2026-05-22
- **Status**: Active
- **Decision**: Explicitly import TypeScript interfaces using `import type { ... }` separately from runtime function imports.
- **Rationale**: Vite's hot module rebuilder and ESM spec loaders in browsers error out if a pure type-only interface is imported within a standard runtime import object. Specifying `import type` removes the declaration from the compiled ESM exports, avoiding browser syntax errors.

---

*Append new decisions using the `[DEC-NNN]` format with full context.*
