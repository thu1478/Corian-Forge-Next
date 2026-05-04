//<editor-fold desc="Character data">
import {ActionRef, ReactionRef, TraitRef} from "@/lib/baseRefs";

export const CharAttribute = {
    Might: "might",
    Dexterity: "dexterity",
    Reason: "reason",
    Willpower: "willpower",
    Presence: "presence"
} as const;
export type CharAttribute = (typeof CharAttribute)[keyof typeof CharAttribute];

export interface FocusFeature {
    classSrc: string
    slotIndex: number
}

export interface Reaction extends ReactionRef {
    name: string
    description: string
    trigger: string
    chargeStat ?: string
    actionCard ?: ActionCard
}

export interface CharacterClass {
    id: string
    level: number
}

export interface TraitEffect {
    type: "StatChange" | "Resistance" | "Vulnerability" | "Immunity" | "GrantSight" | "AttributeChange" | "GrantActionCard" | "Language"
    stat?: string
    /** Omitted on some rows (e.g. `Immunity`, `GrantSight` with only `stat`). */
    value?: string
}

export interface Trait extends TraitRef {
    uid: string
    name: string
    source: "racial" | "feat" | "class" | "background" | "other"
    description: string
    minLevel: number
    effects?: TraitEffect[]
    /** Player must pick this many entries from `effects` (see `selectedEffectIndices` on TraitRef). */
    selectAmount?: number
    /** Optional attack / potency table (same shape as action cards). Shown in creator + sheet when present. */
    powerRoll?: PowerRoll
}

export interface RacialPassive extends Trait {
    source: "racial"
    type?: "innate" | "selectable"
    ptCost?: number
}

export interface Skill {
    name: string
    attribute: "might" | "dexterity" | "reason" | "willpower" | "presence"
    hasExpertise: boolean
}

/** One emotion type toward a bond target (paired opposites enforced per target in UI/rules). */
export type BondEmotionType =
    | "admiration"
    | "inferiority"
    | "loyalty"
    | "mistrust"
    | "affection"
    | "hatred"

export interface BondEmotion {
    id: string
    type: BondEmotionType
}

/** A named bond target (NPC, faction, place…). Up to 3 distinct emotion types per target (rules). */
export interface BondTarget {
    id: string
    name: string
    emotions: BondEmotion[]
}

//</editor-fold>

export const DamageType = {
    Slashing: "slashing",
    Crushing: "crushing",
    Piercing: "piercing",
    Fire: "fire",
    Water: "water",
    Volt: "volt",
    Air: "air",
    Earth: "earth",
    Nature: "nature",
    Light: "light",
    Dark: "dark"
} as const;
export type DamageType = (typeof DamageType)[keyof typeof DamageType];

export const Condition = {
    PRONE: "prone",
    PUSH: "push",
    PULL: "pull",
    SLIDE: "slide",
    BLEEDING: "bleeding",
    CHARMED: "charmed",
    FRIGHTENED: "frightened",
    GRABBED: "grabbed",
    POISONED: "poisoned",
    RESTRAINED: "restrained",
    SHAKEN: "shaken",
    DAZED: "dazed",
    STUNNED: "stunned",
    SLOWED: "slowed",
    SUNDERED: "sundered",
    TAUNT: "taunt",
    WEAKENED: "weakened",
    HEMORRHAGE: "hemorrhage"
} as const;

export type Condition = (typeof Condition)[keyof typeof Condition];

//<editor-fold desc="Power Roll">
export const PotencyStrength = {
    Weak: -2,
    Average: -1,
    Strong: 0,
} as const;

export type PotencyStrength = (typeof PotencyStrength)[keyof typeof PotencyStrength];

export type PotencyEffect =
    | {
    type: 'Condition';
    srcStats?: CharAttribute[];
    targetStats?: CharAttribute[];
    effect: Condition;
    duration?: PotencyDuration;
    strength?: PotencyStrength;
}
    | {
    type: 'ForcedMovement';
    srcStats?: CharAttribute[];
    targetStats?: CharAttribute[];
    effect: 'push' | 'pull' | 'slide';
    distance: number;
    strength?: PotencyStrength;
}
    | {
    type: 'Special';
    effect: string;
    duration?: PotencyDuration;
};

export const PotencyDuration = {
    None: "",
    TurnEnd: "[turn end]",
    SaveEnd: "[save end]",
    RoundEnd: "[round end]",
} as const;

export type PotencyDuration = (typeof PotencyDuration)[keyof typeof PotencyDuration];

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

//</editor-fold>

export interface ActionCard extends ActionRef {
    name: string
    type: "action" | "reaction" | "freeReaction"
    description: string
    apCost?: number
    mpCost?: number
    focusCost?: number
    ipCost?: number
    range?: string
    duration?: string
    damageType?: DamageType
    powerRoll?: PowerRoll
    tags: string[]
    source: string
}