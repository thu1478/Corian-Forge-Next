import type { TraitRef } from "@/lib/baseRefs"
import {
    CLASS_OPTION_CONFIGS,
    getClassOptionEntry,
    type ClassOptionEntry,
} from "@/lib/class-options"
import type { CreatureDefinition, CreatureRosterEntry, RulesWithBestiary } from "@/lib/creature-roster"

const RIDER = CLASS_OPTION_CONFIGS.rider
const RIDER_MOUNT_TEMPLATE_IDS: Record<string, string> = {
    swift: "mount_swift",
    tough: "mount_tough",
    adaptable: "mount_adaptable",
}

export function getRiderLevel(classes: { id: string; level: number }[]): number {
    return classes.find((c) => c.id === "rider")?.level ?? 0
}

export function riderHasFaithfulSteed(
    traits: TraitRef[],
    classes: { id: string; level: number }[]
): boolean {
    if (getRiderLevel(classes) < 1) return false
    return traits.some((t) => t.id === "faithfulSteed" && String(t.source).toLowerCase() === "class")
}

export function getRiderMountTemplateId(mountType: string | null | undefined): string | null {
    const id = String(mountType ?? "").trim().toLowerCase()
    return RIDER_MOUNT_TEMPLATE_IDS[id] ?? null
}

export function getRiderMountTypeFromTemplateId(templateId: string | null | undefined): string | null {
    const id = String(templateId ?? "").trim()
    const match = Object.entries(RIDER_MOUNT_TEMPLATE_IDS).find(([, tid]) => tid === id)
    return match?.[0] ?? null
}

export function getRiderMountOption(
    rules: RulesWithBestiary,
    riderMountType: string | null | undefined
): ClassOptionEntry | null {
    return getClassOptionEntry(rules, RIDER.classId, RIDER.optionsKey, riderMountType)
}

export function isRiderRosterEntry(entry: CreatureRosterEntry): boolean {
    if (entry.rosterSource === "rider") return true
    return entry.id.startsWith("rider-mount-")
}

export function buildRiderMountRow(templateId: string, def: CreatureDefinition): CreatureRosterEntry {
    const base: CreatureRosterEntry = {
        id: "rider-mount-0",
        templateId,
        kind: "summon",
        deployed: false,
        rosterSource: "rider",
    }
    if (typeof def.defaultMaxHp === "number") {
        base.maxHp = def.defaultMaxHp
        base.currentHp = def.defaultMaxHp
    }
    if (typeof def.defaultMaxMp === "number") {
        base.maxMp = def.defaultMaxMp
        base.currentMp = def.defaultMaxMp
    }
    return base
}

export function getRiderMountBonusStats(
    rules: RulesWithBestiary,
    riderMountType: string | null | undefined
): Partial<Record<"defense" | "stability", number>> {
    const entry = getRiderMountOption(rules, riderMountType)
    return entry?.bonusStats ?? {}
}

export function applyRiderMountOptionToCreatureDefinition(
    rules: RulesWithBestiary,
    templateId: string,
    def: CreatureDefinition
): CreatureDefinition {
    const mountType = getRiderMountTypeFromTemplateId(templateId)
    const option = getRiderMountOption(rules, mountType)
    if (!option) return def

    const creatureTypes = option.creatureTypes?.length ? option.creatureTypes : def.creatureTypes
    const tags = new Set([...(def.tags ?? []), "rider", "mount", ...(creatureTypes ?? [])])

    return {
        ...def,
        name: `${option.name} Steed`,
        description: option.description ?? def.description,
        creatureTypes,
        tags: [...tags],
        speed: option.speed,
        size: option.size,
        passengers: option.passengers,
        mountedRiderBonuses: option.bonusStats,
    }
}

export function resolveAdaptableMovementLabel(movement: "swimming" | "climbing" | null | undefined): string | null {
    if (movement === "swimming") return "Swimming"
    if (movement === "climbing") return "Climbing"
    return null
}
