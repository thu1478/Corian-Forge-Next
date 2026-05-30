import type { CharacterSaveData } from "@/lib/character-data"
import type { CreatureDefinition, CreatureRosterEntry, RulesWithBestiary } from "@/lib/creature-roster"
import { getCreatureTemplates } from "@/lib/creature-roster"
import { getRiderMountBonusStats, isRiderRosterEntry } from "@/lib/rider-mounts"

export type MountedRiderBonuses = {
    creatureId: string
    creatureName: string
    speed: number
    defenseBonus: number
    stabilityBonus: number
    template: CreatureDefinition
    entry: CreatureRosterEntry
}

export function isSummonMountable(entry: CreatureRosterEntry): boolean {
    return entry.kind === "summon"
}

function readMountedRiderBonusesFromTemplate(
    template: CreatureDefinition,
    entry: CreatureRosterEntry,
    character: CharacterSaveData,
    rules: RulesWithBestiary
): { defenseBonus: number; stabilityBonus: number } {
    const fromTemplate = template.mountedRiderBonuses
    const classOptionBonuses = isRiderRosterEntry(entry)
        ? getRiderMountBonusStats(rules, character.riderMountType)
        : {}
    if (isRiderRosterEntry(entry)) {
        return {
            defenseBonus: classOptionBonuses.defense ?? 0,
            stabilityBonus: classOptionBonuses.stability ?? 0,
        }
    }
    if (fromTemplate) {
        return {
            defenseBonus: fromTemplate.defense ?? 0,
            stabilityBonus: fromTemplate.stability ?? 0,
        }
    }
    return { defenseBonus: 0, stabilityBonus: 0 }
}

/** Active mount context when character is riding a deployed summon. */
export function resolveMountedRiderBonuses(
    character: CharacterSaveData,
    rules: RulesWithBestiary
): MountedRiderBonuses | null {
    const mountedId = character.mountedCreatureId
    if (!mountedId) return null

    const creatures = character.creatures ?? []
    const entry = creatures.find((c) => c.id === mountedId)
    if (!entry || entry.kind !== "summon" || !entry.deployed) return null

    const templates = getCreatureTemplates(rules)
    const template = templates[entry.templateId]
    if (!template) return null

    const speed = template.speed
    if (speed == null || !Number.isFinite(speed)) return null

    const { defenseBonus, stabilityBonus } = readMountedRiderBonusesFromTemplate(template, entry, character, rules)
    const creatureName = entry.customName?.trim() || template.name

    return {
        creatureId: entry.id,
        creatureName,
        speed,
        defenseBonus,
        stabilityBonus,
        template,
        entry,
    }
}
