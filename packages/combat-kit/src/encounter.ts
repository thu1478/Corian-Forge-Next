import type { AttributeBlock, CombatantInstance, SandboxCreature } from "./types.js"

export function normalizeAttributes(partial: Partial<AttributeBlock>): AttributeBlock {
    return {
        might: partial.might ?? 10,
        dexterity: partial.dexterity ?? 10,
        reason: partial.reason ?? 10,
        willpower: partial.willpower ?? 10,
        presence: partial.presence ?? 10,
    }
}

let instanceCounter = 0

export function nextInstanceId(prefix = "combatant"): string {
    instanceCounter += 1
    return `${prefix}-${Date.now()}-${instanceCounter}`
}

export function combatantFromCreature(
    templateId: string,
    creature: SandboxCreature,
    displayName?: string,
): CombatantInstance {
    const attrs = normalizeAttributes(creature.attributes ?? {})
    return {
        instanceId: nextInstanceId(templateId),
        source: "creature",
        templateId,
        displayName: displayName ?? creature.name ?? templateId,
        attributes: attrs,
        actionIDs: [...(creature.actionIDs ?? [])],
        naturalWeapons: creature.naturalWeapons,
        defaultNaturalWeaponKey: creature.defaultNaturalWeaponKey,
        defense: creature.defense,
        stability: creature.stability,
        speed: creature.speed,
        currentHp: creature.defaultMaxHp,
        maxHp: creature.defaultMaxHp,
    }
}

export type CharacterImportShape = {
    name?: string
    attributes?: Partial<AttributeBlock>
    actions?: Array<{ id: string } | string>
    reactions?: Array<{ id: string } | string>
    hp?: number
    speed?: number
}

function extractActionIds(refs: Array<{ id: string } | string> | undefined): string[] {
    if (!Array.isArray(refs)) return []
    return refs
        .map((r) => (typeof r === "string" ? r : r?.id))
        .filter((id): id is string => typeof id === "string" && id.length > 0)
}

export function combatantFromCharacterSheet(data: CharacterImportShape): CombatantInstance {
    const actionIDs = [
        ...extractActionIds(data.actions),
        ...extractActionIds(data.reactions),
    ]
    return {
        instanceId: nextInstanceId("character"),
        source: "character",
        displayName: data.name?.trim() || "Imported character",
        attributes: normalizeAttributes(data.attributes ?? {}),
        actionIDs: [...new Set(actionIDs)],
        speed: data.speed,
        currentHp: data.hp,
        maxHp: data.hp,
    }
}
