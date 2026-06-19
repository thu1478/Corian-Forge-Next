import type { SkillChooserRequirement } from "@/logic/traits/grant-skill-effects"

export type ClassOptionPick = {
    id: string
    source: string
    selectedEffectIndices?: number[]
    /** Fairy contract spell: counts as a Fairy Tamer class XP pick (same budget as other class talents). */
    fairySpellSlot?: 0 | 1 | 2 | 3
}

export function toggleInventionModulePick(
    current: string[] | undefined,
    moduleId: string,
    max: number
): string[] {
    const list = [...(current ?? [])]
    const idx = list.indexOf(moduleId)
    if (idx >= 0) {
        list.splice(idx, 1)
        return list
    }
    if (list.length >= max) return list
    return [...list, moduleId]
}

export function passiveNeedsEffectChoice(
    passiveDef: { selectAmount?: number; effects?: unknown[] } | null | undefined
) {
    const n = passiveDef?.selectAmount
    return (
        typeof n === "number" &&
        n > 0 &&
        Array.isArray(passiveDef?.effects) &&
        passiveDef!.effects!.length > n
    )
}

/** True if `templateId` is chosen on a conjurer slot other than `slotIndex`. */
export function isConjurerSummonTakenOnOtherSlot(
    picks: string[] | undefined,
    slotIndex: number,
    templateId: string
): boolean {
    const tid = templateId.trim()
    if (!tid) return false
    return (picks ?? []).some((raw, j) => j !== slotIndex && String(raw ?? "").trim() === tid)
}

export function skillGrantRequirementsForClass(
    classId: string,
    requirements: SkillChooserRequirement[]
): SkillChooserRequirement[] {
    const passivePrefix = `classPassive::${classId}::`
    const trainingPrefix = `classTraining::${classId}::`
    return requirements.filter(
        (r) => r.key.startsWith(passivePrefix) || r.key.startsWith(trainingPrefix)
    )
}
