# Contributor guide

How to extend Corian Forge: add classes, actions, creatures, and trait effects without fighting the codebase.

**Prerequisites:** Read [architecture-overview.md](./architecture-overview.md) and [data-model.md](./data-model.md). For `rules.json` field details, use [rules-json-authoring.md](./rules-json-authoring.md). For file placement, use [folder-structure.md](./folder-structure.md).

---

## Mental model

1. **Content** lives in `lib/rules.json` (canonical keys — see [data-model.md](./data-model.md#schema-aliases)).
2. **Read rules** via `@/lib/rules-data`, never `@/lib/rules.json`.
3. **`lib/` is eight files** — types and save schema only; see [data-model.md](./data-model.md#lib-inventory-data-and-types-only).
4. **Shared behavior** lives in `logic/<domain>/` — one implementation for creator, sheet, and library.
5. **Sheet-only React wiring** lives in `hooks/character/` (`useDataLoader` orchestrates hydration).
6. **Save JSON** stores refs only; stats and resistances are computed in `logic/character/derived-stats.ts` using helpers from `logic/character/stats.ts`.

---

## Where to put code

| Change | Primary location |
|--------|------------------|
| New trait effect type | `lib/rules.ts` (types), `logic/traits/selection.ts`, `logic/character/derived-stats.ts` |
| New class passive / action | `lib/rules.json` under `classes.<id>` |
| Rules structural validation | `logic/rules/validate-rules.ts` + `scripts/validate-rules.mjs` |
| Creator step or validation | `components/character-creator/steps/`, `components/character-creator/logic/` |
| Sheet panel / combat UI | `components/character-sheet/` |
| Library display / formatting | `logic/display/` (+ thin UI in `components/library/`) |
| Shared calculation | **`logic/<domain>/`** — never duplicate in a component |
| Unit test | `tests/logic/...` mirroring source path |

**Do not** import `hooks/character/` from the creator. **Do not** add game logic under `lib/` (except types and `rules-data.ts`).

---

## Adding a class feature

Typical flow for a new passive or class ability:

1. **Define in `rules.json`** under `classes.<classId>.passives` or `.actions` / `.reactions`.
2. **Effects** — add `TraitEffect` rows (`StatChange`, `GrantActionCard`, `GrantSkill`, charges, etc.). See [rules-json-authoring.md](./rules-json-authoring.md).
3. **Stat bonuses** — use `statBonuses[]` array entries (not legacy `statBonus` object).
4. **Charges** — if limited use, set `fixedMaxCharges` or `chargeStat` + `chargeReset`. Logic: [`logic/traits/charge-helpers.ts`](../logic/traits/charge-helpers.ts).
5. **Creator** — if the feature needs player choices:
   - Automatic grants: usually no new step
   - Selectable effects: `selectAmount` + `selectedEffectIndices` on `TraitRef`
   - Skill picks: `GrantSkill` + `creatorSkillGrantPicks` / skill grant UI
   - Class-specific UI: extend [`ClassSelection.tsx`](../components/character-creator/steps/ClassSelection.tsx) or `steps/class-archetypes/`
6. **Sheet** — trait appears via `discoverAllTraitRefs` → `hydrateTraitRefs` → `computeDerivedStats`.
7. **Library** — class grants display via [`logic/display/rules-library-helpers.tsx`](../logic/display/rules-library-helpers.tsx).

### Checklist

- [ ] Stable camelCase id
- [ ] Canonical JSON keys (`statBonuses`, `traitRefs` on creatures)
- [ ] `npm run validate:rules`
- [ ] `npx tsc --noEmit` and `npm run test:run`
- [ ] Creator: feature appears and exports valid JSON
- [ ] Sheet: trait/actions show; charges reset correctly
- [ ] Library: class entry readable

---

## Adding an action card

Two patterns:

| Pattern | Location | Resolution |
|---------|----------|------------|
| **Global card** | `rules.actionCards.<id>` | Shared across equipment, feats, fairies |
| **Class action** | `rules.classes.<id>.actions.<key>` with nested `actionCard` | Class-specific |

Hydration: [`logic/actions/hydrate.ts`](../logic/actions/hydrate.ts) — `hydrateActionCardById(id, rules)`.

To **grant** an action from a trait, add a `GrantActionCard` effect on the passive. Discovery merges granted ids in `useDataLoader` / `useActions`.

Saved on character as:

```json
{ "id": "equipment/stab", "charges": 0 }
```

Charge state merges with rules via `mergeActionChargeState` in `logic/traits/charge-helpers.ts`.

### Enhance an existing action

Use **`EnhanceAction`** on a trait when gear or a passive **modifies** an action the character already has (extra rules text, cheaper focus, higher tier damage). Implementation: [`logic/actions/action-enhancements.ts`](../logic/actions/action-enhancements.ts) — applied in `useDataLoader` after action hydration.

| Approach | When |
|----------|------|
| `GrantActionCard` | Add a **new** action/reaction id to the sheet |
| `EnhanceAction` | Change display of an **existing** action id (stacking append + deltas) |
| Hardcoded combat bonus | One-off sheet logic (e.g. Shield Master flat damage) in `logic/combat/power-roll-combat-bonuses.ts` — not data-driven |

See [rules-json-authoring.md](./rules-json-authoring.md) for `EnhanceAction` JSON fields.

---

## Adding a creature or Anima template

1. **Template** in `rules.bestiary.creatures.<templateId>`:
   - Stats, size, natural weapons
   - **`traitRefs`**: array of passive ids (required — legacy `traits` is rejected by validation)
2. **Creature-only passives** in `rules.bestiary.traits.<id>` if not shared elsewhere.
3. **Roster reconciliation** — [`logic/creatures/roster.ts`](../logic/creatures/roster.ts) maps creator slots / anima picks to `creatures[]` entries.
4. **Natural weapons** — [`logic/equipment/natural-weapons.ts`](../logic/equipment/natural-weapons.ts), [`logic/equipment/anima-weapon-slots.ts`](../logic/equipment/anima-weapon-slots.ts).
5. **Mounts** — [`logic/creatures/rider-mounts.ts`](../logic/creatures/rider-mounts.ts), [`logic/creatures/mounted-creature.ts`](../logic/creatures/mounted-creature.ts).

---

## Adding a trait effect type

1. Extend `TraitEffect` union in [`lib/rules.ts`](../lib/rules.ts).
2. Handle in [`logic/traits/selection.ts`](../logic/traits/selection.ts) (labeling, resistance damage type, conditional `when`, …).
3. Apply in [`logic/character/derived-stats.ts`](../logic/character/derived-stats.ts) for numeric/derived stats.
4. Combat tooltips / more info: [`logic/combat/more-info.ts`](../logic/combat/more-info.ts).
5. Document the new effect in [rules-json-authoring.md](./rules-json-authoring.md).
6. Glossary entry in `rules.glossary.effectDictionary` if players need in-app help.
7. Add unit tests under `tests/logic/traits/` or `tests/logic/character/` as appropriate.

---

## Adding a feat

1. Entry under `rules.system.feats.<featId>`.
2. Prerequisites: [`logic/feats/prereqs.ts`](../logic/feats/prereqs.ts) — extend if new prereq type.
3. Creator: [`FeatsStep.tsx`](../components/character-creator/steps/FeatsStep.tsx).
4. On character, feat is stored as `{ id: "<featId>", source: "feat" }` in `traits[]`.

---

## Adding equipment or items

1. Entry in `rules.items.<itemId>`.
2. Types and slots: [`lib/equipment-data.ts`](../lib/equipment-data.ts).
3. Proficiency checks: [`logic/equipment/proficiency.ts`](../logic/equipment/proficiency.ts).
4. Stat display strings: [`logic/equipment/stats-display.ts`](../logic/equipment/stats-display.ts).
5. Nested item traits: discovered in `discoverAllTraitRefs` when item is equipped; resolved via `resolvePassiveById` with item context.
6. Sheet equip drag: slot updates via [`logic/equipment/equipment-slot-state.ts`](../logic/equipment/equipment-slot-state.ts) (`EQUIPMENT_RULES`).

---

## Creator export and import

- Export produces `CharacterSaveData` JSON from [`CharacterCreator.tsx`](../components/character-creator/CharacterCreator.tsx).
- Import path: [`components/character-creator/logic/import.ts`](../components/character-creator/logic/import.ts) — normalizes creator-only fields.
- **Export does not auto-load the sheet** — user must import JSON on the sheet separately.
- Re-import safety: `attributeLevelBonuses` prevents double-applying level-up attribute picks.
- Creator review stats use `computeDerivedStats` from `logic/character/derived-stats.ts` (not sheet hooks).

---

## Editing `rules.json`

After any rules change:

```bash
npm run validate:rules   # structural + no legacy alias keys
npm run test:run         # includes rules-document.test.ts
npx tsc --noEmit
```

If you intentionally migrate legacy keys in the bundled file:

```bash
node scripts/migrate-rules-aliases.mjs
npm run validate:rules
```

CI runs `validate:rules` before build (see [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)).

---

## Verification

Always run before opening a PR:

```bash
npx tsc --noEmit
npm run test:run
npm run validate:rules
```

See [testing.md](./testing.md) for E2E and component tests.

Manual smoke test:

1. **Library** — new content appears and reads correctly
2. **Creator** — build a character that uses the feature; export JSON
3. **Sheet** — import JSON (or exercise feature on default character); combat + tracking tabs

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Renamed rule id | Breaks saves — avoid or provide migration |
| Used `statBonus` or creature `traits[]` in JSON | Use `statBonuses[]` and `traitRefs[]`; validation will fail |
| Imported `@/lib/rules.json` directly | Use `@/lib/rules-data` |
| Old `@/lib/charge-helpers` (or similar) import | Phase 5 removed shims — use matching `@/logic/...` path |
| Duplicated passive lookup | Use `resolvePassiveById` only |
| Derived stat saved to JSON | Recompute in `computeDerivedStats` only |
| Creator imports sheet hook | Move shared fn to `logic/` |
| New logic file under `lib/` | Put in `logic/<domain>/` only |
| Stat helpers from `@/lib/character-data` | Import `@/logic/character/stats` |

---

## Module quick reference

| Concern | Module |
|---------|--------|
| Rules accessors | `lib/rules-data.ts` |
| Passive lookup | `logic/traits/passive-lookup.ts` |
| Trait discovery / hydration | `logic/traits/trait-hydration.ts` |
| Derived stats | `logic/character/derived-stats.ts` |
| Class stat bonuses | `logic/character/stats.ts` |
| Equip slot state | `logic/equipment/equipment-slot-state.ts` |
| Action hydrate | `logic/actions/hydrate.ts` |
| Creature roster | `logic/creatures/roster.ts` |
| Sheet orchestration | `hooks/character/use-data-loader.tsx` |
| Rules validation | `logic/rules/validate-rules.ts` |
