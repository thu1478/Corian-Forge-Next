/** Shared class option picking (Priest deities, Rider mounts, …). */

import type { CreatureSize } from "@/logic/creatures/creature-size"

export type ClassOptionEntry = {
    id: string
    name: string
    description?: string
    passives?: Record<string, { name?: string; description?: string; minLevel?: number }>
    /** Mount-only preview fields */
    size?: CreatureSize
    speed?: number
    passengers?: number
    bonusStats?: Partial<Record<"defense" | "stability", number>>
    creatureTypes?: string[]
}

export type ClassOptionConfig = {
    classId: string
    optionsKey: string
    saveField: string
    filterField?: string
    placeholderPassiveId?: string
}

export const CLASS_OPTION_CONFIGS = {
    priest: {
        classId: "priest",
        optionsKey: "deities",
        saveField: "priestDeity",
        filterField: "deityId",
        placeholderPassiveId: "deityBoon",
    },
    rider: {
        classId: "rider",
        optionsKey: "mounts",
        saveField: "riderMountType",
        filterField: "mountTypeId",
    },
} as const satisfies Record<string, ClassOptionConfig>

type RulesWithClassOptions = {
    classes?: Record<string, unknown>
}

export function getClassOptionEntries(
    rulesData: RulesWithClassOptions,
    classId: string,
    optionsKey: string
): ClassOptionEntry[] {
    const cls = rulesData.classes?.[classId] as Record<string, unknown> | undefined
    const raw = cls?.[optionsKey]
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is ClassOptionEntry => x != null && typeof x === "object" && typeof (x as { id?: unknown }).id === "string")
}

export function getClassOptionEntry(
    rulesData: RulesWithClassOptions,
    classId: string,
    optionsKey: string,
    optionId: string | null | undefined
): ClassOptionEntry | null {
    if (!optionId) return null
    return getClassOptionEntries(rulesData, classId, optionsKey).find((x) => x.id === optionId) ?? null
}

export type ClassOptionPassiveEntry = {
    slug: string
    name: string
    description: string
    minLevel: number
}

export function getClassOptionPassiveEntries(
    rulesData: RulesWithClassOptions,
    classId: string,
    optionsKey: string,
    optionId: string | null | undefined
): ClassOptionPassiveEntry[] {
    const entry = getClassOptionEntry(rulesData, classId, optionsKey, optionId)
    if (!entry?.passives) return []
    return Object.entries(entry.passives).map(([slug, p]) => ({
        slug,
        name: String(p.name ?? slug),
        description: String(p.description ?? ""),
        minLevel: typeof p.minLevel === "number" ? p.minLevel : 3,
    }))
}

/** Merge placeholder class passive with chosen option text (creator / sheet). */
export function resolveClassOptionPlaceholderPassive(
    rulesData: RulesWithClassOptions,
    config: ClassOptionConfig,
    optionId: string | null | undefined,
    base: { name?: string; description?: string }
): { name: string; description: string } {
    const entries = getClassOptionPassiveEntries(rulesData, config.classId, config.optionsKey, optionId)
    if (entries.length > 0) {
        const lines = entries.map((e) => (entries.length > 1 ? `${e.name} — ${e.description}` : e.description))
        return {
            name: entries.length === 1 ? entries[0].name : String(base.name ?? "Class option"),
            description: lines.join("\n\n"),
        }
    }
    return {
        name: String(base.name ?? "Class option"),
        description: String(base.description ?? "Select an option above to see details here."),
    }
}

export function talentMatchesClassOption(
    talent: { [key: string]: unknown },
    optionId: string | null | undefined,
    filterField?: string
): boolean {
    if (!filterField) return true
    const required = talent[filterField]
    if (required == null || required === "") return true
    return Boolean(optionId && String(required) === String(optionId))
}

export function getClassOptionPreviewStats(option: ClassOptionEntry): string[] {
    const lines: string[] = []
    if (option.size != null) lines.push(`Size ${option.size}`)
    if (typeof option.speed === "number") lines.push(`Speed ${option.speed}`)
    const bs = option.bonusStats
    if (bs?.defense) lines.push(`+${bs.defense} Def (while mounted)`)
    if (bs?.stability) lines.push(`+${bs.stability} Stability (while mounted)`)
    if (typeof option.passengers === "number") lines.push(`${option.passengers} passenger${option.passengers === 1 ? "" : "s"}`)
    return lines
}
