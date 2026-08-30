import {Equipment, InventoryContainer, InventoryEntry,} from "@/lib/equipment-data";
import { emptyAccessories } from "@/logic/equipment/accessory-slots";
import {BondTarget, CharacterClass, FocusFeature, Skill} from "@/lib/rules";
import {ActionRef, ReactionRef, TraitRef} from "@/lib/baseRefs";
import type {CreatureRosterEntry} from "@/logic/creatures/roster";
import type {FairyTamerContractsSave} from "@/logic/creatures/fairy-tamer";
import {emptyFairyTamerContracts} from "@/logic/creatures/fairy-tamer";

export type InventionVariant =
    | "potionLauncher"
    | "trapBelt"
    | "modularArmor"
    | "supportBackpack";

export type WeaponInfusionDamageType = "volt" | "water" | "fire" | "earth";

export type InventionModuleConfig = {
    weaponInfusion?: { damageType: WeaponInfusionDamageType };
};

export type SpecialInventionSave = {
    variant: InventionVariant;
    armorModules?: string[];
    backpackModules?: string[];
    weaponInfusionDamageType?: WeaponInfusionDamageType;
};

export type ActionLayoutEntry =
    | { type: "action"; key: string }
    | { type: "folder"; id: string };

export interface ActionFolder {
    id: string;
    name: string;
    items: ActionLayoutEntry[];
}

export interface ActionLayout {
    root: ActionLayoutEntry[];
    folders: Record<string, ActionFolder>;
}

export interface CharacterSaveData {
    // Character Info
    name: string
    age: number
    gender: string
    race: string
    profileImage?: string
    background: string
    backstory: string

    // Classes
    classes: CharacterClass[]

    // Combat Resources
    hp: number
    barrier: number
    mp: number
    focus: number
    /** Current respite uses (short rests, etc.). Max comes from derived stats (base 4 + traits such as maxRespites). */
    respite: number

    // Attributes (stat + modifier)
    attributes: {
        might: number
        dexterity: number
        reason: number
        willpower: number
        presence: number
    }

    /**
     * +1 attribute picks at adventurer levels 3, 5, 7, 9, 10 (level → attribute id).
     * Creator keeps `attributes` as **base** (point-buy) while editing; export JSON uses **final**
     * scores in `attributes` and this map so re-import does not double-apply bonuses.
     * Character sheet / play: `attributes` are final totals; this field is metadata only.
     */
    attributeLevelBonuses?: Partial<
        Record<number, "might" | "dexterity" | "reason" | "willpower" | "presence">
    >

    // Non-resource stats
    speed: number

    // Other stats
    xp: number
    inspiration: number
    victories: number

    // Focus Features & Reactions
    focusFeatures: FocusFeature[]
    reactions: ReactionRef[]

    // Actions
    actions: ActionRef[]

    /** Combat tab: nested folders and manual ordering for action cards (UI layout only). */
    actionLayout?: ActionLayout

    // Traits
    traits: TraitRef[]
    // Languages - REMOVED: Now handled via Language trait effects

    // Skills
    skills: Skill[]

    // Inventory
    money: number
    ip: number
    inventory: InventoryEntry[]
    /** Named bags for organizing inventory (items reference `containerId`). */
    containers: InventoryContainer[]

    // Equipment
    equipment: Equipment

    /** Named bond targets (max 6); each holds up to 3 unique emotion types (no opposite pair together). */
    bondTargets: BondTarget[]

    /** Creator / export: culture step keys from rules (e.g. nomadic, bureaucratic). */
    cultureEnvironment: string | null
    cultureOrganization: string | null
    cultureUpbringing: string | null
    /** Creator / export: occupation id from `rules.system.occupation` (e.g. spy, scholar). */
    occupation: string | null

    /** Priest: chosen deity id from `rules.classes.priest.deities` (filters deity-specific class talents in the creator). */
    priestDeity?: string | null

    /** Rider: chosen mount type from classes.rider.mounts */
    riderMountType?: string | null

    /** Rider Adaptable: swimming | climbing */
    riderAdaptableMovement?: "swimming" | "climbing" | null

    /** Roster entry id of the summon the character is currently riding. */
    mountedCreatureId?: string | null

    /** Assistants and summons; feat unlocks may add rows via reconciliation on the sheet. */
    creatures?: CreatureRosterEntry[]

