/** Priest deity helpers — re-exported from shared class-options. */

import {
    CLASS_OPTION_CONFIGS,
    getClassOptionPassiveEntries,
    resolveClassOptionPlaceholderPassive,
    type ClassOptionPassiveEntry,
} from "@/logic/classes/class-options"

export type DeityPassiveEntry = ClassOptionPassiveEntry

const PRIEST = CLASS_OPTION_CONFIGS.priest

export function getDeityPassiveEntries(
    rulesData: { classes?: Record<string, unknown> },
    deityId: string | null | undefined
): DeityPassiveEntry[] {
    return getClassOptionPassiveEntries(rulesData, PRIEST.classId, PRIEST.optionsKey, deityId)
}

/** Merge Deity Boon class passive with the chosen deity's passive text (creator / sheet). */
export function resolveDeityBoonDisplay(
    rulesData: { classes?: Record<string, unknown> },
    priestDeity: string | null | undefined,
    base: { name?: string; description?: string }
): { name: string; description: string } {
    return resolveClassOptionPlaceholderPassive(rulesData, PRIEST, priestDeity, base)
}
