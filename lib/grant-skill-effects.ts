import type { FeatLevelPick } from "@/lib/baseRefs"
import type { CharacterClass, GrantSkillEffect, TraitEffect } from "@/lib/rules"
import {
    classSkillTrainingEntries,
    countClassSkillTrainingApplications,
    type ClassSkillTrainingRule,
} from "@/lib/character-data"
import { collectUnlockedSkillIdsForOccupation, type OccupationRule } from "@/lib/occupation"
import { resolveTraitEffectsAfterSelection } from "@/lib/trait-selection"

export type SkillChooserRequirement = {
    key: string
    label: string
    pickCount: number
    distinctPicks: boolean
    candidates: Set<string>
}

export function isGrantSkillEffect(e: TraitEffect): e is GrantSkillEffect {
    return e.type === "GrantSkill"
}

function grantToOccupationRule(e: GrantSkillEffect): OccupationRule {
    return {
        name: "",
        skillCategories: [...(e.skillBuckets ?? [])],
        unlockSkillIds: e.unlockSkillIds,
        unlockCategories: e.unlockCategories,
    }
}

/** Pickable ids for a GrantSkill row; empty buckets/unlocks ⇒ whole catalog. */
export function candidatesForGrantSkill(
    effect: GrantSkillEffect,
    skillsCatalog: Record<string, { categories?: string[] }>
): Set<string> {
    const bucketsLen = effect.skillBuckets?.length ?? 0
    const unlockLen = (effect.unlockSkillIds?.length ?? 0) + (effect.unlockCategories?.length ?? 0)
    if (bucketsLen === 0 && unlockLen === 0) {
        return new Set(Object.keys(skillsCatalog))
    }
    return collectUnlockedSkillIdsForOccupation(grantToOccupationRule(effect), skillsCatalog)
}

function distinctDefault(effect: GrantSkillEffect, pickCount: number): boolean {
    if (typeof effect.distinctPicks === "boolean") return effect.distinctPicks
    return pickCount > 1
}

function pushGrantSkillChoosersFromResolved(
    resolved: TraitEffect[] | undefined,
    keyPrefix: string,
    labelPrefix: string,
    out: SkillChooserRequirement[],
    skillsCatalog: Record<string, { categories?: string[] }>
) {
    if (!resolved?.length) return
    resolved.forEach((eff, i) => {
        if (!isGrantSkillEffect(eff)) return
        const sid = typeof eff.skillId === "string" ? eff.skillId.trim() : ""
        if (sid) return
        const pc = Math.max(0, Math.floor(Number(eff.pickCount) || 0))
        if (pc < 1) return
        out.push({
            key: `${keyPrefix}::${i}`,
            label: labelPrefix,
            pickCount: pc,
            distinctPicks: distinctDefault(eff, pc),
            candidates: candidatesForGrantSkill(eff, skillsCatalog),
        })
    })
}

function collectAutoSkillIdsFromResolved(resolved: TraitEffect[] | undefined, out: string[]) {
    if (!resolved?.length) return
    for (const eff of resolved) {
        if (!isGrantSkillEffect(eff)) continue
        const sid = typeof eff.skillId === "string" ? eff.skillId.trim() : ""
        if (sid && out.indexOf(sid) < 0) out.push(sid)
    }
}

function trainingRuleToOccupationRule(rule: ClassSkillTrainingRule): OccupationRule {
    return {
        name: "",
        skillCategories: [...(rule.skillBuckets ?? [])],
        unlockSkillIds: rule.unlockSkillIds,
        unlockCategories: rule.unlockCategories,
    }
}

function candidatesForTrainingRule(
    rule: ClassSkillTrainingRule,
    skillsCatalog: Record<string, { categories?: string[] }>
): Set<string> {
    const bucketsLen = rule.skillBuckets?.length ?? 0
    const unlockLen = (rule.unlockSkillIds?.length ?? 0) + (rule.unlockCategories?.length ?? 0)
    if (bucketsLen === 0 && unlockLen === 0) {
        return new Set(Object.keys(skillsCatalog))
    }
    return collectUnlockedSkillIdsForOccupation(trainingRuleToOccupationRule(rule), skillsCatalog)
}

export type ListSkillGrantsContext = {
    classes: CharacterClass[]
    /** Class talent picks (passives, actions, …). */
    classSelections: { id: string; source: string; selectedEffectIndices?: number[] }[]
    /** Racial trait refs (non-innate selected). */
    racialTraitRefs: { id: string; source: string; selectedEffectIndices?: number[] }[]
    raceKey: string | null
    selectedFeats: Partial<Record<number, FeatLevelPick>>
    rules: { classes?: Record<string, any>; system?: { feats?: Record<string, any> }; races?: Record<string, any> }
}

/**
 * Every active skill chooser (player must fill `pickCount` ids per key).
 * Keys are stable for `creatorSkillGrantPicks`.
 */
