import type { ReactionRef, TraitRef } from "@/lib/baseRefs"
import type { TraitEffect } from "@/lib/rules"
import {
    type FairyTamerContractsSave,
    characterHasFairyContract,
    emptyFairyTamerContracts,
    getFairytamerLevel,
} from "@/logic/creatures/fairy-tamer"
import {
    applyRiderMountOptionToCreatureDefinition,
    buildRiderMountRow,
    getRiderMountTemplateId,
    isRiderRosterEntry,
    riderHasFaithfulSteed,
} from "@/logic/creatures/rider-mounts"
import {
    DRUID_ANIMA_ROSTER_SOURCE,
    getDruidAnimaActionCardIds,
    getDruidAnimaSlots,
    getSelectedDruidAnimaTemplateIds,
    sanitizeDruidAnimaTemplateIds,
    isDruidAnimaRosterEntry,
} from "@/logic/creatures/druid-anima"
import { type CreatureSize, isCreatureSize } from "@/logic/creatures/creature-size"
import {
    type NaturalWeaponDefinition,
    parseNaturalWeaponFromJson,
} from "@/logic/equipment/natural-weapons"

export const MAX_DEPLOYED_SUMMONS = 1
export const MAGIBIKE_ITEM_ID = "misc_magibike"
export const MAGIBIKE_TEMPLATE_ID = "mount_magibike"

/** Conjurer Summoner: max minion rows deployed at once (rank 1 → 2, rank 2+ → 3). Excludes summons; mutual exclusion with any deployed summon. */
export function getMaxConjurerMinionsByMastery(summonMastery: number): number {
    if (summonMastery >= 2) return 3
    if (summonMastery >= 1) return 2
    return 0
}

/** Roster row from Conjurer creator slots (vs feat unlocks). */
export function isConjurerRosterEntry(entry: CreatureRosterEntry): boolean {
    if (entry.rosterSource === "conjurer") return true
    return entry.id.startsWith("conjurer-slot-")
}

/** Roster row from Fairy Tamer contracts (character creator). */
export function isFairyTamerRosterEntry(entry: CreatureRosterEntry): boolean {
    if (entry.rosterSource === "fairyTamer") return true
    return entry.id.startsWith("fairy-tamer-slot-")
}

export function isInventoryMountRosterEntry(entry: CreatureRosterEntry): boolean {
    if (entry.rosterSource === "inventory") return true
    return entry.id.startsWith("inventory-mount-")
}

export function isCreatureDefinitionMount(def: CreatureDefinition | undefined): boolean {
    if (!def) return false
    return (def.tags ?? []).some((tag) => tag.toLowerCase() === "mount")
}

/** Roster / rules role: assistants & minions share deploy caps; summons use template action list in full. */
export type CreatureRole = "assistant" | "minion" | "summon"
export type CreatureKind = CreatureRole

export interface CreatureVulnerability {
    stat: string
    value?: string
}

export interface CreatureDefinition {
    name: string
    description?: string
    role: CreatureRole
    /** Optional flavor types from glossary.creatureTypes keys */
    creatureTypes?: string[]
    /** Optional catalog / unlock tier (e.g. 1 vs 3) for rules library ordering. */
    catalogLevel?: number
    /** e.g. geomancy / necromancy for Conjurer catalog filtering */
    tags?: string[]
    attributes?: Partial<Record<"might" | "dexterity" | "reason" | "willpower" | "presence", number>>
    actionIDs?: string[]
    /** Summon defaults when role is summon */
    defaultMaxHp?: number
    defaultMaxMp?: number
    stability?: number
    speed?: number
    size?: CreatureSize
    resistances?: string[]
    /** Damage or tag keys the creature is immune to (bestiary; display / future resolution). */
    immunities?: string[]
    vulnerabilities?: CreatureVulnerability[]
    /** Ids into `rules.bestiary.traits`. */
    traitRefs?: string[]
    /** Defense rating (summons / creatures). */
    defense?: number
    /** Opportunity-attack damage; omit or 0 = none. */
    opportunityAttack?: number
    /** Conjurer catalog tier: 2 = Summon Mastery 1 pool, 4 = Mastery 2 pool.
     * If omitted, derived from `catalogLevel`: 1 or 2 → tier 2 pool; 3 or 4 → tier 4 pool (matches rules `level` field).
     */
    summonTier?: 2 | 4
    /** Max riders/passengers (mount templates). */
    passengers?: number
    /** Bonuses applied to the rider while mounted (Def, Stability). */
    mountedRiderBonuses?: Partial<Record<"defense" | "stability", number>>
    /** Logical key → inline natural weapon stats on this template. */
    naturalWeapons?: Record<string, NaturalWeaponDefinition>
    /** Default key for Weapon actions without explicit `natural:<key>`. */
    defaultNaturalWeaponKey?: string
}

export interface BestiaryTraitDefinition {
    name?: string
    description?: string
    effects?: TraitEffect[]
}

