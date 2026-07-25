import type { ActionCardRule, CharAttribute, PowerRoll, RulesRoot } from "@corian-forge/rules-kit"

export type { CharAttribute, PowerRoll, ActionCardRule, RulesRoot }

export interface AttributeBlock {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
}

export interface NaturalWeaponDefinition {
    name: string
    damage: number
    damageType?: string
}

/** Sandbox creature roles. `enemy` is combat-sandbox only (not used on character-sheet bestiary). */
export type SandboxCreatureRole = "assistant" | "minion" | "summon" | "enemy"

export interface SandboxCreature {
    name: string
    description?: string
    role?: SandboxCreatureRole
    level?: number
    creatureTypes?: string[]
    tags?: string[]
    attributes: Partial<AttributeBlock>
    actionIDs?: string[]
    naturalWeapons?: Record<string, NaturalWeaponDefinition>
    defaultNaturalWeaponKey?: string
    traitRefs?: string[]
    defense?: number
    stability?: number
    speed?: number
    size?: string
    defaultMaxHp?: number
    defaultMaxMp?: number
    resistances?: string[]
    immunities?: string[]
    vulnerabilities?: Array<{ stat: string; value?: string }>
    opportunityAttack?: number
    summonTier?: 2 | 4
    passengers?: number
    mountedRiderBonuses?: Record<string, unknown>
    [key: string]: unknown
}

export type SandboxActionCard = ActionCardRule & Record<string, unknown>

export interface CombatSandboxRoot {
    version: number
    creatures: Record<string, SandboxCreature>
    actionCards: Record<string, SandboxActionCard>
}

export type SandboxSection = "creatures" | "actionCards"

export type SandboxValidationSeverity = "error" | "warning"

export type SandboxValidationIssue = {
    path: string
    code: string
    message: string
    severity: SandboxValidationSeverity
}

export type HydratedActionCard = SandboxActionCard & {
    id: string
    source: string
}

export type CombatantSource = "creature" | "character"

export interface CombatantInstance {
    instanceId: string
    source: CombatantSource
    displayName: string
    templateId?: string
    attributes: AttributeBlock
    actionIDs: string[]
    naturalWeapons?: Record<string, NaturalWeaponDefinition>
    defaultNaturalWeaponKey?: string
    defense?: number
    stability?: number
    speed?: number
    currentHp?: number
    maxHp?: number
}

export const CHAR_ATTRIBUTES: CharAttribute[] = [
    "might",
    "dexterity",
    "reason",
    "willpower",
    "presence",
]
