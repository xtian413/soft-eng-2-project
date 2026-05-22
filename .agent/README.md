# .agent/ — Persistent AI Project Memory
## Gemi

This folder is the **persistent AI memory system** for this project. Every major coding session, feature implementation, bug fix, and architectural decision is recorded here so that no context is ever lost between sessions or conversations.

---

## 📂 File Index

| File | Purpose | Update Trigger |
|------|---------|----------------|
| `PRD.md` | Product Requirements Document | When requirements change |
| `features.md` | Feature registry (completed / in-progress / planned) | After any feature work |
| `errors.md` | Error log with root causes and fixes | After any bug is found or fixed |
| `decisions.md` | Architectural and technical decisions | When a new approach is chosen |
| `tasks.md` | Task tracker (pending / active / completed) | Start of every session |
| `context.md` | Project-wide context, design tokens, layout rules, gotchas | When important patterns emerge |
| `changelog.md` | Chronological development log | After every commit or major change |

---

## 📋 Update Protocol

At the **start** of every AI session:
1. Read `context.md` to understand the current project state
2. Read `tasks.md` to see what's pending
3. Read `features.md` to understand what's built

At the **end** of every AI session or after a major change:
1. Append to `changelog.md` with a timestamped entry
2. Update `features.md` — move in-progress items to completed, add new planned items
3. Append any new errors to `errors.md`
4. Append any new architectural choices to `decisions.md`
5. Update `tasks.md` — check off completed tasks, add new ones
6. Update `context.md` if new patterns, gotchas, or design rules are discovered

---

## 🔗 Related Files

- `AGENT.md` — Root AI instruction manual (source of truth for coding rules)
- `artifacts/` — Stitch HTML exports and design reference files

---

*This system ensures long-term development continuity across multiple AI sessions and contributors.*