export interface CreatureRosterEntry {
    /** Stable id for this roster row (persisted). */
    id: string
    templateId: string
    kind: CreatureKind
    deployed: boolean
    /** When this row exists because of a feat unlock (e.g. trustyCompanion). */
    unlockFeatId?: string
    /** Feat vs class/inventory-backed roster row. */
    rosterSource?: "feat" | "conjurer" | "fairyTamer" | "rider" | "inventory" | "druidAnima"
    /** Inventory-backed creatures are removed when this item uid is no longer owned. */
    sourceItemUid?: string
    /** Fairy Tamer: both contract spells chosen in the creator (not from template actionIDs). */
    pickedActionCardIds?: string[]
    customName?: string
    notes?: string
    currentHp?: number
    maxHp?: number
    currentMp?: number
    maxMp?: number
}

/** Raw catalog row (allows `role` or legacy `kind`, plus extra JSON fields). */
export type CreaturesJson = Record<string, Partial<CreatureDefinition> & { kind?: CreatureRole; traits?: string[] }>

function normalizeCreatureRole(raw: CreaturesJson[string]): CreatureRole | undefined {
    const r = raw.role ?? raw.kind
    if (r === "assistant" || r === "minion" || r === "summon") return r
    return undefined
}

export type RulesWithBestiary = {
    bestiary?: {
        creatures?: CreaturesJson
        traits?: Record<string, BestiaryTraitDefinition>
    }
    creatures?: CreaturesJson
    system?: Record<string, unknown>
    classes?: Record<
        string,
        {
            passives?: Record<
                string,
                { effects?: TraitEffect[]; selectAmount?: number; minLevel?: number }
            >
        }
    >
}

function getRawCreatureRows(rules: RulesWithBestiary): CreaturesJson {
    const fromBestiary = rules.bestiary?.creatures
    if (fromBestiary && typeof fromBestiary === "object" && Object.keys(fromBestiary).length > 0) {
        return fromBestiary
    }
    const legacy = rules.creatures
    return legacy && typeof legacy === "object" ? legacy : {}
}

/** Bestiary / legacy `creatures` catalog. */
export function getCreatureTemplates(rules: RulesWithBestiary): Record<string, CreatureDefinition> {
    const raw = getRawCreatureRows(rules)
    const out: Record<string, CreatureDefinition> = {}
    for (const [id, row] of Object.entries(raw)) {
        if (!row || typeof row !== "object") continue
        const role = normalizeCreatureRole(row)
        if (!role) continue
        const name = typeof row.name === "string" ? row.name : id
        const rowTraitRefsRaw = (row as { traitRefs?: unknown; traits?: unknown }).traitRefs
        const rowTraitsLegacy = (row as { traits?: unknown }).traits
        const traitRefsSource = Array.isArray(rowTraitRefsRaw)
            ? rowTraitRefsRaw
            : Array.isArray(rowTraitsLegacy)
              ? rowTraitsLegacy
              : undefined
        const traitRefs = traitRefsSource
            ? traitRefsSource.map((x) => String(x).trim()).filter(Boolean)
            : undefined
        const vulnRaw = (row as { vulnerabilities?: unknown }).vulnerabilities
        const vulnerabilities = Array.isArray(vulnRaw)
            ? vulnRaw
                  .map((v): CreatureVulnerability | null => {
                      if (!v || typeof v !== "object") return null
                      const o = v as Record<string, unknown>
                      const stat = String(o.stat ?? "").trim()
                      if (!stat) return null
                      return {
                          stat,
                          value: o.value != null ? String(o.value) : undefined,
                      }
                  })
                  .filter((x): x is CreatureVulnerability => x != null)
            : undefined
        const levelRaw = (row as { level?: unknown }).level
        const catalogLevel =
            typeof levelRaw === "number" && Number.isFinite(levelRaw) ? Math.floor(levelRaw) : undefined
        const tagsRaw = (row as { tags?: unknown }).tags
        const tags = Array.isArray(tagsRaw)
            ? tagsRaw.map((x) => String(x).trim()).filter(Boolean)
            : undefined
        const resRaw = (row as { resistances?: unknown }).resistances
        const resistances = Array.isArray(resRaw)
            ? resRaw.map((x) => String(x).trim()).filter(Boolean)
            : undefined
        const immRaw = (row as { immunities?: unknown }).immunities
        const immunities = Array.isArray(immRaw)
            ? immRaw.map((x) => String(x).trim()).filter(Boolean)
            : undefined
        const defenseRaw = (row as { defense?: unknown }).defense
        const defense = typeof defenseRaw === "number" && Number.isFinite(defenseRaw) ? defenseRaw : undefined
        const rowRec = row as Record<string, unknown>
        const oaRaw = rowRec.opportunityAttack ?? rowRec.opportuniyAttack
        const opportunityAttack =
            typeof oaRaw === "number" && Number.isFinite(oaRaw) ? Math.floor(oaRaw) : undefined
        const stRaw = (row as { summonTier?: unknown }).summonTier
        let summonTier: 2 | 4 | undefined
        if (stRaw === 2 || stRaw === 4) summonTier = stRaw
        else if (catalogLevel === 4) summonTier = 4
        else if (catalogLevel === 2) summonTier = 2
        else if (catalogLevel === 3) summonTier = 4
        else if (catalogLevel === 1) summonTier = 2

        const passengersRaw = (row as { passengers?: unknown }).passengers
        const passengers =
            typeof passengersRaw === "number" && Number.isFinite(passengersRaw)
                ? Math.floor(passengersRaw)
                : undefined
        const mrbRaw = (row as { mountedRiderBonuses?: unknown }).mountedRiderBonuses
        let mountedRiderBonuses: CreatureDefinition["mountedRiderBonuses"]
        if (mrbRaw && typeof mrbRaw === "object") {
            const o = mrbRaw as Record<string, unknown>
            mountedRiderBonuses = {
                defense: typeof o.defense === "number" ? o.defense : undefined,
                stability: typeof o.stability === "number" ? o.stability : undefined,
            }
        }

        const nwRaw = (row as { naturalWeapons?: unknown }).naturalWeapons
        let naturalWeapons: CreatureDefinition["naturalWeapons"]
        if (nwRaw && typeof nwRaw === "object" && !Array.isArray(nwRaw)) {
            naturalWeapons = {}
            for (const [k, v] of Object.entries(nwRaw as Record<string, unknown>)) {
                const key = String(k).trim()
                if (!key) continue
                const parsed = parseNaturalWeaponFromJson(key, v)
                if (parsed) naturalWeapons[key] = parsed
            }
            if (Object.keys(naturalWeapons).length === 0) naturalWeapons = undefined
        }
        const defaultNaturalWeaponKeyRaw = (row as { defaultNaturalWeaponKey?: unknown }).defaultNaturalWeaponKey
        const defaultNaturalWeaponKey =
            typeof defaultNaturalWeaponKeyRaw === "string" && defaultNaturalWeaponKeyRaw.trim()
                ? defaultNaturalWeaponKeyRaw.trim()
                : undefined

        const definition: CreatureDefinition = {
            name,
            description: typeof row.description === "string" ? row.description : undefined,
            role,
            catalogLevel,
            summonTier,
            creatureTypes: Array.isArray(row.creatureTypes) ? row.creatureTypes : undefined,
            tags,
            attributes: row.attributes,
            actionIDs: Array.isArray(row.actionIDs) ? row.actionIDs : undefined,
            defaultMaxHp: typeof row.defaultMaxHp === "number" ? row.defaultMaxHp : undefined,
            defaultMaxMp: typeof row.defaultMaxMp === "number" ? row.defaultMaxMp : undefined,
            stability: typeof row.stability === "number" ? row.stability : undefined,
            speed: typeof row.speed === "number" ? row.speed : undefined,
            size: isCreatureSize(row.size) ? row.size : undefined,
            resistances,
            immunities,
            vulnerabilities,
            traitRefs,
            defense,
            opportunityAttack,
            passengers,
            mountedRiderBonuses,
            naturalWeapons,
            defaultNaturalWeaponKey,
        }
        out[id] = applyRiderMountOptionToCreatureDefinition(rules, id, definition)
    }
    return out
}

