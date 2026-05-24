# Rules JSON authoring guide

This document describes how to extend [`lib/rules.json`](../lib/rules.json) — what the app reads automatically, what stays as table-play text, and when you need TypeScript changes.

Corian Forge treats `rules.json` as the **single source of truth** for classes, feats, items, action cards, passives, glossary text, and global system config. Character **save files** store thin references (`id`, `charges`, `selectedEffectIndices`, …); the app **hydrates** those refs against rules at runtime.

There is no JSON Schema validation step today. After editing rules, run `npx tsc --noEmit` and spot-check in the character creator and character sheet.

---

## Top-level structure

| Key | Purpose |
|-----|---------|
| `system` | Global config: feats, skills, languages, XP tables, bonds, item ranks, default reactions, etc. |
| `classes` | Class definitions: passives, actions, reactions, focus feats, stat bonuses |
| `races` | Racial passives and selectable traits |
| `items` | Equipment catalog (`wp_*`, armor, consumables, …) |
| `actionCards` | Shared actions/reactions (equipment, feats, fairies, …) |
| `passives` | Standalone passives not tied to a class (mostly invention modules) |
| `bestiary` | Creature templates for summons / assistants |
| `glossary` | Rules glossary shown in the Library (`effectDictionary`, …) |

Types for shared shapes live in [`lib/rules.ts`](../lib/rules.ts). Charge logic is in [`lib/charge-helpers.ts`](../lib/charge-helpers.ts).

---

## ID conventions

- Use **camelCase** keys: `weaponBond`, `improvedManaFlow`, `equipment/jab`.
- Keys are **stable IDs**. Renaming a key breaks existing character saves that reference it.
- **Class actions** are saved by their key under `classes.<classId>.actions` (e.g. `honedStrike`), not namespaced with the class id.
- **Global action cards** use slash paths when shared across sources: `equipment/stab`, `feat/bite`, `fairy/…`.
- **Feats** live under `system.feats.<featId>`; the feat id is also the trait id on the character.

---

## Charges and reset conditions

Charges are the most common “rules + UI + save state” feature. The app tracks **pips** on traits, actions, and reactions; rest/end-of-combat buttons refill them when configured.

### Where charge fields go

Add these fields on the **rules definition** of the ability:

```json
{
  "name": "Weapon Bond",
  "minLevel": 1,
  "description": "Once per combat you can ignore one Bane on an attack with your bonded weapon.",
  "fixedMaxCharges": 1,
  "chargeReset": ["endOfCombat"]
}
```

| Field | Type | Meaning |
|-------|------|---------|
| `fixedMaxCharges` | number | Fixed maximum (e.g. `1`, `2`). Use for “once per combat/rest” abilities. |
| `chargeStat` | string | Attribute id (`dexterity`, `willpower`, …). Max = that attribute’s **modifier** (minimum 0). Used for Parry, Evasion, etc. |
| `chargeReset` | array | When charges refill automatically (see below). Omit or `[]` = **never** auto-refill from rest buttons. |

Use **either** `fixedMaxCharges` **or** `chargeStat`, not both.

Valid `chargeReset` values (defined in `lib/rules.ts`):

| Value | Triggered by |
|-------|----------------|
| `"endOfCombat"` | End of combat button (also runs at start of long rest) |
| `"shortRest"` | Short rest |
| `"longRest"` | Long rest confirm |

You can list multiple timings, e.g. `["endOfCombat", "longRest"]`.

### Supported locations (lookup order for traits)

For **traits** (passives / feats / racial), definitions are resolved in this order:

1. `passives.<id>`
2. `classes.*.passives.<id>` (any class)
3. `races.*.passives.<id>`
4. `system.feats.<id>`

Examples:

- Class passive → `classes.weaponmaster.passives.weaponBond`
- Feat with charges → `system.feats.<featId>` (same fields)
- Invention module → `passives.invention_*`

For **reactions**:

- Class `reactions[]` entries (must include top-level `"id"`)
- OR `actionCards.<id>` where `type` is `"reaction"` or `"freeReaction"`

For **actions**:

- **`actionCards.<id>` only** — charge lookup does **not** read `classes.*.actions.*.actionCard` today.

If you need charges on a class action, either:

- Move charge fields to a matching entry in `actionCards` (same id), or
- Extend `lookupChargeDefinition` in `lib/charge-helpers.ts` to fall back to class action wrappers.

### What the save file stores

Characters store **current** charge count on the ref, not the max:

```json
{ "id": "weaponBond", "source": "class", "charges": 1 }
```

