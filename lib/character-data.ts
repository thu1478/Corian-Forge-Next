import {ArmorItem, Equipment, InventoryEntry, InventoryItem, MiscItem, WeaponItem} from "@/lib/equipment-data";

export interface ActionCard {
    id: string
    name: string
    type: "attack" | "skill" | "spell" | "reaction" | "utility"
    apCost: number
    mpCost?: number
    focusCost?: number
    range?: string
    target?: string
    duration?: string
    effect: string
    damage?: string
    damageType?: string
    tags: string[]
    cooldown?: string
    requirements?: string
}

export interface FocusFeature {
    classSrc: string
    slotIndex: number
}

export interface Reaction {
    id: string
    slotIndex: number
    charges: number
}

export interface CharacterClass {
    id: string
    level: number
}

export interface Trait {
    id: string
    name: string
    source: "racial" | "feat" | "class" | "background" | "other"
    description: string
}

export interface Skill {
    name: string
    attribute: "might" | "dexterity" | "reason" | "willpower" | "presence"
    hasExpertise: boolean
}

export interface Bond {
    id: string
    target: string
    type: "admiration" | "inferiority" | "loyalty" | "mistrust" | "affection" | "hatred"
}

export interface Character {
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

    // Attributes (stat + modifier)
    attributes: {
        might: number
        dexterity: number
        reason: number
        willpower: number
        presence: number
    }

    // Non-resource stats
    speed: number

    // Other stats
    resistances: string[]
    vulnerabilities: string[]
    xp: number
    inspiration: number
    victories: number

    // Focus Features & Reactions
    focusFeatures: FocusFeature[]
    reactions: Reaction[]

    // Actions
    actions: ActionCard[]

    // Traits
    traits: Trait[]

    // Languages
    languages: string[]

    // Skills
    skills: Skill[]

    // Inventory
    money: number
    ip: number
    inventory: InventoryEntry[]

    // Equipment
    equipment: Equipment

    // Bonds
    bonds: Bond[]
}

export interface HydratedCharacter extends Omit<Character, 'equipment' | 'inventory'> {
    inventory: InventoryItem[];
    equipment: {
        activeWeapon: WeaponItem | null;
        armor: ArmorItem | null;
        accessories: Record<string, MiscItem | null>;
    };
}