function withDefaultSummonPools(base: CreatureRosterEntry, def: CreatureDefinition): CreatureRosterEntry {
    if (def.role !== "summon") return base
    const isMount = isCreatureDefinitionMount(def)
    const next = { ...base }
    if (!isMount || typeof def.defaultMaxHp === "number") {
        const maxHp = typeof def.defaultMaxHp === "number" ? def.defaultMaxHp : 10
        next.maxHp = maxHp
        next.currentHp = maxHp
    }
    if (!isMount || typeof def.defaultMaxMp === "number") {
        const maxMp = typeof def.defaultMaxMp === "number" ? def.defaultMaxMp : 0
        next.maxMp = maxMp
        next.currentMp = maxMp
    }
    return next
}

function normalizeSummonPools(
    entry: CreatureRosterEntry,
    templates: Record<string, CreatureDefinition>
): CreatureRosterEntry {
    if (entry.kind !== "summon") return entry
    const def = templates[entry.templateId]
    const isMount = isCreatureDefinitionMount(def)
    const maxHp = isMount && def?.defaultMaxHp == null ? undefined : entry.maxHp ?? def?.defaultMaxHp ?? 10
    const maxMp = isMount && def?.defaultMaxMp == null ? undefined : entry.maxMp ?? def?.defaultMaxMp ?? 0
    const currentHp = maxHp == null ? undefined : entry.currentHp ?? maxHp
    const currentMp = maxMp == null ? undefined : entry.currentMp ?? maxMp
    if (
        entry.maxHp === maxHp &&
        entry.maxMp === maxMp &&
        entry.currentHp === currentHp &&
        entry.currentMp === currentMp
    ) {
        return entry
    }
    const next = { ...entry }
    if (maxHp == null) {
        delete next.maxHp
        delete next.currentHp
    } else {
        next.maxHp = maxHp
        next.currentHp = currentHp
    }
    if (maxMp == null) {
        delete next.maxMp
        delete next.currentMp
    } else {
        next.maxMp = maxMp
        next.currentMp = currentMp
    }
    return next
}

export function getBestiaryTraitMap(rules: RulesWithBestiary): Record<string, BestiaryTraitDefinition> {
    const t = rules.bestiary?.traits
    return t && typeof t === "object" ? t : {}
}

export function resolveCreatureTraitEntries(
    rules: RulesWithBestiary,
    traitIds: string[] | undefined
): Array<{ id: string } & BestiaryTraitDefinition> {
    if (!traitIds?.length) return []
    const map = getBestiaryTraitMap(rules)
    return traitIds
        .map((id) => {
            const def = map[id]
            if (!def) return { id, name: id, description: undefined }
            return { id, ...def }
        })
        .filter(Boolean)
}

