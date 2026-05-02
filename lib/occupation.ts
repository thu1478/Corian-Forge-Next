/**
 * Occupation rules live under `rules.system.occupation` (see rules.json).
 * Each occupation defines how many skills/languages you pick and which skill IDs or categories unlock.
 */

export type OccupationRule = {
    name: string
    description?: string
    /** How many occupation skill picks (same expertise rules as culture). */
    skillsCount?: number
    /** Category ids and/or direct skill catalog keys that unlock pickable skills. */
    skillCategories: string[]
    /** How many languages to pick in addition to Common (Common is always granted). */
    languages?: number
    /** Extra skill catalog keys always pickable (in addition to category matches). */
    unlockSkillIds?: string[]
    /** Extra category tags that unlock skills the same way as `skillCategories`. */
    unlockCategories?: string[]
}

function categoryMatches(skillCat: string, bucket: string): boolean {
    if (skillCat === bucket) return true
    if (skillCat === "intepersonal" && bucket === "interpersonal") return true
    if (skillCat === "interpersonal" && bucket === "intepersonal") return true
    return false
}

/** Normalize a category string from rules or skill data for comparison. */
export function normalizeSkillCategoryId(raw: string): string {
    const spaced = raw
        .trim()
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase()
    if (spaced === "intepersonal") return "interpersonal"
    return spaced
}

/** Same heading style as the character sheet skills panel section titles. */
export function skillCategorySectionLabel(categoryId: string): string {
    return categoryId
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
}

export function getOccupationDefinition(
    occupationRoot: Record<string, OccupationRule> | undefined,
    id: string | null
): OccupationRule | null {
    if (!id || !occupationRoot?.[id]) return null
    return occupationRoot[id]
}

/**
 * Skill ids the player may choose for this occupation: direct keys, `unlockSkillIds`,
 * and any skill whose `categories` intersect `skillCategories` ∪ `unlockCategories`.
 */
export function collectUnlockedSkillIdsForOccupation(
    def: OccupationRule | null,
    skillsCatalog: Record<string, { categories?: string[] }>
): Set<string> {
    if (!def) return new Set()
    const ids = new Set<string>()
    const buckets = [...(def.skillCategories ?? []), ...(def.unlockCategories ?? [])]
    for (const sid of def.unlockSkillIds ?? []) {
        if (skillsCatalog[sid]) ids.add(sid)
    }
    for (const bucket of buckets) {
        if (skillsCatalog[bucket]) {
            ids.add(bucket)
            continue
        }
        const bucketKey = normalizeSkillCategoryId(bucket)
        for (const [skillId, skill] of Object.entries(skillsCatalog)) {
            for (const c of skill.categories ?? []) {
                const ck = normalizeSkillCategoryId(c)
                if (categoryMatches(ck, bucketKey) || ck === bucketKey) {
                    ids.add(skillId)
                    break
                }
            }
        }
    }
    return ids
}

export function resolveOccupationSkillsCount(def: OccupationRule | null): number {
    if (def && typeof def.skillsCount === "number" && Number.isFinite(def.skillsCount) && def.skillsCount >= 0) {
        return Math.floor(def.skillsCount)
    }
    return 2
}

export function resolveOccupationLanguagePicks(def: OccupationRule | null): number {
    if (def && typeof def.languages === "number" && Number.isFinite(def.languages) && def.languages >= 0) {
        return Math.floor(def.languages)
    }
    return 1
}

/** Core skill category ids + every category tag used on a skill in the catalog. */
function buildKnownSkillCategoryIdSet(skillsCatalog: Record<string, { categories?: string[] }>): Set<string> {
    const s = new Set<string>(["crafting", "exploration", "interpersonal", "intrigue", "lore"])
    for (const sk of Object.values(skillsCatalog)) {
        for (const c of sk.categories ?? []) {
            const k = normalizeSkillCategoryId(c)
            if (k) s.add(k)
        }
    }
    return s
}