export function listSkillChooserRequirements(ctx: ListSkillGrantsContext): SkillChooserRequirement[] {
    const skillsCatalog = (ctx.rules as { system?: { skills?: Record<string, { categories?: string[] }> } }).system
        ?.skills ?? {}
    const out: SkillChooserRequirement[] = []

    for (const pick of ctx.classSelections) {
        const classData = ctx.rules.classes?.[pick.source]
        const passive = classData?.passives?.[pick.id]
        if (!passive) continue
        const clsLevel = ctx.classes.find((c) => c.id === pick.source)?.level ?? 0
        const minL = Math.max(1, Math.floor(Number(passive.minLevel) || 1))
        if (clsLevel < minL) continue
        const resolved = resolveTraitEffectsAfterSelection(passive, pick.selectedEffectIndices)
        const label = `${classData?.name ?? pick.source} — ${passive.name ?? pick.id}`
        pushGrantSkillChoosersFromResolved(
            resolved,
            `classPassive::${pick.source}::${pick.id}`,
            label,
            out,
            skillsCatalog
        )
    }

    for (const cls of ctx.classes) {
        if (cls.level < 1) continue
        const classData = ctx.rules.classes?.[cls.id]
        const entries = classSkillTrainingEntries(classData)
        entries.forEach((rule, ruleIdx) => {
            const apps = countClassSkillTrainingApplications(cls.level, rule)
            const total = apps * Math.max(1, Math.floor(Number(rule.pickCount) || 0))
            if (total < 1) return
            out.push({
                key: `classTraining::${cls.id}::${ruleIdx}`,
                label: `${classData?.name ?? cls.id} — bonus training`,
                pickCount: total,
                distinctPicks: total > 1,
                candidates: candidatesForTrainingRule(rule, skillsCatalog),
            })
        })
    }

    const feats = ctx.rules.system?.feats ?? {}
    for (const [lvlStr, featPick] of Object.entries(ctx.selectedFeats)) {
        if (!featPick?.id) continue
        const feat = feats[featPick.id]
        if (!feat) continue
        const resolved = resolveTraitEffectsAfterSelection(feat, featPick.selectedEffectIndices)
        const label = `Feat (Lv ${lvlStr}) — ${feat.name ?? featPick.id}`
        pushGrantSkillChoosersFromResolved(
            resolved,
            `feat::${lvlStr}::${featPick.id}`,
            label,
            out,
            skillsCatalog
        )
    }

    if (ctx.raceKey) {
        const raceDef = ctx.rules.races?.[ctx.raceKey] ?? ctx.rules.races?.[ctx.raceKey.toLowerCase?.() ?? ""]
        const passives = raceDef?.passives as Record<string, any> | undefined
        if (passives) {
            for (const ref of ctx.racialTraitRefs) {
                const passive = passives[ref.id]
                if (!passive) continue
                const resolved = resolveTraitEffectsAfterSelection(passive, ref.selectedEffectIndices)
                const label = `${raceDef?.name ?? ctx.raceKey} — ${passive.name ?? ref.id}`
                pushGrantSkillChoosersFromResolved(
                    resolved,
                    `racial::${ref.id}`,
                    label,
                    out,
                    skillsCatalog
                )
            }
        }
    }

    out.sort((a, b) => a.key.localeCompare(b.key, undefined, { sensitivity: "base" }))
    return out
}

/** Fixed `skillId` grants from the same rules surface (merge into character skills as trained, no picker). */
export function listAutoGrantedSkillIds(ctx: ListSkillGrantsContext): string[] {
    const skillsCatalog = (ctx.rules as { system?: { skills?: Record<string, unknown> } }).system?.skills ?? {}
    const catalogKeys = new Set(Object.keys(skillsCatalog))
    const acc: string[] = []

    for (const pick of ctx.classSelections) {
        const classData = ctx.rules.classes?.[pick.source]
        const passive = classData?.passives?.[pick.id]
        if (!passive) continue
        const clsLevel = ctx.classes.find((c) => c.id === pick.source)?.level ?? 0
        const minL = Math.max(1, Math.floor(Number(passive.minLevel) || 1))
        if (clsLevel < minL) continue
        const resolved = resolveTraitEffectsAfterSelection(passive, pick.selectedEffectIndices)
        collectAutoSkillIdsFromResolved(resolved, acc)
    }

    const feats = ctx.rules.system?.feats ?? {}
    for (const [, featPick] of Object.entries(ctx.selectedFeats)) {
        if (!featPick?.id) continue
        const feat = feats[featPick.id]
        if (!feat) continue
        const resolved = resolveTraitEffectsAfterSelection(feat, featPick.selectedEffectIndices)
        collectAutoSkillIdsFromResolved(resolved, acc)
    }

    if (ctx.raceKey) {
        const raceDef = ctx.rules.races?.[ctx.raceKey] ?? ctx.rules.races?.[ctx.raceKey.toLowerCase?.() ?? ""]
        const passives = raceDef?.passives as Record<string, any> | undefined
        if (passives) {
            for (const ref of ctx.racialTraitRefs) {
                const passive = passives[ref.id]
                if (!passive) continue
                const resolved = resolveTraitEffectsAfterSelection(passive, ref.selectedEffectIndices)
                collectAutoSkillIdsFromResolved(resolved, acc)
            }
        }
    }

    return acc.filter((id) => catalogKeys.has(id))
}

export function allSkillChooserPicksComplete(
    requirements: SkillChooserRequirement[],
    picks: Record<string, string[] | undefined>
): boolean {
    for (const r of requirements) {
        const row = picks[r.key] ?? []
        if (row.length !== r.pickCount) return false
        if (r.distinctPicks && new Set(row).size !== row.length) return false
        for (const id of row) {
            if (!id || !r.candidates.has(id)) return false
        }
    }
    return true
}

export function pruneSkillGrantPicks(
    picks: Record<string, string[]>,
    validKeys: ReadonlySet<string>
): Record<string, string[]> {
    const next: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(picks)) {
        if (!validKeys.has(k)) continue
        if (Array.isArray(v)) next[k] = v
    }
    return next
}

export function requirementKeys(requirements: SkillChooserRequirement[]): Set<string> {
    return new Set(requirements.map((r) => r.key))
}

export function isClassStepSkillRequirementKey(key: string): boolean {
    return key.startsWith("classPassive::") || key.startsWith("classTraining::")
}

export function isFeatStepSkillRequirementKey(key: string): boolean {
    return key.startsWith("feat::") || key.startsWith("racial::")
}