- `charges` omitted or `-1` → UI treats as “full” when max > 0 (typical for new characters).
- Spending is manual via charge pips in the sheet (combat/tracking). **The app does not enforce** “once per combat you may ignore Bane” — that remains description + player/GM unless you add code.

New characters get initial charges from `initialChargesForNewEntry()` (starts at max when tracking is enabled).

### Reset flow (architecture)

```
End of combat  → applyEndOfCombatEffects()  → chargeReset includes "endOfCombat"
Short rest     → applyRestChargeEffects(..., "shortRest")
Long rest      → applyEndOfCombatEffects + applyRestChargeEffects(..., "longRest")
```

Implementation: [`lib/rest-helpers.ts`](../lib/rest-helpers.ts), wired from [`CharacterSheetView`](../components/character-sheet/CharacterSheetView.tsx).

Refill sets `charges` back to **max** for every trait/action/reaction whose definition includes that timing. Entries with `charges: -1` are left unchanged.

### Charge authoring checklist

1. Pick id and home (`classes.*.passives`, `system.feats`, `actionCards`, or class `reactions`).
2. Set `fixedMaxCharges` or `chargeStat`.
3. Set `chargeReset` to match design (“once per combat” → `["endOfCombat"]`; “twice per long rest” → `fixedMaxCharges: 2`, `chargeReset: ["longRest"]`).
4. Write the limit clearly in `description` (players enforce behavior; pips only track count).
5. Export or create a test character and verify pips appear and reset on the correct button.

### Example patterns

**Once per combat (fixed):**

```json
"fixedMaxCharges": 1,
"chargeReset": ["endOfCombat"]
```

**Uses per long rest:**

```json
"fixedMaxCharges": 2,
"chargeReset": ["longRest"]
```

**Scales with Dexterity (Parry-style):**

```json
"chargeStat": "dexterity",
"chargeReset": ["endOfCombat"]
```

**Manual-only tracking (no auto reset):**

```json
"fixedMaxCharges": 3
```

Omit `chargeReset` — GM/player adjusts pips by hand.

---

## Description-only vs automated effects

Many abilities are **description-only**: the sheet shows text and maybe charge pips, but no engine enforces the rule.

**Automated today** (via `effects` on traits/feats/passives):

| Effect type | Behavior |
|-------------|----------|
| `StatChange` | Adds to derived stats (`maxHP`, `maxMP`, `speed`, `stability`, `defense`, attributes, …). See `sumTraitStatChangeEffects` in [`lib/character-data.ts`](../lib/character-data.ts). Optional `when: "dualWielding"` for conditional bonuses. |
| `GrantSkill` | Grants skills or opens creator pickers (`pickCount`, `skillBuckets`, …). See [`lib/grant-skill-effects.ts`](../lib/grant-skill-effects.ts). |
| `GrantActionCard` | Adds an action/reaction id to the character (often with player picks via `selectAmount`). |
| `Resistance` / `Vulnerability` | Shown on combat sheet; vulnerability amounts parsed in [`lib/trait-selection.ts`](../lib/trait-selection.ts). |
| `Immunity` | Condition immunities on combat info panel. |
| `GrantSight` | Special sight lines (`low-light`, `metaphysical`, …). |
| `Language` | Language grants. |
| `SummonSchool` | Conjurer school unlock labels. |
| `AttributeChange` | Display/creator labeling (less common in stat pipeline). |

If an effect type is **not** in this list, assume **no code reads it** until you implement handlers.

**Guideline:** Prefer description + charges for narrative triggers; use `effects` only when the sheet should compute a number or show a picker.

---

## Player choice: `selectAmount` and `selectedEffectIndices`

When a trait/feat offers multiple `effects` but the player picks a subset:

```json
{
  "name": "Trusty Companion",
  "selectAmount": 2,
  "effects": [
    { "type": "GrantActionCard", "value": "feat/bite" },
    { "type": "GrantActionCard", "value": "feat/scratch" }
  ]
}
```

The save stores `selectedEffectIndices: [0, 2]` on the trait ref. Hydration uses `resolveTraitEffectsAfterSelection()` so only chosen effects apply.

---

## Feats (`system.feats`)

Minimal feat:

```json
"dualWielding": {
  "name": "Dual Wielding",
  "minLevel": 1,
  "description": "…"
}
```

Common optional fields:

| Field | Purpose |
|-------|---------|
| `minLevel` | Adventurer level gate (creator + visibility) |
| `prereqs` | Class levels, other feat/trait ids — see below |
| `effects` | Automated stat/skill/action grants |
| `selectAmount` | Pick N from `effects` |
| `fixedMaxCharges` / `chargeStat` / `chargeReset` | Charge tracking (same as passives) |
| `grantsCreatureTemplate` | Bestiary template for companion feats |
| `powerRoll` | Optional attack table on the feat card |