function formatBucketAsSpecificLabel(bucket: string): string {
    return skillCategorySectionLabel(normalizeSkillCategoryId(bucket))
}

export type SkillSourceChip =
    | { kind: "category"; label: string }
    | { kind: "specific"; label: string }

/** @deprecated use SkillSourceChip */
export type OccupationSourceChip = SkillSourceChip

/** Shared chip styles for culture & occupation cards (categories = emerald, specifics = muted). */
export function skillSourceChipClassName(kind: "category" | "specific"): string {
    const base = "text-xs font-semibold px-2 py-1 rounded border "
    if (kind === "category") {
        return (
            base +
            "border-emerald-500/70 bg-emerald-100 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-50"
        )
    }
    return base + "border-border bg-muted text-foreground dark:bg-muted/50 dark:text-foreground"
}

/**
 * Ordered chips: **skill categories first**, then **specific skills** (same rules as occupation).
 * Used for culture environment/organization/upbringing cards (`skillCategories` only) and occupations.
 */
export function getSkillSourceChips(
    buckets: string[],
    skillsCatalog: Record<string, { name?: string; categories?: string[] }>,
    unlockSkillIds?: string[]
): SkillSourceChip[] {
    const categoryIdSet = buildKnownSkillCategoryIdSet(skillsCatalog)
    const categoryLabels: string[] = []
    const specificLabels: string[] = []
    const seenCat = new Set<string>()
    const seenSpec = new Set<string>()

    const pushCategory = (raw: string) => {
        const k = normalizeSkillCategoryId(raw)
        if (!k || !categoryIdSet.has(k)) return
        const label = skillCategorySectionLabel(k)
        const dedupe = k
        if (seenCat.has(dedupe)) return
        seenCat.add(dedupe)
        categoryLabels.push(label)
    }
    const pushSpecific = (label: string) => {
        const t = label.trim()
        if (!t) return
        const dedupe = t.toLowerCase()
        if (seenSpec.has(dedupe)) return
        seenSpec.add(dedupe)
        specificLabels.push(t)
    }

    const list = [...buckets]

    for (const raw of list) {
        const b = raw?.trim()
        if (!b || skillsCatalog[b]) continue
        const k = normalizeSkillCategoryId(b)
        if (categoryIdSet.has(k)) pushCategory(b)
    }

    for (const raw of list) {
        const b = raw?.trim()
        if (!b) continue
        if (skillsCatalog[b]) {
            pushSpecific(skillsCatalog[b].name ?? b)
            continue
        }
        const k = normalizeSkillCategoryId(b)
        if (categoryIdSet.has(k)) continue
        pushSpecific(formatBucketAsSpecificLabel(b))
    }

    for (const id of unlockSkillIds ?? []) {
        if (skillsCatalog[id]) {
            pushSpecific(skillsCatalog[id].name ?? id)
        } else {
            pushSpecific(formatBucketAsSpecificLabel(id))
        }
    }

    return [
        ...categoryLabels.map((label) => ({ kind: "category" as const, label })),
        ...specificLabels.map((label) => ({ kind: "specific" as const, label })),
    ]
}

/** Culture card: `skillCategories` only. */
export function getCultureSourceChips(
    skillCategories: string[],
    skillsCatalog: Record<string, { name?: string; categories?: string[] }>
): SkillSourceChip[] {
    return getSkillSourceChips(skillCategories ?? [], skillsCatalog, undefined)
}

/**
 * Occupation card: `skillCategories` ∪ `unlockCategories`, then `unlockSkillIds`.
 */
export function getOccupationSourceChips(
    occ: OccupationRule,
    skillsCatalog: Record<string, { name?: string; categories?: string[] }>
): SkillSourceChip[] {
    const buckets = [...(occ.skillCategories ?? []), ...(occ.unlockCategories ?? [])]
    return getSkillSourceChips(buckets, skillsCatalog, occ.unlockSkillIds)
}
