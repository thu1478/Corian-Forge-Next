import {Equipment, InventoryContainer, InventoryEntry,} from "@/lib/equipment-data";
import {BondTarget, CharacterClass, FocusFeature, Skill} from "@/lib/rules";
import {ActionRef, ReactionRef, TraitRef} from "@/lib/baseRefs";
import type {CreatureRosterEntry} from "@/lib/creature-roster";
import type {FairyTamerContractsSave} from "@/lib/fairy-tamer";
import {emptyFairyTamerContracts} from "@/lib/fairy-tamer";

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

    /** Assistants and summons; feat unlocks may add rows via reconciliation on the sheet. */
    creatures?: CreatureRosterEntry[]

    /**
     * Conjurer Summoner: one template id per roster slot (character creator).
     * Reconciled to `creatures` as `conjurer-slot-0`, … alongside class traits.
     */
    conjurerSummonTemplateIds?: string[]

    /** Fairy Tamer (Fairy Contract passive): creature + two spells per unlock level. */
    fairyTamerContracts?: FairyTamerContractsSave

    /** Character creator only: keyed skill grant picker state (see grant-skill-effects keys). Exported for re-import. */
    creatorSkillGrantPicks?: Record<string, string[]>

    /** Weapon Bond: inventory item uids with +1 damage (Weapon Bond passive). */
    bondedWeaponUids?: string[]

    /** Combat-tab temporary defense modifier (added to derived defense). */
    combatDefenseDelta?: number

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
        accessories: {
            head: null,
            face: null,
            ears: null,
            neck: null,
            back: null,
            hands: null,
            ringLeft: null,
            ringRight: null,
            waist: null,
            feet: null,
        }
    },

    bondTargets: [],

    cultureEnvironment: null,
    cultureOrganization: null,
    cultureUpbringing: null,
    occupation: null,

    creatures: [],
    conjurerSummonTemplateIds: [],
    fairyTamerContracts: emptyFairyTamerContracts(),
    creatorSkillGrantPicks: {},
}

export function getAttributeModifier(score: number): number {
    return Math.floor((score - 10) / 2)
}

export function formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
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

/** Flatten class rule `skillTraining` / `skillTrainings` into a concrete list for grant-skill-effects. */
export function classSkillTrainingEntries(
    classRule: { skillTraining?: ClassSkillTrainingRule; skillTrainings?: ClassSkillTrainingRule[] } | undefined
): ClassSkillTrainingRule[] {
    if (!classRule) return []
    if (Array.isArray(classRule.skillTrainings) && classRule.skillTrainings.length > 0) {
        return classRule.skillTrainings
    }
    const single = classRule.skillTraining
    if (single && typeof single === "object") return [single]
    return []
}