    /**
     * Conjurer Summoner: one template id per roster slot (character creator).
     * Reconciled to `creatures` as `conjurer-slot-0`, … alongside class traits.
     */
    conjurerSummonTemplateIds?: string[]

    /**
     * Druid Anima: one selected creature template id per Anima slot.
     * Slots are reconciled to `creatures` as `druid-anima-slot-0`, …
     */
    druidAnimaTemplateIds?: string[]

    /** Currently active Druid Anima template id, if transformed. */
    activeDruidAnimaTemplateId?: string | null

    /** Equipment snapshot taken when entering Anima; restored when leaving. */
    equipmentBeforeAnima?: Equipment | null

    /** Barrier added by the current Anima transform (Druid level × 3); removed on revert. */
    animaBarrierBonus?: number | null

    /** Fairy Tamer (Fairy Contract passive): creature + two spells per unlock level. */
    fairyTamerContracts?: FairyTamerContractsSave

    /** Character creator only: keyed skill grant picker state (see grant-skill-effects keys). Exported for re-import. */
    creatorSkillGrantPicks?: Record<string, string[]>

    /** Weapon Bond: inventory item uids marked as bonded (Weapon Bond passive). */
    bondedWeaponUids?: string[]

    /** Combat-tab temporary defense modifier (added to derived defense). */
    combatDefenseDelta?: number

    /** Combat-tab temporary stability modifier (added to derived stability). */
    combatStabilityDelta?: number

    /** Combat-tab temporary speed modifier (added to derived speed). */
    combatSpeedDelta?: number

    /** Combat tab: a Maintain effect is currently being upheld. */
    maintainActive?: boolean

    /** Artificer Special Invention (level 3): variant, module picks, weapon infusion damage type. */
    specialInvention?: SpecialInventionSave
}

export const defaultCharacter: CharacterSaveData = {
    // Character Info
    name: "Kira Shadowmend",
    age: 27,
    gender: "",
    race: "",
    profileImage: "",
    background: "",
    backstory: "",

    // Classes
    classes: [],

    // Combat Resources
    hp: 1,
    barrier: 0,
    mp: 0,
    focus: 0,
    respite: 0,

    // Attributes
    attributes: {
        might: 10,
        dexterity: 10,
        reason: 10,
        willpower: 10,
        presence: 10
    },

    // Non-resource stats
    speed: 4,

    // Other stats
    xp: 0,
    inspiration: 0,
    victories: 0,

    // Focus Features
    focusFeatures: [],

    // Reactions
    reactions: [],

    // Actions
    actions: [],

    // Traits
    traits: [],

    // Skills
    skills: [],

    // Inventory
    money: 0,
    ip: 0,
    inventory: [],
    containers: [],

    // Equipment
    equipment: {
        activeWeapon: null,
        offhand: null,
        armor: null,
        accessories: emptyAccessories(),
    },

    bondTargets: [],

    cultureEnvironment: null,
    cultureOrganization: null,
    cultureUpbringing: null,
    occupation: null,

    creatures: [],
    conjurerSummonTemplateIds: [],
    druidAnimaTemplateIds: [],
    activeDruidAnimaTemplateId: null,
    equipmentBeforeAnima: null,
    animaBarrierBonus: null,
    fairyTamerContracts: emptyFairyTamerContracts(),
    creatorSkillGrantPicks: {},
}

export interface CharacterStats {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
}

export interface ClassLevel {
    id: string
    level: number
}

/** Class-level bonus skill picks (`rules.classes[*].skillTraining` / `skillTrainings`), parallel to stat bonuses. */
export interface ClassSkillTrainingRule {
    pickCount: number
    frequency?: number
    once?: boolean
    skillBuckets?: string[]
    unlockSkillIds?: string[]
    unlockCategories?: string[]
}

/** Class-level max stat contributions from `rules.classes[*].statBonus` or `.statBonuses`. */
export interface ClassBonusRule {
    stat: string
    amount: number
    /** How many class levels grant one application of `amount`. Ignored when `once` is true. */
    frequency?: number
    /** When true, add `amount` once for this class if the character has at least 1 level in it (no per-level or frequency scaling). */
    once?: boolean
}

export type StatChangeContext = {
    isDualWielding?: boolean
}