### Prerequisites

Documented and evaluated in [`lib/feat-prereqs.ts`](../lib/feat-prereqs.ts).

**Canonical shapes:**

```json
"prereqs": {
  "classes": { "3": ["sorcerer", "wizard"] }
}
```

```json
"prereqs": {
  "other": ["manaStrike"]
}
```

```json
"prereqs": {
  "all": [
    { "classes": { "5": ["conjurer"] } },
    { "other": ["trustyCompanion"] }
  ]
}
```

```json
"prereqs": {
  "any": [
    { "classes": { "3": ["sorcerer"] } },
    { "classes": { "5": ["wizard"] } }
  ]
}
```

- **`classes`**: Keys are **minimum class level** strings; values are class ids. Multiple ids in one bucket = **OR**.
- **`other`**: Trait/feat/passive/action ids the character must already have — **AND** across ids.
- **`all` / `any`**: Nested groups.

Avoid duplicate top-level `prereqs` keys in one feat object (JSON allows only one; last wins). Run [`scripts/migrate-feat-prereqs.mjs`](../scripts/migrate-feat-prereqs.mjs) if normalizing legacy feats.

---

## Classes

Each entry under `classes.<classId>` typically includes:

| Field | Purpose |
|-------|---------|
| `name`, `description` | Display |
| `primaryAttribute` | Creator / labeling |
| `statBonuses` | Level-based HP/MP/IP bonuses (`stat`, `amount`, `frequency` or `once`) |
| `focusFeat` | `{ name, description }` — narrative Focus rule for the class |
| `passives` | `{ passiveId: { name, minLevel, description, effects?, charges… } }` |
| `actions` | `{ actionId: { minLevel, actionCard: { … } } }` |
| `reactions` | Array of `{ id, name, trigger, description, … }` |
| `elementalAspects`, `deities`, … | Class-specific data |

**Actions** embed a full `actionCard` object. Resolution: [`hydrateActionCardById`](../lib/action-hydrate.ts) checks `actionCards[id]` first, then scans all classes for `actions[id].actionCard`.

**Reactions** on the class must include a unique string **`id`** (used in saves and charge lookup).

Class picks in the creator become save refs:

- Passive → `{ id, source: "class", charges?, selectedEffectIndices? }` in `traits`
- Action → `{ id, charges? }` in `actions`
- Reaction → `{ id, slotIndex, charges }` in `reactions`

---

## Action cards

Global entries in `actionCards` are used for equipment attacks, feat grants, fairy spells, and shared reactions.

Typical fields (`ActionCard` in `lib/rules.ts`):

```json
{
  "name": "Stab",
  "type": "action",
  "description": "…",
  "apCost": 2,
  "focusCost": 0,
  "mpCost": 0,
  "range": "Wpn",
  "tags": ["Melee", "Weapon"],
  "hiddenTags": ["heal"],
  "source": "equipment",
  "powerRoll": {
    "rollStats": ["might", "dexterity"],
    "tier1Dmg": 0,
    "tier1Wpn": true,
    "tier2Dmg": 1,
    "tier2Effect": { "type": "Condition", "effect": "shaken", … }
  },
  "fixedMaxCharges": 1,
  "chargeReset": ["longRest"]
}
```

- **`tags`**: Shown in UI (Melee, Spell, Multi(2), …).
- **`hiddenTags`**: Machine hints (`sustain`, `heal`, `barrier`, …) — not shown as chips.
- **`powerRoll`**: Drives tier rows in creator, library, and combat. Conditions use ids from `Condition` in `lib/rules.ts`.
- **`type`**: `"action"`, `"reaction"`, or `"freeReaction"`.

Items reference action ids via `actionIDs: ["equipment/stab"]`.

Large batch imports may use [`scripts/merge_action_sheet.py`](../scripts/merge_action_sheet.py) — prefer hand-editing for small changes.

---

## Items (`items`)

Catalog keys usually prefixed by type: `wp_`, armor ids, etc.

Common fields:

| Field | Purpose |
|-------|---------|
| `name`, `description`, `value`, `quantity` | Display / economy |
| `type` | `weapon`, `armor`, `shield`, `consumable`, … |
| `allowedSlots` | Equipment slots |
| `tags` | `melee`, `implement`, `light`, `throwing`, … — used by combat helpers |
| `damage`, `damageType`, `range`, `attributes` | Weapons |
| `actionIDs` | Linked `actionCards` |
| `statBonuses` | Gear stat modifiers (object keyed by stat name) |
| `rank` | Optional default item rank key → `system.itemRanks` |
| `traits` | Inline passive definitions keyed by trait id (rare) |

