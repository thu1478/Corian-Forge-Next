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
        for (const [skillId, skill] of Object.entries(skillsCatalog)) {
            for (const c of skill.categories ?? []) {
                if (categoryMatches(c, bucket)) {
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