export const defaultCharacter: Character = {
    // Character Info
    name: "Kira Shadowmend",
    age: 27,
    gender: "Female",
    race: "Half-Elf",
    profileImage: "",
    background: "Shadow Touched Mercenary",
    backstory: "Born under a lunar eclipse in the border town of Ashwick, Kira's half-elven heritage made her an outsider in both human and elven societies. Her mother, an elven diplomat, was killed when Kira was twelve during a political assassination that was never solved. This tragedy awakened her latent magical abilities - a dark, shadow-tinged arcane power that frightened the townsfolk.\n\nShe spent her teenage years in the Shadow Guild, learning to harness her abilities and survive in the underworld of Ashwick. However, when the Guild demanded she assassinate an innocent family to prove her loyalty, she fled, becoming a freelance mercenary and adventurer.\n\nNow she travels with her current party, seeking both redemption for her past and answers about who ordered her mother's death. Her sister Elara, whom she left behind in Ashwick, is one of the few people she truly trusts.",

    // Classes
    classes: [
        {id: "weaponmaster", level: 3},
        {id: "sorcerer", level: 1}
    ],

    // Combat Resources
    hp: 20,
    barrier: 8,
    mp: 18,
    focus: 3,

    // Attributes
    attributes: {
        might: 14,
        dexterity: 16,
        reason: 15,
        willpower: 12,
        presence: 13
    },

    // Non-resource stats
    speed: 30,

    // Other stats
    resistances: ["Arcane", "Cold"],
    vulnerabilities: ["Fire"],
    xp: 2450,
    inspiration: 2,
    victories: 7,

    // Focus Features
    focusFeatures: [
        {
            classSrc: "weaponmaster",
            slotIndex: -1
        },
        {
            classSrc: "sorcerer",
            slotIndex: -1
        },
    ],

    // Reactions
    reactions: [
        {
            id: "counterattack",
            slotIndex: -1,
            charges: -1
        },
        {
            id: "parry",
            slotIndex: -1,
            charges: 0
        },
    ],

    // Actions
    actions: [
        {
            id: "1",
            name: "Blade Strike",
            type: "attack",
            apCost: 1,
            range: "Melee",
            target: "Single",
            effect: "Make a melee attack against one creature within reach. On hit, deal weapon damage plus your Might modifier.",
            damage: "1d8+2",
            damageType: "Slashing",
            tags: ["Weapon", "Melee", "Basic"]
        },
        {
            id: "2",
            name: "Arcane Slash",
            type: "attack",
            apCost: 2,
            mpCost: 4,
            range: "Melee",
            target: "Single",
            effect: "Infuse your blade with arcane energy and strike. On hit, deal weapon damage plus additional arcane damage. The target must succeed on a Stability check or be Dazed until the end of their next turn.",
            damage: "1d8+2 + 2d6",
            damageType: "Slashing + Arcane",
            tags: ["Weapon", "Melee", "Magic", "Debuff"]
        },
        {
            id: "3",
            name: "Shadow Step",
            type: "skill",
            apCost: 1,
            focusCost: 1,
            range: "Self",
            effect: "Teleport up to 20 feet to an unoccupied space you can see. You gain advantage on your next attack this turn if made from behind the target.",
            duration: "Instant",
            tags: ["Movement", "Teleport", "Stealth"],
            cooldown: "1 round"
        },
        {
            id: "5",
            name: "Whirlwind Cut",
            type: "attack",
            apCost: 2,
            focusCost: 1,
            range: "Melee",
            target: "All Adjacent",
            effect: "Spin with your blade extended, striking all enemies within melee range. Make a single attack roll compared against each target's Defense.",
            damage: "1d8+2",
            damageType: "Slashing",
            tags: ["Weapon", "Melee", "AoE"]
        },
        {
            id: "6",
            name: "Arcane Bolt",
            type: "spell",
            apCost: 1,
            mpCost: 3,
            range: "60 ft",
            target: "Single",
            effect: "Launch a bolt of pure arcane energy at a target. This attack automatically hits and cannot be dodged, but can be resisted with Stability to halve damage.",
            damage: "2d6",
            damageType: "Arcane",
            tags: ["Magic", "Ranged", "Auto-hit"]
        },
        {
            id: "7",
            name: "Blade Ward",
            type: "utility",
            apCost: 1,
            mpCost: 2,
            range: "Self",
            target: "Self",
            duration: "3 rounds",
            effect: "Create a protective ward around yourself. Gain +2 to Defense and resistance to Slashing, Piercing, and Bludgeoning damage.",
            tags: ["Defense", "Buff", "Magic"]
        },
        {
            id: "8",
            name: "Execute",
            type: "attack",
            apCost: 3,
            focusCost: 2,
            range: "Melee",
            target: "Single",
            effect: "A devastating finishing blow. If the target is below 25% health, this attack deals triple damage. Otherwise, deal double weapon damage.",
            damage: "3d8+6",
            damageType: "Slashing",
            tags: ["Weapon", "Melee", "Finisher", "High Damage"],
            requirements: "Must be in melee range"
        },
        {
            id: "10",
            name: "Analyze Weakness",
            type: "utility",
            apCost: 1,
            range: "30 ft",
            target: "Single",
            duration: "Until end of combat",
            effect: "Study an enemy to find their weak points. Make a Reason check against their Stability. On success, you and your allies gain +2 to attack rolls against this target and deal an extra 1d4 damage.",
            tags: ["Tactical", "Buff", "Support"]
        }
    ],

    // Traits
    traits: [
        {
            id: "t-1",
            name: "Darkvision",
            source: "racial",
            description: "You can see in dim light within 60 feet as if it were bright light."
        },
        {
            id: "t-2",
            name: "Fey Ancestry",
            source: "racial",
            description: "You have advantage on checks against being Charmed."
        },
        {
            id: "t-3",
            name: "Arcane Attunement",
            source: "class",
            description: "You can sense magical auras within 30 feet."
        },
        {
            id: "t-4",
            name: "Dual Wielder",
            source: "feat",
            description: "You gain +1 Defense while wielding two weapons, and can draw or stow two weapons at once."
        }
    ],

    // Languages
    languages: ["Common", "Elvish", "Draconic"],

    // Skills
    skills: [
        {name: "Athletics", attribute: "might", hasExpertise: false},
        {name: "Acrobatics", attribute: "dexterity", hasExpertise: true},
        {name: "Stealth", attribute: "dexterity", hasExpertise: true},
        {name: "Arcana", attribute: "reason", hasExpertise: false},
        {name: "Investigation", attribute: "reason", hasExpertise: false},
        {name: "Perception", attribute: "willpower", hasExpertise: false},
        {name: "Insight", attribute: "willpower", hasExpertise: false},
        {name: "Intimidation", attribute: "presence", hasExpertise: false},
        {name: "Persuasion", attribute: "presence", hasExpertise: false}
    ],

    // Inventory
    money: 127,
    ip: 15,
    inventory: [
        { id: "i-w1", uid: "i-w1-v4n9z2" },
        { id: "i-w1", uid: "i-w1-v4n9z6" },
        { id: "i-w2", uid: "i-w2-x7m3k1" },
        { id: "i-w3", uid: "i-w3-p9l5r8" },
        { id: "i-a1", uid: "i-a1-q2w4e6" },
        { id: "i-a2", uid: "i-a2-t8y1u3" },
        { id: "i-a3", uid: "i-a3-i0o2p4" },
        { id: "i-a4", uid: "i-a4-a7s9d1" },
        { id: "i-acc1", uid: "i-acc1-f3g5h7" },
        { id: "i-acc2", uid: "i-acc2-j9k1l3" },
        { id: "i-acc3", uid: "i-acc3-z8x0c2" },
        { id: "i-1", uid: "i-1-v4b6n8" },
        { id: "i-3", uid: "i-3-m1q3w5" }
    ],

    // Equipment
    equipment: {
        activeWeapon: "i-w1-v4n9z2",
        armor: "i-a1-q2w4e6",
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

    // Bonds
    bonds: [
        {id: "b-1", target: "Marcus (Party Leader)", type: "loyalty"},
        {id: "b-2", target: "Elara (Sister)", type: "affection"},
        {id: "b-3", target: "The Shadow Guild", type: "mistrust"}
    ]
}

export function getAttributeModifier(score: number): number {
    return Math.floor((score - 10) / 2)
}

export function formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`
}