Per-instance overrides (custom name, rank, invention modules) live on **inventory entries** in the save, not in rules.

Item ranks: define palette in `system.itemRanks` (`label`, `nameClass` Tailwind classes). Display: [`lib/item-rank-display.ts`](../lib/item-rank-display.ts).

---

## Racial passives (`races`)

```json
"passives": {
  "keenSenses": {
    "name": "Keen Senses",
    "type": "innate",
    "description": "…"
  },
  "optionalTrait": {
    "type": "selectable",
    "ptCost": 1,
    "minLevel": 1,
    "description": "…"
  }
}
```

- `type: "innate"` → auto-granted in creator/export.
- `type: "selectable"` → racial point buy in creator.

---

## Standalone passives (`passives`)

Used mainly for **invention modules** and other equipment-granted abilities referenced by id from artificer gear. Same shape as class passives. Linked from items via invention config, not usually picked in creator.

---

## Glossary (`glossary`)

Nested dictionaries for the Library **Glossary** tab:

```json
"glossary": {
  "effectDictionary": {
    "powerRoll": {
      "bane": { "name": "Bane", "description": "…" }
    },
    "negativeStatusEffects": { … }
  }
}
```

Built for browse/search in [`lib/glossary-lookup.ts`](../lib/glossary-lookup.ts). Adding entries here is **documentation-only** — no combat automation.

---

## Hydration pipeline (mental model)

```
rules.json
    │
    ├─► Character save refs (traits / actions / reactions)
    │       └─► hydrateTraitRefs / hydrateActionCardById / buildReactionLibrary
    │
    ├─► Derived stats (StatChange, gear, class bonuses)
    │
    └─► UI (creator, library, combat cards, charge pips, glossary)
```

Trait resolution order for display and stats: `passives` → class passives → race passives → feats → item-inline → `inlineDefinition` on ref.

---

## When JSONId change rules only vs add code

| Goal | Rules JSON only? |
|------|------------------|
| New feat/passive text | Yes |
| Charge pips + rest reset | Yes (if on supported location) |
| +maxHP / +maxMP / speed / skills | Yes (`effects`) |
| New power roll on action | Yes (`powerRoll`) |
| Enforce “ignore one Bane” in roller | **No** — needs combat code |
| New `effect.type` | **No** — extend types + handlers |
| Charges on class `actions` wrapper | **No** (today) — extend charge lookup or duplicate in `actionCards` |
| New charge reset timing (e.g. `startOfTurn`) | **No** — extend `ChargeResetTiming` + call sites |
| Conditional stat from new game state | **No** — extend `StatChangeContext` |

---

## Editing workflow

1. Edit `lib/rules.json` (keep valid JSON — trailing commas are invalid).
2. `npx tsc --noEmit`
3. Verify in UI:
   - **Creator**: feat visible, prereqs, skill picks, class picks
   - **Sheet**: trait text, derived stats, charge pips
   - **Combat**: action cards, power roll tiers
   - **Library**: class/feat/item/glossary entries
4. For feats with prereqs, consider running `node scripts/migrate-feat-prereqs.mjs` to canonicalize.

---

## Related source files

| Topic | File |
|-------|------|
| Core types | `lib/rules.ts` |
| Charges | `lib/charge-helpers.ts`, `lib/rest-helpers.ts` |
| Trait hydration | `components/character-sheet/hooks/statCalculator.tsx` (`hydrateTraitRefs`) |
| Action hydration | `lib/action-hydrate.ts` |
| Feat prereqs | `lib/feat-prereqs.ts` |
| Stat effects | `lib/character-data.ts` |
| Effect labels | `lib/trait-selection.ts` |
| Skill grants | `lib/grant-skill-effects.ts` |
| Save refs | `lib/baseRefs.ts` |
| Glossary UI | `lib/glossary-lookup.ts` |

---

## Quick reference: add a charged class passive

1. Open `classes.<classId>.passives`.
2. Add a camelCase key with `name`, `minLevel`, `description`.
3. Add `fixedMaxCharges` (or `chargeStat`) and `chargeReset`.
4. Ensure class progression grants the passive id in creator (existing class level tables).
5. Confirm end-of-combat / rest buttons refill pips on a character with that passive.

That’s the full loop for the most common “uses per rest/combat” pattern without new application code.
