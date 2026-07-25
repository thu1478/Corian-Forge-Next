# Rules JSON authoring guide

This document describes how to extend [`lib/rules.json`](../lib/rules.json) — what the app reads automatically, what stays as table-play text, and when you need TypeScript changes.

Corian Forge treats `rules.json` as the **single source of truth** for classes, feats, items, action cards, passives, glossary text, and global system config. Character **save files** store thin references (`id`, `charges`, `selectedEffectIndices`, …); the app **hydrates** those refs against rules at runtime (see [architecture-overview.md](./architecture-overview.md#hydration-pipeline) and [data-model.md](./data-model.md)).

**Read rules in app code** via [`lib/rules-data.ts`](../lib/rules-data.ts) (`rulesData`, `getClassRule`, …) — not by importing the JSON file directly.

**Validation:** run `npm run validate:rules` after edits. This checks required top-level sections and rejects legacy alias keys (`statBonus`, `skillTraining`, creature `traits[]`). Also run `npm run test:run` and `npx tsc --noEmit`.

**Canonical keys:** class stat rows use `statBonuses[]` (not `statBonus`); creature templates use `traitRefs[]` (not `traits`). See [data-model.md — schema aliases](./data-model.md#schema-aliases).

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
| `bestiary` | Creature templates (`creatures`) and creature-only traits (`traits`) — summons, assistants, mounts, Anima forms |
| `glossary` | Rules glossary shown in the Library (`effectDictionary`, …) |

Types for shared shapes live in [`lib/rules.ts`](../lib/rules.ts). Charge logic is in [`logic/traits/charge-helpers.ts`](../logic/traits/charge-helpers.ts).

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
- Extend `lookupChargeDefinition` in `logic/traits/charge-helpers.ts` to fall back to class action wrappers.

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

Implementation: [`logic/traits/rest-helpers.ts`](../logic/traits/rest-helpers.ts), wired from [`CharacterSheetView`](../components/character-sheet/CharacterSheetView.tsx).

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
| `StatChange` | Adds to derived stats (`maxHP`, `maxMP`, `speed`, `stability`, `defense`, attributes, …). See `sumTraitStatChangeEffects` in [`logic/character/derived-stats.ts`](../logic/character/derived-stats.ts). Optional `when: "dualWielding"` for conditional bonuses. |
| `GrantSkill` | Grants skills or opens creator pickers (`pickCount`, `skillBuckets`, …). See [`logic/traits/grant-skill-effects.ts`](../logic/traits/grant-skill-effects.ts). |
| `GrantActionCard` | Adds an action/reaction id to the character (often with player picks via `selectAmount`). |
| `EnhanceAction` | Modifies an existing action card at hydrate time (append description, cost/tier deltas). See [`logic/actions/action-enhancements.ts`](../logic/actions/action-enhancements.ts). |
| `Resistance` / `Vulnerability` | Shown on combat sheet; vulnerability amounts parsed in [`logic/traits/selection.ts`](../logic/traits/selection.ts). |
| `Immunity` | Condition immunities on combat info panel. |
| `GrantSight` | Special sight lines (`low-light`, `metaphysical`, …). |
| `GrantMovement` | Special movement lines. `value: "speed"` resolves to character walk speed for character traits; mount-sourced movement resolves against mount Speed while mounted. |
| `Language` | Language grants. |
| `SummonSchool` | Conjurer school unlock labels. |
| `AttributeChange` | Display/creator labeling (less common in stat pipeline). |

If an effect type is **not** in this list, assume **no code reads it** until you implement handlers.

**Guideline:** Prefer description + charges for narrative triggers; use `effects` only when the sheet should compute a number or show a picker.

### Trait effect shapes

Use these inside `effects: []` on class passives, racial passives, feats, and other hydrated traits.

**StatChange**

```json
{ "type": "StatChange", "stat": "speed", "value": "1" }
```

- `stat`: derived stat or attribute key read by `sumTraitStatChangeEffects`.
- `value`: numeric string.
- `when`: optional condition. Currently `dualWielding` is supported for stat calculation.

**GrantSkill**

```json
{ "type": "GrantSkill", "skillId": "athletics" }
```

```json
{
  "type": "GrantSkill",
  "pickCount": 2,
  "skillBuckets": ["Knowledge"],
  "distinctPicks": true
}
```

- Direct grants use `skillId`.
- Picker grants use `pickCount`, optional `skillBuckets`, `unlockSkillIds`, `unlockCategories`, and `distinctPicks`.

**GrantActionCard**

```json
{ "type": "GrantActionCard", "value": "feat/bite" }
```

The `value` must resolve through `actionCards` or a class action id. Often paired with `selectAmount` so the player chooses from several granted cards.

**EnhanceAction**

Modifies an **existing** action on the combat sheet (does not add a new card). Use when equipment or a passive improves a class action or shared card the character already has — contrast with `GrantActionCard`, which adds a new action id.

```json
{
  "type": "EnhanceAction",
  "actionId": "smite",
  "appendDescription": "Undead damage bonus increases to 10; other targets to 7.",
  "focusCostDelta": -1,
  "tier2DmgDelta": 2
}
```

| Field | Purpose |
|-------|---------|
| `actionId` | Target action key — class action id (e.g. `"smite"`) or global `actionCards` id. Matches `ActionCard.id` after hydration (equipment instance suffixes like `::uid` are ignored). |
| `appendDescription` | Optional rules text appended below the base card description, with the trait name as source label. |
| `apCostDelta` / `focusCostDelta` / `mpCostDelta` / `ipCostDelta` | Additive cost deltas summed across all active enhancements; displayed costs floor at 0. |
| `tier1DmgDelta` / `tier2DmgDelta` / `tier3DmgDelta` | Additive damage deltas applied to numeric tier values before combat trait bonuses. |

**Stacking:** All active `EnhanceAction` effects targeting the same `actionId` apply together — description notes append in discovery order; numeric deltas sum. Enhancements are a **runtime overlay** on `ActionCard.enhancements` (not persisted on save). Rules Library previews show base cards only.

**Resistance / Vulnerability**

```json
{ "type": "Resistance", "value": "fire" }
```

```json
{ "type": "Vulnerability", "stat": "water", "value": "3" }
```

Resistance rows commonly use `value`; vulnerability rows commonly use `stat` plus optional amount in `value`.

**Immunity**

```json
{ "type": "Immunity", "stat": "agony" }
```

Shown under combat “Condition immunities”.

**GrantSight**

```json
{ "type": "GrantSight", "stat": "mana" }
```

Known labels include `metaphysical`, `low-light`, and `mana`; unknown ids are title-cased.

**GrantMovement**

```json
{ "type": "GrantMovement", "stat": "swimming", "value": "speed" }
```

- `stat`: movement mode (`swimming`, `climbing`, `flying`, …).
- `value`: fixed numeric string or `"speed"`.
- Character traits resolve `"speed"` against character walk speed. Mount trait movement resolves against active mount Speed and only applies while mounted.

**Language**

```json
{ "type": "Language", "value": "Elvish" }
```

Added to exported/displayed languages.

**SummonSchool**

```json
{ "type": "SummonSchool", "value": "geomancy" }
```

Used by Conjurer summon selection to choose the catalog tag.

**AttributeChange**

```json
{ "type": "AttributeChange", "stat": "might", "value": "1" }
```

Mostly legacy/display-oriented. For derived stat math, prefer `StatChange` unless you are extending handlers.

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

Documented and evaluated in [`logic/feats/prereqs.ts`](../logic/feats/prereqs.ts).

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

**Actions** embed a full `actionCard` object. Resolution: [`hydrateActionCardById`](../logic/actions/hydrate.ts) checks `actionCards[id]` first, then scans all classes for `actions[id].actionCard`.

**Reactions** on the class must include a unique string **`id`** (used in saves and charge lookup).

Class picks in the creator become save refs:

- Passive → `{ id, source: "class", charges?, selectedEffectIndices? }` in `traits`
- Action → `{ id, charges? }` in `actions`
- Reaction → `{ id, slotIndex, charges }` in `reactions`

---

## Action cards

Global entries in `actionCards` are used for equipment attacks, feat grants, fairy spells, and shared reactions.

Class actions embed the same card shape under `classes.<classId>.actions.<actionId>.actionCard`. Hydration checks `actionCards[id]` first, then scans class actions.

### Core action card fields

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

| Field | Purpose |
|-------|---------|
| `name`, `description` | Display text. Descriptions are also where non-automated rules should be written clearly. |
| `type` | `"action"`, `"reaction"`, or `"freeReaction"`. Global reaction cards are injected into the reaction picker/catalog. |
| `apCost`, `focusCost`, `mpCost`, `ipCost` | Resource cost badges. These are displayed; spending is handled by the action UI where supported. |
| `itemChargeCost` | When set, using this action spends that many **charges from the granting equipment item** (requires item `fixedMaxCharges` and save `inventory[].charges`). Shows a spend chip on the combat sheet. |
| `range` | Display string (`"Wpn"`, `"Self"`, `"10"`, etc.). No geometry is enforced. |
| `duration` | Display string (`"6 seconds"`, `"1 minute"`, `"Permanent"`, etc.). |
| `damageType` | Damage type id from `system.damageTypes` / `DamageType` (`slashing`, `air`, `water`, …). |
| `tags` | Shown chips (`Melee`, `Ranged`, `Weapon`, `Spell`, `Area`, `Delay`, `Riding`, `Multi(2)`, `Repeat(3)`, `Penetrate(5)`, …). |
| `hiddenTags` | Machine hints not shown as chips. Examples: `sustain`, `heal`, `barrier`, `shield`. |
| `source` | Source label/id (`equipment`, `rider`, `priest`, `feat`, `fairy`, …). |
| `powerRoll` | Optional tiered roll table; see below. |
| `fixedMaxCharges`, `chargeStat`, `chargeReset` | Charge pips when the card lives in `actionCards` or class `reactions[]` (see Charges section). |

Tags are mostly presentation and filtering. Tag arguments like `Multi(2)`, `Repeat(3)`, `Penetrate(5)`, and `Ranged(8)` are parsed only by specific helper code where noted; if no helper reads the tag, it is display/table-play text.

### Power rolls

`powerRoll` controls the tier display in creator, library, combat cards, feats, skills, and some passives:

```json
"powerRoll": {
  "rollStats": ["might", "dexterity"],
  "tier1Dmg": 2,
  "tier1Wpn": true,
  "tier2Dmg": 3,
  "tier2Wpn": true,
  "tier2Effect": {
    "type": "Condition",
    "effect": "prone",
    "srcStats": ["might"],
    "targetStats": ["dexterity"],
    "strength": "average",
    "duration": "[turn end]"
  },
  "tier3Dmg": 5,
  "tier3Wpn": true
}
```

| Field | Purpose |
|-------|---------|
| `rollStats` | Attribute ids used for the roll (`might`, `dexterity`, `reason`, `willpower`, `presence`). |
| `tier1Dmg`, `tier2Dmg`, `tier3Dmg` | Flat tier values. The UI label is context-sensitive (damage/heal/barrier) based on card tags/hidden tags. |
| `tier1Wpn`, `tier2Wpn`, `tier3Wpn` | Adds weapon damage display (`+ Wpn`) for that tier. |
| `tier1Effect`, `tier2Effect`, `tier3Effect` | One special/potency effect object per tier. Shapes below. |

### Power-roll effect object types

These are the supported `PotencyEffect` shapes in `lib/rules.ts`.

**Condition**

```json
{
  "type": "Condition",
  "effect": "slowed",
  "srcStats": ["willpower"],
  "targetStats": ["willpower"],
  "strength": "average",
  "duration": "[turn end]"
}
```

| Field | Purpose |
|-------|---------|
| `effect` | Condition id: `prone`, `push`, `pull`, `slide`, `bleeding`, `charmed`, `frightened`, `grabbed`, `agony`, `restrained`, `shaken`, `dazed`, `stunned`, `slowed`, `sundered`, `taunt`, `weakened`, `hemorrhage`. |
| `srcStats` | Optional source attributes for potency math/labeling. |
| `fixedSrcVal` | Optional fixed source value instead of source attributes. |
| `targetStats` | Optional target attributes for potency math/labeling. |
| `strength` | Potency strength: `weak`, `average`, or `strong` in JSON examples. Internally these map to `-2`, `-1`, `0`. |
| `duration` | Optional duration marker: `""`, `[turn end]`, `[save end]`, `[round end]`. |

**ForcedMovement**

```json
{
  "type": "ForcedMovement",
  "effect": "push",
  "distance": 2,
  "srcStats": ["reason"],
  "targetStats": ["willpower"],
  "strength": "strong"
}
```

| Field | Purpose |
|-------|---------|
| `effect` | `push`, `pull`, `slide`, `verticalpush`, or `verticalpull`. |
| `distance` | Number of tiles. |
| `srcStats`, `fixedSrcVal`, `targetStats`, `strength` | Same potency labeling fields as `Condition`. |

**Special**

```json
{
  "type": "Special",
  "effect": "Refund 2 Mana",
  "duration": "[round end]"
}
```

`Special` is the escape hatch for tier text that does not fit a typed effect. It is displayed, not automated.

### Other action card customization points

| Customization | Where to put it | Notes |
|---------------|-----------------|-------|
| Class-level gate | Class action wrapper: `classes.<classId>.actions.<id>.minLevel` | Controls creator/library level grouping. |
| Priest deity-gated action | Class action wrapper: `deityId` | Filtered by selected `priestDeity`. |
| Rider mount-gated action | Class action wrapper: `mountTypeId` | Filtered by selected `riderMountType`. |
| Embedded class card | `classes.<classId>.actions.<id>.actionCard` | Full `ActionCard` shape. |
| Global reusable card | `actionCards.<id>` | Used by equipment, feats, fairies, catalogs, and creature templates. |
| Reaction with detailed card | Class `reactions[]` row with `actionCard` | Also include top-level `id`, `name`, `trigger`, `description`. |
| Equipment-linked card | Item `actionIDs: ["equipment/stab"]` | `hydrateActionCardById` resolves the id. |
| Creature/summon-linked card | Bestiary template `actionIDs` | Deployed creatures inject their actions/reactions. |
| Catalog visibility | Global `actionCards` | Generic catalog lists non-monster globals; source/tags help users understand origin. |

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
| `actionIDs` | Linked `actionCards` — when equipped, grants those actions tied to **this item instance** (weapon damage uses the granting item) |
| `fixedMaxCharges` | Max charges tracked on the **inventory instance** (same semantics as trait charges) |
| `chargeReset` | Optional auto-refill timings: `endOfCombat`, `shortRest`, `longRest` |
| `statBonuses` | Gear stat modifiers (object keyed by stat name) |
| `requirements` | Optional stat and/or class gates (display-only in library and catalog) |
| `rank` | Optional default item rank key → `system.itemRanks` |
| `traits` | Inline passive definitions keyed by trait id (rare) |

Per-instance overrides (custom name, rank, invention modules, **current charge count**) live on **inventory entries** in the save, not in rules.

Save field: `inventory[].charges` — current count; `-1` = not tracked; max comes from rules `fixedMaxCharges`.

**Duplicate action IDs:** If two equipped items grant the same action and **either** has item charge tracking (`fixedMaxCharges`), the sheet shows **separate** action cards (one per item). Otherwise one card is shown, tied to the **active hand** granting item.

**Manual vs spend charges:** Items with `fixedMaxCharges` use charge pips on the inventory detail for manual tracking. Actions with `itemChargeCost` also show a clickable charge spend chip on the combat sheet (charges are deducted from the **granting item**, not from `character.actions[]`).

Item ranks: define palette in `system.itemRanks` (`label`, `nameClass` Tailwind classes). Display: [`logic/equipment/item-rank-display.ts`](../logic/equipment/item-rank-display.ts).

Logic: [`logic/equipment/granted-actions.ts`](../logic/equipment/granted-actions.ts), [`logic/equipment/item-charges.ts`](../logic/equipment/item-charges.ts).

### Item requirements (`requirements`)

Optional gates shown in the Rules Editor, Rules Library, and inventory catalog. **Display-only** — they do not block purchase or equipping.

```json
"requirements": {
  "stats": { "might": 13, "dexterity": 10 },
  "classes": { "1": ["fury", "weaponmaster"], "3": ["conjurer"] }
}
```

| Sub-field | Semantics |
|-----------|-----------|
| `stats` | Minimum attribute scores (`might`, `dexterity`, `reason`, `willpower`, `presence`). All listed mins must be met (AND). |
| `classes` | Same shape as feat `prereqs.classes`: level key → class id list. OR within a bucket; OR across buckets. |

Logic: [`logic/equipment/item-requirements.ts`](../logic/equipment/item-requirements.ts).

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

## Bestiary (`bestiary`)

The bestiary holds **creature templates** and **creature traits** used by the character sheet, creator, and Rules Library. Runtime code reads `bestiary.creatures` first; a legacy top-level `creatures` key is still supported as a fallback if `bestiary.creatures` is empty.

```json
"bestiary": {
  "traits": {
    "unliving": {
      "name": "Unliving",
      "description": "Immune to Bleeding, Charmed, …",
      "effects": [{ "type": "Immunity", "stat": "bleeding" }]
    }
  },
  "creatures": {
    "animaWolf": {
      "name": "Wolf Anima",
      "role": "summon",
      "level": 2,
      "tags": ["anima", "beast"],
      "attributes": { "might": 12, "dexterity": 14, … },
      "actionIDs": ["anima/wolfBite"],
      "traitRefs": ["animaWolfKeenSenses"],
      "defense": 2,
      "stability": 0,
      "speed": 7,
      "size": "1M",
      "resistances": ["nature"]
    }
  }
}
```

Types and roster logic: [`logic/creatures/roster.ts`](../logic/creatures/roster.ts). Sizes: [`logic/creatures/creature-size.ts`](../logic/creatures/creature-size.ts). Druid Anima: [`logic/creatures/druid-anima.ts`](../logic/creatures/druid-anima.ts). Rider mounts: [`logic/creatures/rider-mounts.ts`](../logic/creatures/rider-mounts.ts).

### Creature roles

Every template **must** include `role` (or legacy `kind`). Templates without a valid role are ignored by `getCreatureTemplates()`.

| Role | Typical use | Deploy cap | Action cards |
|------|-------------|------------|--------------|
| `"assistant"` | Trusty Companion, Fairy Tamer contracts | Shared assistant/minion cap on sheet | Feat `GrantActionCard` picks when unlocked by feat; else template `actionIDs` |
| `"minion"` | Conjurer minions (school-tagged) | Same cap as assistants | All template `actionIDs` when deployed |
| `"summon"` | Conjurer summons, mounts, Anima forms | Summon deploy rules | All template `actionIDs` when deployed (except Rider mounts and Anima roster rows — see below) |

### Creature template fields

| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Display name |
| `description` | string | Flavor / rules text in Library and creature panel |
| `role` | `"assistant"` \| `"minion"` \| `"summon"` | **Required.** Drives roster kind and action resolution |
| `level` | number | Catalog level for Library grouping and unlock gates. Normalized to `catalogLevel` at runtime |
| `creatureTypes` | string[] | Flavor types (e.g. `beast`, `fairy`, `construct`) — shown as badges |
| `tags` | string[] | Machine + display tags. See **Tag conventions** below |
| `attributes` | object | Partial attribute block (`might`, `dexterity`, `reason`, `willpower`, `presence`). Used for Anima stat replacement and display |
| `actionIDs` | string[] | `actionCards` ids granted when the creature is **deployed** (rules vary by source — see **Action cards**) |
| `traitRefs` | string[] | Ids into `bestiary.traits` (preferred) |
| `traits` | string[] | **Legacy alias** for `traitRefs` — same ids, either key works in JSON |
| `defense` | number | Defense rating (Anima forms replace the druid's Defense while transformed) |
| `stability` | number | Stability rating (Anima replacement) |
| `speed` | number | Speed (Anima replacement; mounts use Rider class option speed when merged) |
| `size` | string | Creature size — see **Size** |
| `resistances` | string[] | Damage type ids (`fire`, `nature`, …) |
| `immunities` | string[] | Damage types or condition ids |
| `vulnerabilities` | array | `{ "stat": "fire" }` or `{ "stat": "fire", "value": "3" }` |
| `opportunityAttack` | number | OA damage value for display (typo `opportuniyAttack` also parsed) |
| `defaultMaxHp` | number | Default HP pool when row is created. Summons default **10** if omitted |
| `defaultMaxMp` | number | Default MP pool when row is created. Summons default **0** if omitted |
| `summonTier` | `2` \| `4` | Conjurer catalog tier override |
| `passengers` | number | Mount passenger capacity |
| `mountedRiderBonuses` | object | `{ defense?, stability? }` — **avoid duplicating** Rider mount data; prefer `classes.rider.mounts` |
| `naturalWeapons` | object | Logical key → inline weapon: `name`, `damage`, `damageType` (required); `range`, `tags`, `attributes` optional (see system defaults) |
| `defaultNaturalWeaponKey` | string | Which natural weapon is equipped in the main hand when entering Anima |

**Full template** (Druid Anima reference — `animaWolf` in rules):

Use this shape when adding new Anima forms: `role: "summon"`, tag `anima`, `level` for slot eligibility, replacement stats, shared `beast/` (or other) Weapon actions with `hiddenTags: ["natural:<key>"]`, inline `naturalWeapons` + `defaultNaturalWeaponKey`, and optional `traitRefs` for temporary player traits while transformed.

### Natural weapons (per creature)

Each bestiary entry defines its own natural weapons inline. Optional fields fall back to `system.defaults.naturalWeapon`.

**System defaults** (`rules.json`):

```json
"system": {
  "defaults": {
    "naturalWeapon": {
      "attributes": ["might", "dexterity"],
      "range": 1,
      "tags": ["melee", "natural"]
    }
  }
}
```

**On a creature** (required: `name`, `damage`, `damageType` per key):

```json
"naturalWeapons": {
  "bite": {
    "name": "Bite",
    "damage": 2,
    "damageType": "slashing"
  }
},
"defaultNaturalWeaponKey": "bite"
```

Omit `range`, `tags`, or `attributes` on a weapon to use the system defaults above.

**Action linkage:** Add `Weapon` to action tags and `hiddenTags: ["natural:bite"]` (or visible `Natural(bite)`). Use `tier1Wpn` / `tier2Wpn` / `tier3Wpn` on the power roll so damage comes from the equipped natural weapon.

**Anima equipment:** Entering Anima stashes all gear in `equipmentBeforeAnima`, clears slots, and equips `anima:<key>` UIDs in hand slots. While transformed, the Tracking tab only allows picking natural weapons for main/off hand. Weapon-tagged Anima actions appear only when the matching natural key is equipped.

**Minimal stub** (Rider mounts): only `role` and `level` in JSON; stats are merged from `classes.rider.mounts` at runtime:

```json
"mount_tough": {
  "role": "summon",
  "level": 1
}
```

### Level, `catalogLevel`, and `summonTier`

- JSON field **`level`** → runtime **`catalogLevel`** (integer).
- If `summonTier` is omitted, it is **derived** from `catalogLevel`:

| `level` / `catalogLevel` | Derived `summonTier` |
|--------------------------|----------------------|
| 1 or 2 | 2 |
| 3 or 4 | 4 |

Explicit `"summonTier": 2` or `4` overrides inference.

**Conjurer** uses `summonTier` plus school **tags** (`geomancy`, `necromancy`, … from Summoner passive) to filter the creator catalog. Tier-4 creatures require Summon Mastery 2 (Great Summoner) and only appear in the **third** conjurer slot.

**Druid Anima** uses `level` as max slot eligibility: Druid 3+ → two slots (level ≤ 2); Druid 5+ → third slot (level ≤ 4). Template must include tag `anima`, `druidanima`, or `druid-anima`.

### Size

Valid values (`logic/creatures/creature-size.ts`):

- Standard: `"1T"`, `"1S"`, `"1M"`, `"1L"`
- Numeric: `"2"`, `"3"`, … (positive integer string, ≥ 2)

### Tag conventions

| Tag | Meaning |
|-----|---------|
| `anima` | Druid Anima form — selectable in creator, transform on sheet |
| `mount` | Mount template — no default HP/MP unless `defaultMaxHp` / `defaultMaxMp` set |
| `geomancy`, `necromancy`, … | Conjurer school catalog filter (must match Summoner school pick) |
| `fairy`, `lesser`, `greater` | Fairy Tamer contract filtering |
| `air`, `fire`, `water`, `earth`, `nature`, … | Fairy element (one lesser per element; upgrade path to greater) |
| `rider` | Added at runtime to Rider mount templates |

Tags are also used for Library search and display chips.

### Bestiary traits (`bestiary.traits`)

Creature traits are **separate** from class/feats/racial traits. They use the same `effects` vocabulary where noted in **Description-only vs automated effects**, but are resolved via `resolveCreatureTraitEntries()` — not `hydrateTraitRefs()`.

| Pattern | Example |
|---------|---------|
| Description-only | `crafty`, `largeFrame`, `strikerSummon` — table-play text in Library / creature detail |
| With `effects` | `unliving` (Immunity rows), `animaWolfPackHunter` (StatChange speed) |

**Anima form traits:** When a druid activates Anima, `traitRefs` on the template are hydrated as temporary character traits (added to non-racial traits). `StatChange`, `GrantSight`, etc. then flow through normal stat pipelines.

Link creatures with:

```json
"traitRefs": ["metaphysical", "unliving"]
```

### Action cards on creatures

Templates list card ids in `actionIDs`. Cards must exist under `actionCards` (or class actions). Common namespaces:

| Prefix | Use |
|--------|-----|
| `anima/` | Druid Anima-only actions (excluded from generic action catalog) |
| `beast/`, `feat/`, `monster/`, `fairy/` | Summons, companions, monsters, fairy contracts |

**Who gets which actions when deployed:**

| Source | `actionIDs` behavior |
|--------|----------------------|
| Generic summon / minion | All template `actionIDs` |
| Feat assistant (`trustyCompanion`) | Player's feat `GrantActionCard` picks if set; else template list |
| Fairy Tamer | Creator `pickedActionCardIds` on roster row — **not** template `actionIDs` |
| Rider mount (`rider-mount-*`) | **None** from template — signature actions are Rider class XP picks |
| Druid Anima roster row | **None** on row — active form injects `actionIDs` via `getActiveDruidAnimaActionRefs` |
| Rules Library preview | Rider mount signature cards can be listed in library-only maps for reference |

Reactions on templates (`type: "reaction"` / `"freeReaction"`) are injected into the character's reaction list when the creature is deployed.

### Feat unlocks (`grantsCreatureTemplate`)

Feats can add a roster row automatically:

```json
"trustyCompanion": {
  "name": "Trusty Companion",
  "grantsCreatureTemplate": "trustyCompanion",
  "selectAmount": 2,
  "effects": [
    { "type": "GrantActionCard", "value": "feat/bite" },
    { "type": "GrantActionCard", "value": "feat/scratch" }
  ]
}
```

Legacy alias: `grantsCreature` (same as `grantsCreatureTemplate`).

The sheet creates a row with id `feat-<featId>-<templateId>`, `rosterSource: "feat"`, and default summon HP/MP pools when role is `summon`.

### Character save ↔ roster

Creatures persist on the character as `creatures: CreatureRosterEntry[]`. Each row has:

| Field | Purpose |
|-------|---------|
| `id` | Stable row id (e.g. `conjurer-slot-0`, `rider-mount-0`, `druid-anima-slot-1`) |
| `templateId` | Key into `bestiary.creatures` |
| `kind` | Mirrors template `role` |
| `deployed` | On-field toggle on sheet |
| `rosterSource` | `feat`, `conjurer`, `fairyTamer`, `rider`, `inventory`, `druidAnima` |
| `currentHp`, `maxHp`, `currentMp`, `maxMp` | Tracked pools (mounts often omit HP/MP) |
| `pickedActionCardIds` | Fairy contract spells |
| `customName`, `notes` | Player labels |

`reconcileCreatureRoster()` merges saved rows with dynamic unlocks (feats, class options, inventory) on load. Related save fields:

| Field | Class / feature |
|-------|-----------------|
| `conjurerSummonTemplateIds` | Conjurer summon picks |
| `fairyTamerContracts` | Fairy roster + spells |
| `riderMountType` | Rider mount option id (`swift`, `tough`, `adaptable`) |
| `druidAnimaTemplateIds` | Anima form picks |
| `activeDruidAnimaTemplateId` | Currently transformed form (sheet only) |
| `mountedCreatureId` | Which roster entry the character is riding |

### Rider mounts (single source of truth)

**Author mount stats once** under `classes.rider.mounts[]`:

```json
{
  "id": "tough",
  "name": "Tough",
  "size": "2",
  "speed": 5,
  "passengers": 1,
  "bonusStats": { "defense": 1, "stability": 1 },
  "creatureTypes": ["beast"],
  "description": "…"
}
```

Bestiary stubs (`mount_swift`, `mount_tough`, `mount_adaptable`) only need `role` and `level`. At runtime `applyRiderMountOptionToCreatureDefinition()` merges name, speed, size, passengers, tags, and `mountedRiderBonuses` from the class option.

**Do not** duplicate `mountedRiderBonuses` on both the class mount and the bestiary template — class options win for Rider roster entries.

Rider mount **action cards** are **not** auto-granted from `actionIDs`; players pick signature actions with Rider class XP. The Library may still preview them via a library-only mapping.

### Inventory-backed mount (Magibike)

Item `misc_magibike` + template `mount_magibike`: while the item is in inventory and the character has Artificer 1+, a roster row appears (`rosterSource: "inventory"`). Removing the item removes the row. Set `defaultMaxMp: 10` on the template for the mount mana pool; omit HP/MP defaults for a mount with no HP bar.

### Druid Anima (Wildshape-style)

1. Add template under `bestiary.creatures` with tag **`anima`** and **`level`** (2 or 4 for current slots).
2. Set replacement **`attributes`**, **`defense`**, **`stability`**, **`speed`**, **`resistances`**, **`immunities`** as needed.
3. List **`actionIDs`** (use `anima/` prefix for form-only attacks).
4. Optional **`traitRefs`** → temporary traits while transformed (racial traits suppressed; other traits kept).
5. Add matching **`bestiary.traits`** if those refs need automated effects.

While Anima is active on the sheet: stats override, Brawler actions remain, other actions hidden, Anima actions injected, Barrier granted on activation (Druid level × 3). Cannot activate in martial armor.

### Conjurer catalog checklist

1. Template `role`: `"summon"` or `"minion"`.
2. Tag with school id matching `SummonSchool` effect (`geomancy` / `necromancy`, …).
3. Set `level` / `summonTier` for tier-2 vs tier-4 pools.
4. Provide `actionIDs`, stats, and `traitRefs` as needed.
5. Verify creator slots at Conjurer 3+ with Summoner passive selected.

### Fairy Tamer checklist

1. `role: "assistant"`, tags `fairy` + `lesser` or `greater` + element tag.
2. Usually **`actionIDs: []`** — spells come from creator contract picks stored on the roster row.
3. `metaphysical` is a common `traitRefs` entry for lesser fairies.

### Authoring checklist (new creature)

1. Pick a **camelCase** template id (stable — referenced in saves and feats).
2. Set **`role`** and **`name`**; add **`description`**.
3. Set **`level`** for Library ordering and unlock logic.
4. Add **`tags`** for any class/feature catalog filters.
5. Wire **`actionIDs`** to existing `actionCards` (create cards first if needed).
6. Add **`traitRefs`** into `bestiary.traits` for reusable creature abilities.
7. For summons, set **`defaultMaxHp`** / **`defaultMaxMp`** if defaults (10 / 0) are wrong.
8. For mounts, tag **`mount`** and prefer class-option merge over duplicated stats.
9. Run `npx tsc --noEmit` and verify in **Library → Creatures** and on a test character's **Creatures** panel.

### What JSON alone cannot do

| Goal | Code needed? |
|------|----------------|
| New creature template + Library entry | No |
| Deploy creature + show action cards | No (if `actionIDs` and refs exist) |
| Anima stat replacement / action swap | No (if tagged and picked in creator) |
| Mount rider stat bonuses | No (if `classes.rider.mounts` + stub template) |
| Enforce summon AP limits / OA rules on sheet | **Yes** — description + bestiary traits only |
| New roster source or unlock rule | **Yes** — extend `reconcileCreatureRoster` |

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

Built for browse/search in [`logic/display/glossary-lookup.ts`](../logic/display/glossary-lookup.ts). Adding entries here is **documentation-only** — no combat automation.

---

## Hydration pipeline (mental model)

```
rules.json  ──►  rulesData (lib/rules-data.ts)
    │
    ├─► Character save refs (traits / actions / reactions)
    │       └─► discoverAllTraitRefs → hydrateTraitRefs (logic/traits/)
    │       └─► hydrateActionCardById (logic/actions/)
    │       └─► buildReactionLibrary (logic/traits/rest-helpers)
    │
    ├─► Derived stats (logic/character/derived-stats.ts + logic/character/stats.ts)
    │
    └─► UI (creator, library, combat cards, charge pips, glossary)
```

Passive resolution for display and stats: [`resolvePassiveById`](../logic/traits/passive-lookup.ts) — `passives` → class passives → race passives → feats → item-inline → deity overlay. See [data-model.md](./data-model.md#phase-c--passive-resolution).

---

## When JSONId change rules only vs add code

| Goal | Rules JSON only? |
|------|------------------|
| New feat/passive text | Yes |
| Charge pips + rest reset | Yes (if on supported location) |
| +maxHP / +maxMP / speed / skills / sight / movement | Yes (`effects`) |
| New power roll on action | Yes (`powerRoll`) |
| New creature template + deploy actions | Yes (`bestiary.creatures` + `actionIDs`) |
| Druid Anima form (stats + actions + traits) | Yes (tag `anima`, see Bestiary section) |
| Rider mount stub + class `mounts` option | Yes |
| New condition / forced-movement / special tier text | Yes (existing `tierXEffect` shapes) |
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
   - **Library**: class/feat/item/glossary/**creature** entries
4. For feats with prereqs, consider running `node scripts/migrate-feat-prereqs.mjs` to canonicalize.
5. Run `npm run validate:rules`, `npm run test:run`, and `npx tsc --noEmit`.

---

## Related source files

Paths below are canonical locations (no `lib/` re-export shims).

| Topic | File |
|-------|------|
| Rules accessors | `lib/rules-data.ts` |
| Rules validation | `logic/rules/validate-rules.ts`, `scripts/validate-rules.mjs` |
| Alias normalization | `logic/rules/normalize-aliases.ts` |
| Core types | `lib/rules.ts` |
| Save schema | `lib/character-data.ts`, `lib/baseRefs.ts` |
| Charges | `logic/traits/charge-helpers.ts`, `logic/traits/rest-helpers.ts` |
| Passive lookup | `logic/traits/passive-lookup.ts` |
| Trait discovery / hydration | `logic/traits/trait-hydration.ts` |
| Derived stats | `logic/character/derived-stats.ts` |
| Stat math (modifiers, max HP, class bonuses) | `logic/character/stats.ts` |
| Equip slot updates (two-hand, shield) | `logic/equipment/equipment-slot-state.ts` |
| Item rank display | `logic/equipment/item-rank-display.ts` |
| Action hydration | `logic/actions/hydrate.ts` |
| Feat prereqs | `logic/feats/prereqs.ts` |
| Combat info effects | `logic/combat/more-info.ts` |
| Effect labels | `logic/traits/selection.ts` |
| Skill grants | `logic/traits/grant-skill-effects.ts` |
| Glossary UI | `logic/display/glossary-lookup.ts` |
| Library formatting | `logic/display/rules-library-helpers.tsx` |
| Creature templates & roster | `logic/creatures/roster.ts` |
| Creature size | `logic/creatures/creature-size.ts` |
| Druid Anima | `logic/creatures/druid-anima.ts` |
| Rider mounts | `logic/creatures/rider-mounts.ts`, `logic/creatures/mounted-creature.ts` |
| Fairy Tamer contracts | `logic/creatures/fairy-tamer.ts` |
| Sheet orchestration | `hooks/character/use-data-loader.tsx` |

---

## Accessories (`acc_*`)

Worn gear uses accessory slots on the character sheet: `head`, `neck`, `waist`, `wristLeft`, `wristRight`, `feet` (see `logic/equipment/accessory-slots.ts`).

| Field | Value |
|-------|--------|
| Item id prefix | `acc_` (e.g. `acc_fedoraOfCinders`) |
| `type` | `"misc"` for worn accessories; `"container"` only when the item holds inventory (e.g. satchels) |
| `allowedSlots` | One or more current slot keys; legacy aliases (`back` → waist, `ringLeft` → wristLeft) still work in catalog |
| `rank` | `common`, `intermediate`, `advanced`, or `masterwork` — drives name color and Zenny band |
| Cosmetic | Omit `traits`, `actionIDs`, and charges; put “Cosmetic.” in `description` |

**Mechanical accessories** use the same patterns as armor/weapons:

- **`statBonuses`** on the item for Speed, Stability, Max MP (`mp`), Max IP (`ip`), etc.
- **`traits: ["passiveId"]`** → entry in top-level `passives` (typed `effects` or description-only)
- **`actionIDs`** → top-level `actionCards`; pair with **`fixedMaxCharges`** + **`chargeReset`** on the **item** when the action has `itemChargeCost`
- **Reactions** (season cloaks): `actionCards` with `"type": "reaction"` and an element-specific `trigger`

Rebalance accessory Zenny after bulk adds:

```bash
node scripts/rebalance-item-prices.mjs --accessories
```

Bands: common 1–250, intermediate 350–800, advanced 1000–5000, masterwork 5000+.

In the Rules Library and inventory catalog, worn gear with accessory `allowedSlots` appears under the **Accessories** category (not mixed into Misc). Slot labels use `logic/equipment/accessory-catalog.ts`.

---

## Quick reference: add a charged class passive

1. Open `classes.<classId>.passives`.
2. Add a camelCase key with `name`, `minLevel`, `description`.
3. Add `fixedMaxCharges` (or `chargeStat`) and `chargeReset`.
4. Ensure class progression grants the passive id in creator (existing class level tables).
5. Confirm end-of-combat / rest buttons refill pips on a character with that passive.

That’s the full loop for the most common “uses per rest/combat” pattern without new application code.

---

## Quick reference: add a Druid Anima form

1. Add `bestiary.traits` entries if the form needs automated sight/stat effects.
2. Add `bestiary.creatures.<id>` with `role: "summon"`, `tags: ["anima", …]`, and `level` (2 or 4).
3. Set replacement `attributes`, `defense`, `stability`, `speed`, and optional `resistances` / `immunities`.
4. Create `actionCards` under `anima/` and list ids in `actionIDs`.
5. Optionally set `traitRefs` for temporary traits while transformed.
6. Confirm the form appears in Druid Anima picks at the correct class level and activates on the sheet.