/** How many times a skill-training rule triggers for `classLevel` (same stacking as HP statBonus). */
export function countClassSkillTrainingApplications(classLevel: number, rule: ClassSkillTrainingRule): number {
    const lvl = Math.max(0, Math.floor(Number(classLevel) || 0))
    if (rule.once === true) {
        return lvl >= 1 ? 1 : 0
    }
    const freq = typeof rule.frequency === "number" && rule.frequency > 0 ? rule.frequency : 1
    return Math.floor(lvl / freq)
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

function classStatBonusEntries(classRule: {
    statBonus?: ClassBonusRule;
    statBonuses?: ClassBonusRule[]
} | undefined): ClassBonusRule[] {
    if (!classRule) return []
    if (Array.isArray(classRule.statBonuses) && classRule.statBonuses.length > 0) {
        return classRule.statBonuses
    }
    const single = classRule.statBonus
    if (single && typeof single === "object") return [single]
    return []
}

/** Matches character sheet: max class level, or 1 if multiclass list is empty. */
export function getCharacterLevelForStats(classes: ClassLevel[]): number {
    return classes.length > 0
        ? Math.max(...classes.map(c => c.level))
        : 1;
}

export function sumClassStatBonus(
    classes: ClassLevel[],
    rulesData: any,
    statName: string
): number {
    return classes.reduce((total: number, cls: ClassLevel) => {
        const classRule = rulesData?.classes?.[cls.id]
        let row = 0
        for (const bonus of classStatBonusEntries(classRule)) {
            if (bonus.stat !== statName) continue
            if (bonus.once) {
                if (cls.level >= 1) row += bonus.amount
            } else {
                const applications = Math.floor(cls.level / (bonus.frequency || 1))
                row += applications * bonus.amount
            }
        }
        return total + row
    }, 0)
}

type TraitLike = {
    effects?: Array<{ type: string; stat?: string; value?: string; when?: string }>
}

export type StatChangeContext = {
    isDualWielding?: boolean
}

function statChangeApplies(
    effect: { when?: string },
    context: StatChangeContext | undefined
): boolean {
    const when = effect.when?.trim()
    if (!when) return true
    if (when === "dualWielding") return context?.isDualWielding === true
    return false
}

/** Sums StatChange effects for a stat key (e.g. might, maxHP). */
export function sumTraitStatChangeEffects(
    traits: TraitLike[],
    statName: string,
    context?: StatChangeContext
): number {
    return traits.reduce((total, trait) => {
        const bonuses =
            trait.effects?.filter(
                (e) =>
                    e.type === "StatChange" &&
                    e.stat === statName &&
                    statChangeApplies(e, context)
            ) || []
        const sum = bonuses.reduce((s, b) => s + parseInt(b.value ?? "0", 10), 0)
        return total + sum
    }, 0)
}

/**
 * Gear bonuses from equipped items. Slots may be hydrated item objects or inventory UIDs
 * (same resolution as the character sheet after item hydration).
 */
export function sumGearStatBonus(
    character: { equipment?: any; inventory?: any[] } | null | undefined,
    statName: string
): number {
    if (!character?.equipment) return 0;
    const eq = character.equipment;
    const inv = character.inventory || [];

    const resolve = (slot: unknown): any => {
        if (slot == null) return null;
        if (typeof slot === "object" && slot !== null && "statBonuses" in (slot as object)) {
            return slot;
        }
        const uid = typeof slot === "string" ? slot : (slot as { uid?: string })?.uid;
        if (!uid) return null;
        return inv.find((i: any) => String(i.uid) === String(uid)) ?? null;
    };

    const equipped = [
        resolve(eq.activeWeapon),
        resolve(eq.armor),
        ...Object.values(eq.accessories || {}).map(resolve),
    ].filter(Boolean);

    return equipped.reduce(
        (total: number, item: any) => total + (item.statBonuses?.[statName] ?? 0),
        0
    );
}

/** Character sheet formula for max HP (effective might already includes trait/gear attribute bonuses). */
export function computeMaxHP(params: {
    effectiveMight: number;
    characterLevel: number;
    classHpBonus: number;
    gearHpBonus: number;
    traitMaxHpBonus: number;
}): number {
    // return (
    //     params.effectiveMight +
    //     5 * params.characterLevel +
    //     params.classHpBonus +
    //     params.gearHpBonus +
    //     params.traitMaxHpBonus
    // );
    return (
        Math.floor(params.effectiveMight / 2) +
        2 * params.characterLevel +
        7 +
        params.classHpBonus +
        params.gearHpBonus +
        params.traitMaxHpBonus
    );
}

/** Character sheet formula for max MP. */
export function computeMaxMP(params: {
    effectiveWillpower: number;
    characterLevel: number;
    classMpBonus: number;
    gearMpBonus: number;
    traitMaxMpBonus: number;
}): number {
    return (
        params.characterLevel +
        2 * params.effectiveWillpower +
        params.classMpBonus +
        params.gearMpBonus +
        params.traitMaxMpBonus
    );
}

/** Character sheet formula for Speed (base 4 + class + gear + trait StatChange on "speed"). */
export function computeSpeed(params: {
    classSpeedBonus: number;
    gearSpeedBonus: number;
    traitSpeedBonus: number;
}): number {
    return 4 + params.classSpeedBonus + params.gearSpeedBonus + params.traitSpeedBonus;
}