/** Conjurer Summoner passive: school tag `geomancy` or `necromancy` from chosen effect. */
export function getConjurerSummonSchoolTag(traits: TraitRef[], rules: RulesWithBestiary): string | null {
    const ref = traits.find((t) => t.id === "summoner" && String(t.source).toLowerCase() === "class")
    if (!ref?.selectedEffectIndices?.length) return null
    const passive = rules.classes?.conjurer?.passives?.summoner
    const effects = passive?.effects
    if (!Array.isArray(effects)) return null
    const idx = ref.selectedEffectIndices[0]
    if (!Number.isInteger(idx) || idx < 0 || idx >= effects.length) return null
    const eff = effects[idx] as TraitEffect | undefined
    if (eff?.type !== "SummonSchool") return null
    const v = String(eff.value ?? "").trim().toLowerCase()
    return v || null
}

export function characterHasSummonerPassive(traits: TraitRef[], classes: { id: string; level: number }[]): boolean {
    const conj = classes.find((c) => c.id === "conjurer" && c.level >= 3)
    if (!conj) return false
    return traits.some((t) => t.id === "summoner" && String(t.source).toLowerCase() === "class")
}

/** Trait refs for conjurer passives used when resolving school/mastery from creator class picks. */
export function conjurerClassTraitRefsFromPicks(
    picks: { id: string; source: string; selectedEffectIndices?: number[] }[]
): TraitRef[] {
    return picks
        .filter((p) => p.source === "conjurer" && (p.id === "summoner" || p.id === "greatSummoner"))
        .map((p) => ({
            id: p.id,
            source: "class" as const,
            ...(p.selectedEffectIndices?.length ? { selectedEffectIndices: p.selectedEffectIndices } : {}),
        }))
}

/** Summon Mastery rank: 1 with Summoner only, 2 with Great Summoner once class level meets that passive's minLevel. */
export function getSummonMastery(
    traits: TraitRef[],
    classes: { id: string; level: number }[],
    rules: RulesWithBestiary
): number {
    if (!characterHasSummonerPassive(traits, classes)) return 0
    const conj = classes.find((c) => c.id === "conjurer")
    const hasGreat = traits.some((t) => t.id === "greatSummoner" && String(t.source).toLowerCase() === "class")
    if (!hasGreat) return 1
    const passive = rules.classes?.conjurer?.passives?.greatSummoner
    const minLv = typeof passive?.minLevel === "number" && Number.isFinite(passive.minLevel) ? passive.minLevel : 5
    if (conj && conj.level >= minLv) return 2
    return 1
}

/** Catalog tier for conjurer summon/minion pools (2 vs 4). */
export function getCreatureSummonTier(def: CreatureDefinition): 2 | 4 | undefined {
    if (def.summonTier === 2 || def.summonTier === 4) return def.summonTier
    const L = def.catalogLevel
    if (L === 4 || L === 3) return 4
    if (L === 2 || L === 1) return 2
    return undefined
}

/**
 * Roster slots granted by Summoner: one at Conjurer 3+, plus one per additional Conjurer level.
 * (Slots = conjurerLevel - 2 when level ≥ 3.)
 */
export function getConjurerSummonSlotCount(
    classes: { id: string; level: number }[],
    hasSummonerPassive: boolean
): number {
    if (!hasSummonerPassive) return 0
    const conj = classes.find((c) => c.id === "conjurer")
    if (!conj || conj.level < 3) return 0
    return Math.max(0, conj.level - 2)
}

/**
 * Third conjurer slot (0-based index 2): only this slot may pick tier-4 creatures when Summon Mastery is 2
 * (Great Summoner at class level). Slots 0–1 are tier-2 (rank-1) only.
 */
export const CONJURER_TIER4_SUMMON_SLOT_INDEX = 2

function listConjurerCatalogTemplateIdsWithTier4Gate(
    rules: RulesWithBestiary,
    schoolTag: string,
    summonMastery: number,
    includeTier4Creatures: boolean
): string[] {
    const defs = getCreatureTemplates(rules)
    const tag = schoolTag.trim().toLowerCase()
    if (!tag || summonMastery < 1) return []
    return Object.entries(defs)
        .filter(([, def]) => {
            if (def.role !== "summon" && def.role !== "minion") return false
            const tags = def.tags?.map((x) => x.toLowerCase()) ?? []
            if (!tags.includes(tag)) return false
            const tier = getCreatureSummonTier(def)
            if (tier === 2) return true
            if (tier === 4) return summonMastery >= 2 && includeTier4Creatures
            return false
        })
        .map(([id]) => id)
        .sort()
}

/** Per-slot catalog: slots 1–2 tier 2 only; slot 3 adds tier 4 when Summon Mastery is 2. */
export function listConjurerCatalogTemplateIdsForSlot(
    rules: RulesWithBestiary,
    schoolTag: string,
    summonMastery: number,
    slotIndex: number
): string[] {
    const includeTier4 =
        summonMastery >= 2 && slotIndex === CONJURER_TIER4_SUMMON_SLOT_INDEX
    return listConjurerCatalogTemplateIdsWithTier4Gate(rules, schoolTag, summonMastery, includeTier4)
}

