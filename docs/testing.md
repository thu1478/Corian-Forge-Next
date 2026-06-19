# Testing

Corian Forge uses **Vitest** for unit and component tests, **Playwright** for acceptance (E2E) tests, and a **rules validator** that runs in CI.

All tests live under [`tests/`](../tests/) and **mirror the source tree**:

```
tests/
  logic/              # mirrors logic/
  lib/                # mirrors lib/ (e.g. rules-data)
  components/         # mirrors components/
  e2e/                # acceptance specs
```

Example: `logic/traits/charge-helpers.ts` → `tests/logic/traits/charge-helpers.test.ts`

## Commands

```bash
npm test               # Vitest watch mode
npm run test:run       # Vitest once (all projects)
npm run test:unit      # Node — tests/logic/**/*.test.ts
npm run test:component # jsdom — tests/components/**/*.test.tsx
npm run test:e2e       # Playwright (starts dev server)
npm run test:e2e:ui    # Playwright UI mode
npm run validate:rules # Structural check on lib/rules.json
npm run test:all       # Vitest + validate:rules + Playwright
```

Install Playwright browsers once:

```bash
npx playwright install chromium
```

## Rules validation

[`scripts/validate-rules.mjs`](../scripts/validate-rules.mjs) checks bundled `lib/rules.json` for:

- Required top-level sections (`system`, `classes`, `races`, `items`, `actionCards`, `passives`, `bestiary`)
- **Legacy alias keys** (errors): `statBonus`, `skillTraining` on classes; `traits` string arrays on creature templates

Implementation shared with unit tests:

| File | Role |
|------|------|
| [`logic/rules/validate-rules.ts`](../logic/rules/validate-rules.ts) | TypeScript validator (imported by tests) |
| [`tests/logic/rules/rules-document.test.ts`](../tests/logic/rules/rules-document.test.ts) | Asserts bundled JSON passes validation |
| [`tests/logic/rules/normalize-aliases.test.ts`](../tests/logic/rules/normalize-aliases.test.ts) | Alias normalization helpers |

CI ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) runs `npm run validate:rules` before `npm run build`.

To migrate legacy keys in the bundled file (maintenance):

```bash
node scripts/migrate-rules-aliases.mjs
npm run validate:rules
```

## When to write which test

| Type | Location | Use for |
|------|----------|---------|
| **Unit** | `tests/logic/**/*.test.ts` | Pure calculations, hydration, charge rules, alias normalization |
| **Unit (lib)** | `tests/lib/**/*.test.ts` | Rules accessors, small lib utilities |
| **Component** | `tests/components/**/*.test.tsx` | React UI behavior in isolation |
| **E2E** | `tests/e2e/*.spec.ts` | Multi-tab flows, real browser smoke tests |
| **Rules contract** | `tests/logic/rules/rules-document.test.ts` | Any change to bundled `rules.json` |

## Conventions

- Mirror source paths under `tests/` — do not colocate tests next to production code.
- Prefer explicit `import { describe, it, expect } from "vitest"`.
- E2E uses `baseURL` `http://127.0.0.1:3000/Corian-Forge-Next` (see [`playwright.config.ts`](../playwright.config.ts)).
- **`lib/` tests:** only [`tests/lib/rules-data.test.ts`](../tests/lib/rules-data.test.ts) mirrors `lib/` — all other unit tests live under `tests/logic/`.

## Required checks after substantive changes

```bash
npx tsc --noEmit
npm run test:run
npm run validate:rules
```

Especially after `rules.json` or `logic/` changes.

## Smoke checklist (manual)

After substantive changes, also verify **Sheet**, **Creator**, and **Library** tabs in the browser.
