import type { CharacterClass, CharAttribute } from "@/lib/rules"
import type { ItemRequirements } from "@/packages/rules-kit/src/types"
import {
    classLevelRequirementsMet,
    formatClassLevelRequirementsText,
    getClassLevelRequirements,
} from "@/logic/feats/prereqs"

export const ITEM_STAT_ATTRIBUTES: CharAttribute[] = [
    "might",
    "dexterity",
    "reason",
    "willpower",
    "presence",
]

const STAT_LABELS: Record<CharAttribute, string> = {
    might: "Might",
    dexterity: "Dexterity",
    reason: "Reason",
    willpower: "Willpower",
    presence: "Presence",
}

type ItemRequirementsRules = {
    classes?: Record<string, { name?: string }>
}

export type ItemRequirementsContext = {
    attributes?: Partial<Record<CharAttribute, number>>
    classes?: CharacterClass[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object" && !Array.isArray(value)
}

function readStatRequirements(raw: unknown): Partial<Record<CharAttribute, number>> | undefined {
    if (!isRecord(raw)) return undefined
    const out: Partial<Record<CharAttribute, number>> = {}
    for (const stat of ITEM_STAT_ATTRIBUTES) {
        const value = raw[stat]
        if (typeof value !== "number" || !Number.isFinite(value)) continue
        out[stat] = Math.floor(value)
    }
    return Object.keys(out).length > 0 ? out : undefined
}

export function readItemRequirements(
    def: Record<string, unknown> | null | undefined,
): ItemRequirements | null {
    if (!def || !isRecord(def.requirements)) return null

    const stats = readStatRequirements(def.requirements.stats)
    const classes = getClassLevelRequirements({ classes: def.requirements.classes })
    const hasClasses = Object.keys(classes).length > 0

    if (!stats && !hasClasses) return null

    return {
        ...(stats ? { stats } : {}),
        ...(hasClasses ? { classes } : {}),
    }
}

export function sanitizeItemRequirements(
    requirements: ItemRequirements | null | undefined,
): ItemRequirements | undefined {
    if (!requirements) return undefined

    const stats = readStatRequirements(requirements.stats)
    const classes = getClassLevelRequirements({ classes: requirements.classes })
    const hasClasses = Object.keys(classes).length > 0

    if (!stats && !hasClasses) return undefined

    return {
        ...(stats ? { stats } : {}),
        ...(hasClasses ? { classes } : {}),
    }
}

export function formatItemRequirementLines(
    requirements: ItemRequirements | null | undefined,
    rules: ItemRequirementsRules,
): string[] {
    if (!requirements) return []

    const lines: string[] = []

    if (requirements.stats) {
        for (const stat of ITEM_STAT_ATTRIBUTES) {
            const min = requirements.stats[stat]
            if (min == null) continue
            lines.push(`${STAT_LABELS[stat]} ${min}+`)
        }
    }

    if (requirements.classes && Object.keys(requirements.classes).length > 0) {
        const classLine = formatClassLevelRequirementsText(requirements.classes, rules)
        if (classLine) lines.push(classLine)
    }

    return lines
}

export function itemStatRequirementsMet(
    requirements: ItemRequirements | null | undefined,
    attributes: Partial<Record<CharAttribute, number>> | undefined,
): boolean {
    if (!requirements?.stats) return true

    for (const stat of ITEM_STAT_ATTRIBUTES) {
        const min = requirements.stats[stat]
        if (min == null) continue
        const score = Number(attributes?.[stat])
        if (!Number.isFinite(score) || score < min) return false
    }

    return true
}

export function itemRequirementsMet(
    requirements: ItemRequirements | null | undefined,
    context: ItemRequirementsContext,
): boolean {
    if (!requirements) return true

    const statsOk = itemStatRequirementsMet(requirements, context.attributes)
    const classesOk = requirements.classes
        ? classLevelRequirementsMet(requirements.classes, context.classes ?? [])
        : true

    return statsOk && classesOk
}

export function readItemRequirementLinesFromDef(
    def: Record<string, unknown> | null | undefined,
    rules: ItemRequirementsRules,
): string[] {
    return formatItemRequirementLines(readItemRequirements(def), rules)
}