/** Union of template ids usable in any slot at this mastery (tier 4 only if mastery ≥ 2). */
export function listConjurerCatalogTemplateIds(
    rules: RulesWithBestiary,
    schoolTag: string,
    summonMastery: number
): string[] {
    return listConjurerCatalogTemplateIdsWithTier4Gate(rules, schoolTag, summonMastery, summonMastery >= 2)
}

export function defaultRosterRowFromTemplate(
    templateId: string,
    def: CreatureDefinition,
    rosterSource: "conjurer"
): CreatureRosterEntry {
    const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `conjurer-${templateId}-${Date.now()}`
    const base: CreatureRosterEntry = {
        id,
        templateId,
        kind: def.role,
        deployed: false,
        rosterSource,
    }
    return withDefaultSummonPools(base, def)
}

/** Deterministic roster id for Conjurer slot `i` (matches creator `conjurerSummonTemplateIds[i]`). */
export function conjurerSlotRowFromTemplate(
    slotIndex: number,
    templateId: string,
    def: CreatureDefinition
): CreatureRosterEntry {
    const base = defaultRosterRowFromTemplate(templateId, def, "conjurer")
    return { ...base, id: `conjurer-slot-${slotIndex}` }
}

export interface FeatCreatureUnlock {
    featId: string
    templateId: string
}

type FeatDefForCreature = { grantsCreature?: string; grantsCreatureTemplate?: string }

/** Read creature grant from feats for traits with source "feat". */
export function getFeatCreatureUnlocks(
    traits: TraitRef[],
    rules: { system?: Record<string, unknown> }
): FeatCreatureUnlock[] {
    const feats = rules.system?.feats as Record<string, FeatDefForCreature> | undefined
    if (!feats) return []
    const out: FeatCreatureUnlock[] = []
    for (const t of traits) {
        if (t.source !== "feat") continue
        const raw = feats[t.id]
        const templateId = raw?.grantsCreature ?? raw?.grantsCreatureTemplate
        if (typeof templateId === "string" && templateId.length > 0) {
            out.push({ featId: t.id, templateId })
        }
    }
    return out
}

function defaultEntryFromUnlock(unlock: FeatCreatureUnlock, def: CreatureDefinition): CreatureRosterEntry {
    const id = `feat-${unlock.featId}-${unlock.templateId}`
    const base: CreatureRosterEntry = {
        id,
        templateId: unlock.templateId,
        kind: def.role,
        deployed: false,
        unlockFeatId: unlock.featId,
        rosterSource: "feat",
    }
    return withDefaultSummonPools(base, def)
}

function getClassLevel(classes: { id: string; level: number }[], id: string): number {
    return classes.find((c) => c.id === id)?.level ?? 0
}

function characterCanUseMagibike(classes: { id: string; level: number }[]): boolean {
    return getClassLevel(classes, "artificer") >= 1
}

type InventoryRosterSourceItem = { id?: string; uid?: string; name?: string }

function buildMagibikeMountRow(item: { uid: string; id?: string; name?: string }, def: CreatureDefinition): CreatureRosterEntry {
    return withDefaultSummonPools(
        {
            id: `inventory-mount-${item.uid}`,
            templateId: MAGIBIKE_TEMPLATE_ID,
            kind: "summon",
            deployed: false,
            rosterSource: "inventory",
            sourceItemUid: item.uid,
            customName: item.name && item.name !== def.name ? item.name : undefined,
        },
        def
    )
}

function buildDruidAnimaRow(
    slotIndex: number,
    templateId: string,
    def: CreatureDefinition
): CreatureRosterEntry {
    return {
        id: `druid-anima-slot-${slotIndex}`,
        templateId,
        kind: def.role,
        deployed: false,
        rosterSource: DRUID_ANIMA_ROSTER_SOURCE,
    }
}

export type ReconcileCreatureRosterOpts = {
    classes?: { id: string; level: number }[]
    /** Hydrated inventory; inventory-backed mounts disappear when their source item is gone. */
    inventory?: InventoryRosterSourceItem[]
    /** Per-slot template ids from character creator (`""` = unchosen). */
    conjurerSummonTemplateIds?: string[]
    /** Fairy Tamer: contract picks from character creator. */
    fairyTamerContracts?: FairyTamerContractsSave
    /** Rider: chosen mount type from classes.rider.mounts */
    riderMountType?: string | null
    /** Druid Anima: template ids chosen in character creator. */
    druidAnimaTemplateIds?: string[]
}

/**
 * Merge saved roster with feat unlocks: add default rows for missing unlocks.
 * Rows are matched by deterministic `id` from feat + template.
 * Conjurer slots use ids `conjurer-slot-0` … from `conjurerSummonTemplateIds` + class/traits.
 */
