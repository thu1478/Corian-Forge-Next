export type CharAttribute =
    | "might"
    | "dexterity"
    | "reason"
    | "willpower"
    | "presence"

export type ChargeResetTiming = "endOfCombat" | "shortRest" | "longRest"

export interface ChargeDefinition {
    chargeStat?: string
    fixedMaxCharges?: number
    chargeReset?: ChargeResetTiming[]
}

export interface GrantSkillEffect {
    type: "GrantSkill"
    skillId?: string
    pickCount?: number
    skillBuckets?: string[]
    unlockSkillIds?: string[]
    unlockCategories?: string[]
    distinctPicks?: boolean
}

export interface EnhanceActionEffect {
    type: "EnhanceAction"
    actionId: string
    appendDescription?: string
    apCostDelta?: number
    focusCostDelta?: number
    mpCostDelta?: number
    ipCostDelta?: number
    tier1DmgDelta?: number
    tier2DmgDelta?: number
    tier3DmgDelta?: number
}

export type TraitEffect =
    | {
          type:
              | "StatChange"
              | "Resistance"
              | "Vulnerability"
              | "Immunity"
              | "GrantSight"
              | "GrantMovement"
              | "AttributeChange"
              | "GrantActionCard"
              | "Language"
              | "SummonSchool"
          stat?: string
          value?: string
          when?: string
      }
    | GrantSkillEffect
    | EnhanceActionEffect

export type PotencyStrength = -2 | -1 | 0 | "weak" | "average" | "strong"

export type PotencyEffect =
    | {
          type: "Condition"
          srcStats?: CharAttribute[]
          fixedSrcVal?: number
          targetStats?: CharAttribute[]
          effect: string
          duration?: string
          strength?: PotencyStrength
      }
    | {
          type: "ForcedMovement"
          srcStats?: CharAttribute[]
          fixedSrcVal?: number
          targetStats?: CharAttribute[]
          effect: "push" | "pull" | "slide" | "verticalpush" | "verticalpull"
          distance: number
          strength?: PotencyStrength
      }
    | {
          type: "Special"
          effect: string
          duration?: string
      }

export interface PowerRoll {
    rollStats: CharAttribute[]
    tier1Dmg?: number
    tier1Wpn?: boolean
    tier1Effect?: PotencyEffect
    tier2Dmg?: number
    tier2Wpn?: boolean
    tier2Effect?: PotencyEffect
    tier3Dmg?: number
    tier3Wpn?: boolean
    tier3Effect?: PotencyEffect
}

export interface ActionCardRule extends ChargeDefinition {
    id?: string
    name: string
    type: "action" | "reaction" | "freeReaction"
    description: string
    /** When this reaction can be used (global `actionCards` with reaction types). */
    trigger?: string
    apCost?: number
    mpCost?: number
    focusCost?: number
    ipCost?: number
    range?: string
    duration?: string
    damageType?: string
    powerRoll?: PowerRoll
    tags: string[]
    hiddenTags?: string[]
    source: string
}

export interface ClassReactionRule extends ChargeDefinition {
    id?: string
    name: string
    type?: string
    level?: number
    trigger: string
    description: string
    apCost?: number
    mpCost?: number
    focusCost?: number
    ipCost?: number
    actionCard?: ActionCardRule
}

export interface PassiveRule extends ChargeDefinition {
    name?: string
    minLevel?: number
    description?: string
    effects?: TraitEffect[]
    selectAmount?: number
    powerRoll?: PowerRoll
    [key: string]: unknown
}

export type ItemRequirements = {
    stats?: Partial<Record<CharAttribute, number>>
    classes?: Record<string, string[]>
}

export type ItemRule = Record<string, unknown> & {
    name?: string
    type?: string
    tags?: string[]
    description?: string
    traits?: Array<string | Record<string, unknown>>
    actionIDs?: string[]
    requirements?: ItemRequirements
}

export type RulesSystem = Record<string, unknown>

export type RulesRoot = {
    system: RulesSystem
    classes: Record<string, Record<string, unknown>>
    races: Record<string, Record<string, unknown>>
    items: Record<string, ItemRule>
    actionCards: Record<string, ActionCardRule>
    passives: Record<string, PassiveRule>
    bestiary?: Record<string, unknown>
    glossary?: Record<string, unknown>
}

export type CloneSection = "items" | "passives" | "actionCards"
