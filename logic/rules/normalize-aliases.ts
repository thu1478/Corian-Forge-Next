/** Normalize legacy `rules.json` / class-rule alias shapes to canonical fields. */

export type ClassBonusLike = {
    stat?: string
    amount?: number
    frequency?: number
    once?: boolean
}

export type ClassRuleAliasSource = {
    statBonus?: ClassBonusLike
    statBonuses?: ClassBonusLike[]
    skillTraining?: Record<string, unknown>
    skillTrainings?: Record<string, unknown>[]
}

/** Canonical class stat bonus rows (prefers `statBonuses`, falls back to `statBonus`). */
export function normalizeClassStatBonuses(classRule: ClassRuleAliasSource | null | undefined): ClassBonusLike[] {
    if (!classRule) return []
    if (Array.isArray(classRule.statBonuses) && classRule.statBonuses.length > 0) {
        return classRule.statBonuses
    }
    const single = classRule.statBonus
    if (single && typeof single === "object") return [single]
    return []
}

/** Canonical skill training rows (prefers `skillTrainings`, falls back to `skillTraining`). */
export function normalizeClassSkillTrainings(
    classRule: ClassRuleAliasSource | null | undefined
): Record<string, unknown>[] {
    if (!classRule) return []
    const trainings = (classRule as { skillTrainings?: unknown }).skillTrainings
    if (Array.isArray(trainings) && trainings.length > 0) {
        return trainings.filter((t): t is Record<string, unknown> => t != null && typeof t === "object")
    }
    const single = (classRule as { skillTraining?: unknown }).skillTraining
    if (single && typeof single === "object") return [single as Record<string, unknown>]
    return []
}

/** Creature template trait id list (`traitRefs` canonical; `traits` legacy). */
export function normalizeCreatureTraitRefs(creature: {
    traitRefs?: unknown
    traits?: unknown
} | null | undefined): string[] {
    if (!creature) return []
    const refs = creature.traitRefs
    if (Array.isArray(refs)) {
        return refs.map((x) => String(x).trim()).filter(Boolean)
    }
    const legacy = creature.traits
    if (Array.isArray(legacy)) {
        return legacy.map((x) => String(x).trim()).filter(Boolean)
    }
    return []
}

/** Mutate a class rule object to canonical keys. Returns true when changed. */
export function migrateClassRuleAliases(classRule: Record<string, unknown>): boolean {
    let changed = false
    if (classRule.statBonus != null && classRule.statBonuses == null) {
        classRule.statBonuses = [classRule.statBonus]
        delete classRule.statBonus
        changed = true
    }
    if (classRule.skillTraining != null && classRule.skillTrainings == null) {
        classRule.skillTrainings = [classRule.skillTraining]
        delete classRule.skillTraining
        changed = true
    }
    return changed
}

/** Mutate a creature template: `traits` string[] → `traitRefs`. Returns true when changed. */
export function migrateCreatureTemplateTraitAliases(creature: Record<string, unknown>): boolean {
    const legacy = creature.traits
    if (!Array.isArray(legacy) || creature.traitRefs != null) return false
    const ids = legacy.map((x) => String(x).trim()).filter(Boolean)
    if (ids.length === 0) {
        delete creature.traits
        return true
    }
    creature.traitRefs = ids
    delete creature.traits
    return true
}