export function reconcileCreatureRoster(
    saved: CreatureRosterEntry[] | undefined,
    traits: TraitRef[],
    rules: RulesWithBestiary,
    opts?: ReconcileCreatureRosterOpts
): CreatureRosterEntry[] {
    const templates = getCreatureTemplates(rules)
    const unlocks = getFeatCreatureUnlocks(traits, rules)
    const classes = opts?.classes ?? []
    const prevById = new Map((Array.isArray(saved) ? saved : []).map((c) => [c.id, c]))
    const savedList = (Array.isArray(saved) ? [...saved] : []).filter(
        (c) =>
            c.rosterSource !== "conjurer" &&
            !c.id.startsWith("conjurer-slot-") &&
            c.rosterSource !== "fairyTamer" &&
            !c.id.startsWith("fairy-tamer-slot-") &&
            c.rosterSource !== "rider" &&
            !c.id.startsWith("rider-mount-") &&
            c.rosterSource !== "inventory" &&
            !c.id.startsWith("inventory-mount-") &&
            c.rosterSource !== DRUID_ANIMA_ROSTER_SOURCE &&
            !c.id.startsWith("druid-anima-slot-")
    )
    const byId = new Map(savedList.map((c) => [c.id, c]))

    for (const u of unlocks) {
        const def = templates[u.templateId]
        if (!def) continue
        const id = `feat-${u.featId}-${u.templateId}`
        if (!byId.has(id)) {
            const row = defaultEntryFromUnlock(u, def)
            byId.set(id, row)
            savedList.push(row)
        } else {
            const existing = byId.get(id)!
            if (existing.templateId !== u.templateId) existing.templateId = u.templateId
            if (existing.kind !== def.role) existing.kind = def.role
            if (!existing.unlockFeatId) existing.unlockFeatId = u.featId
            if (!existing.rosterSource) existing.rosterSource = "feat"
        }
    }

    const hasSummoner = characterHasSummonerPassive(traits, classes)
    const school = getConjurerSummonSchoolTag(traits, rules)
    const slots = getConjurerSummonSlotCount(classes, hasSummoner)
    const mastery = getSummonMastery(traits, classes, rules)
    if (school && slots > 0 && mastery >= 1) {
        const picks = opts?.conjurerSummonTemplateIds ?? []
        const usedConjurerTemplates = new Set<string>()
        for (let i = 0; i < slots; i++) {
            const catalog = new Set(listConjurerCatalogTemplateIdsForSlot(rules, school, mastery, i))
            const tid = String(picks[i] ?? "").trim()
            if (!tid || !catalog.has(tid)) continue
            if (usedConjurerTemplates.has(tid)) continue
            usedConjurerTemplates.add(tid)
            const def = templates[tid]
            if (!def) continue
            const id = `conjurer-slot-${i}`
            const fresh = conjurerSlotRowFromTemplate(i, tid, def)
            const prev = prevById.get(id)
            if (prev && prev.templateId === tid) {
                fresh.currentHp = prev.currentHp ?? fresh.currentHp
                fresh.currentMp = prev.currentMp ?? fresh.currentMp
                fresh.maxHp = prev.maxHp ?? fresh.maxHp
                fresh.maxMp = prev.maxMp ?? fresh.maxMp
                fresh.customName = prev.customName
                fresh.notes = prev.notes
                fresh.deployed = prev.deployed
            }
            const existingIdx = savedList.findIndex((c) => c.id === id)
            if (existingIdx >= 0) {
                savedList[existingIdx] = fresh
            } else {
                savedList.push(fresh)
            }
        }
    }

    const ftLevel = getFairytamerLevel(classes)
    const fairyContracts = opts?.fairyTamerContracts ?? emptyFairyTamerContracts()
    if (characterHasFairyContract(traits) && ftLevel >= 1) {
        const addSlot = (slotIndex: 0 | 1 | 2 | 3, slotSave: { templateId: string; actionCardIds: string[] }) => {
            const tid = String(slotSave.templateId ?? "").trim()
            if (!tid) return
            const def = templates[tid]
            if (!def || def.role !== "assistant") return
            const id = `fairy-tamer-slot-${slotIndex}`
            const fresh: CreatureRosterEntry = {
                id,
                templateId: tid,
                kind: "assistant",
                deployed: false,
                rosterSource: "fairyTamer",
                pickedActionCardIds: [...new Set(slotSave.actionCardIds.map((x) => String(x).trim()).filter(Boolean))],
            }
            const prev = prevById.get(id)
            if (prev) {
                fresh.deployed = prev.deployed
                fresh.customName = prev.customName
                fresh.notes = prev.notes
            }
            const existingIdx = savedList.findIndex((c) => c.id === id)
            if (existingIdx >= 0) savedList[existingIdx] = fresh
            else savedList.push(fresh)
        }
        if (fairyContracts.slot0) addSlot(0, fairyContracts.slot0)
        if (ftLevel >= 2 && fairyContracts.slot1) addSlot(1, fairyContracts.slot1)
        if (ftLevel >= 3 && fairyContracts.slot2) addSlot(2, fairyContracts.slot2)
        if (
            ftLevel >= 5 &&
            fairyContracts.level5Mode === "fourthLesser" &&
            fairyContracts.slot3
        ) {
            addSlot(3, fairyContracts.slot3)
        }
    }

    const animaSlots = getDruidAnimaSlots(classes, traits)
    if (animaSlots.length > 0) {
        const selectedAnima = sanitizeDruidAnimaTemplateIds(
            opts?.druidAnimaTemplateIds,
            animaSlots,
            templates
        )
        for (const slot of animaSlots) {
            const tid = String(selectedAnima[slot.slotIndex] ?? "").trim()
            if (!tid) continue
            const def = templates[tid]
            if (!def) continue
            const id = `druid-anima-slot-${slot.slotIndex}`
            const fresh = buildDruidAnimaRow(slot.slotIndex, tid, def)
            const prev = prevById.get(id)
            if (prev && prev.templateId === tid) {
                fresh.customName = prev.customName
                fresh.notes = prev.notes
            }
            const existingIdx = savedList.findIndex((c) => c.id === id)
            if (existingIdx >= 0) savedList[existingIdx] = fresh
            else savedList.push(fresh)
        }
    }

    const riderMountType = opts?.riderMountType ?? null
    if (riderHasFaithfulSteed(traits, classes)) {
        const templateId = getRiderMountTemplateId(riderMountType)
        if (templateId) {
            const def = templates[templateId]
            if (def) {
                const id = "rider-mount-0"
                const fresh = buildRiderMountRow(templateId, def)
                const prev = prevById.get(id)
                if (prev && prev.templateId === templateId) {
                    fresh.currentHp = prev.currentHp ?? fresh.currentHp
                    fresh.currentMp = prev.currentMp ?? fresh.currentMp
                    fresh.maxHp = prev.maxHp ?? fresh.maxHp
                    fresh.maxMp = prev.maxMp ?? fresh.maxMp
                    fresh.customName = prev.customName
                    fresh.notes = prev.notes
                    fresh.deployed = prev.deployed
                }
                const existingIdx = savedList.findIndex((c) => c.id === id)
                if (existingIdx >= 0) savedList[existingIdx] = fresh
                else savedList.push(fresh)
            }
        }
    }

    if (characterCanUseMagibike(classes)) {
        const def = templates[MAGIBIKE_TEMPLATE_ID]
        const inventory = opts?.inventory ?? []
        if (def) {
            for (const item of inventory) {
                const uid = typeof item.uid === "string" ? item.uid.trim() : ""
                if (item.id !== MAGIBIKE_ITEM_ID || !uid) continue
                const fresh = buildMagibikeMountRow({ ...item, uid }, def)
                const prev = prevById.get(fresh.id)
                if (prev && prev.templateId === fresh.templateId) {
                    fresh.currentHp = prev.currentHp ?? fresh.currentHp
                    fresh.currentMp = prev.currentMp ?? fresh.currentMp
                    fresh.maxHp = prev.maxHp ?? fresh.maxHp
                    fresh.maxMp = prev.maxMp ?? fresh.maxMp
                    fresh.customName = prev.customName ?? fresh.customName
                    fresh.notes = prev.notes
                    fresh.deployed = prev.deployed
                }
                const existingIdx = savedList.findIndex((c) => c.id === fresh.id)
                if (existingIdx >= 0) savedList[existingIdx] = fresh
                else savedList.push(fresh)
            }
        }
    }

    return savedList.map((e) => normalizeSummonPools(e, templates))
}

export const MAX_DEPLOYED_ASSISTANTS = 2

/** Deploy cap: feat-based assistants and minions (not Conjurer roster rows). */
export function countDeployedFeatAssistantsAndMinions(entries: CreatureRosterEntry[]): number {
    return entries.filter(
        (c) =>
            c.deployed &&
            (c.kind === "assistant" || c.kind === "minion") &&
            !isConjurerRosterEntry(c) &&
            !isFairyTamerRosterEntry(c)
    ).length
}

/** Feat companions only; conjurer minions are counted in {@link countDeployedConjurerMinions}. */
export function countDeployedAssistants(entries: CreatureRosterEntry[]): number {
    return countDeployedFeatAssistantsAndMinions(entries)
}

export function countDeployedSummons(entries: CreatureRosterEntry[]): number {
    return entries.filter((c) => c.kind === "summon" && c.deployed && !isDruidAnimaRosterEntry(c)).length
}

export function countDeployedConjurerMinions(entries: CreatureRosterEntry[]): number {
    return entries.filter((c) => isConjurerRosterEntry(c) && c.kind === "minion" && c.deployed).length
}

export function countDeployedConjurerSummons(entries: CreatureRosterEntry[]): number {
    return entries.filter((c) => isConjurerRosterEntry(c) && c.kind === "summon" && c.deployed).length
}

/** 0 or 1: whether the Summoner “one summon or minion group” slot is in use (conjurer roster only). */
export function getConjurerSummonOrMinionDeploySlotUsed(entries: CreatureRosterEntry[]): number {
    return countDeployedConjurerSummons(entries) > 0 || countDeployedConjurerMinions(entries) > 0 ? 1 : 0
}

/** Whether deploying `entry` would violate feat companion, conjurer minion, or summon caps. */
export function isCreatureDeployBlocked(
    entry: CreatureRosterEntry,
    allEntries: CreatureRosterEntry[],
    maxConjurerMinions: number
): boolean {
    if (entry.deployed) return false
    if (isDruidAnimaRosterEntry(entry)) return true
    const rest = allEntries.filter((c) => c.id !== entry.id)

    if (entry.kind === "summon") {
        if (countDeployedSummons(rest) >= MAX_DEPLOYED_SUMMONS) return true
        if (countDeployedConjurerMinions(rest) > 0) return true
        return false
    }

    if (isAssistantOrMinionKind(entry.kind)) {
        if (isConjurerRosterEntry(entry) && entry.kind === "minion") {
            if (countDeployedConjurerMinions(rest) >= maxConjurerMinions) return true
            if (countDeployedSummons(rest) > 0) return true
            return false
        }
        if (isFairyTamerRosterEntry(entry)) return false
        return countDeployedFeatAssistantsAndMinions(rest) >= MAX_DEPLOYED_ASSISTANTS
    }

    return false
}

export function isAssistantOrMinionKind(kind: CreatureKind): boolean {
    return kind === "assistant" || kind === "minion"
}

/**
 * Action card ids for a roster entry.
 * - Rider mounts: no default action cards; their signature actions are Rider class XP picks.
 * - Other summons: always all `actionIDs` from the creature definition (feat picks ignored).
 * - Assistants / minions: feat `GrantActionCard` selections when present; else template `actionIDs`.
 */
export function getActionCardIdsForCreatureEntry(
    entry: CreatureRosterEntry,
    traits: TraitRef[],
    rules: RulesWithBestiary
): string[] {
    const templates = getCreatureTemplates(rules)
    const tmpl = templates[entry.templateId]
    const fromTemplate = [...(tmpl?.actionIDs ?? [])]

    if (isDruidAnimaRosterEntry(entry)) {
        return []
    }

    if (isRiderRosterEntry(entry)) {
        return []
    }

    if (tmpl?.role === "summon") {
        return [...new Set(fromTemplate)]
    }

    if (isFairyTamerRosterEntry(entry)) {
        const picked = [...(entry.pickedActionCardIds ?? [])].map((x) => String(x).trim()).filter(Boolean)
        if (picked.length > 0) return [...new Set(picked)]
        return []
    }

    if (entry.unlockFeatId) {
        const t = traits.find((tr) => tr.id === entry.unlockFeatId && tr.source === "feat")
        const feats = rules.system?.feats as
            | Record<string, { effects?: Array<{ type?: string; value?: string }>; selectAmount?: number }>
            | undefined
        const featDef = feats?.[entry.unlockFeatId]
        if (t && featDef?.effects && Array.isArray(featDef.effects) && Array.isArray(t.selectedEffectIndices)) {
            const picked = t.selectedEffectIndices
                .filter((i) => Number.isInteger(i) && i >= 0 && i < featDef.effects!.length)
                .map((i) => {
                    const eff = featDef.effects![i]
                    return eff?.type === "GrantActionCard" ? String(eff.value ?? "").trim() : ""
                })
                .filter(Boolean)
            if (picked.length > 0) return [...new Set(picked)]
        }
    }

    return [...new Set(fromTemplate)]
}

type RulesWithCards = RulesWithBestiary & { actionCards?: Record<string, { type?: string }> }

/** Action-card refs for the Actions panel only (excludes reactions / freeReactions such as Protect). */
export function getDeployedCreatureActionRefs(
    raw: { creatures?: CreatureRosterEntry[]; traits?: TraitRef[] } | null | undefined,
    rules: RulesWithCards
): { id: string }[] {
    const cards = rules.actionCards ?? {}
    const creatures = raw?.creatures ?? []
    const traits = raw?.traits ?? []
    const ids: string[] = []
    for (const c of creatures) {
        if (!c.deployed) continue
        for (const aid of getActionCardIdsForCreatureEntry(c, traits, rules)) {
            if ((cards[aid]?.type ?? "action") !== "action") continue
            ids.push(aid)
        }
    }
    return [...new Set(ids)].map((id) => ({ id }))
}

export function getActiveDruidAnimaActionRefs(
    raw:
        | {
              activeDruidAnimaTemplateId?: string | null
              druidAnimaTemplateIds?: string[]
              classes?: { id: string; level: number }[]
              traits?: TraitRef[]
          }
        | null
        | undefined,
    rules: RulesWithCards
): { id: string }[] {
    const activeId = String(raw?.activeDruidAnimaTemplateId ?? "").trim()
    if (!activeId) return []
    const templates = getCreatureTemplates(rules)
    const slots = getDruidAnimaSlots(raw?.classes ?? [], raw?.traits ?? [])
    const selected = new Set(getSelectedDruidAnimaTemplateIds(raw?.druidAnimaTemplateIds, slots, templates))
    if (!selected.has(activeId)) return []
    return getDruidAnimaActionCardIds(templates[activeId]).map((id) => ({ id }))
}

/**
 * When a deployed creature grants a reaction (or freeReaction), inject a reaction ref so it appears in the Reactions UI.
 * Skips ids already present on the character save.
 */
export function getInjectedCompanionReactionRefs(
    raw: { creatures?: CreatureRosterEntry[]; traits?: TraitRef[]; reactions?: ReactionRef[] } | null | undefined,
    rules: RulesWithCards & { actionCards?: Record<string, { type?: string; fixedMaxCharges?: number }> }
): ReactionRef[] {
    const cards = rules.actionCards ?? {}
    const existing = new Set((raw?.reactions ?? []).map((r) => r.id))
    const out: ReactionRef[] = []
    const creatures = raw?.creatures ?? []
    const traits = raw?.traits ?? []

    for (const c of creatures) {
        if (!c.deployed) continue
        for (const aid of getActionCardIdsForCreatureEntry(c, traits, rules)) {
            const t = cards[aid]?.type
            if (t !== "reaction" && t !== "freeReaction") continue
            if (existing.has(aid)) continue
            existing.add(aid)
            const fixed = cards[aid]?.fixedMaxCharges
            const charges =
                typeof fixed === "number" && Number.isFinite(fixed) ? Math.max(0, Math.floor(fixed)) : -1
            out.push({ id: aid, slotIndex: -1, charges })
        }
    }
    return out
}
