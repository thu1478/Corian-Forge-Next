import {Equipment, InventoryEntry,} from "@/lib/equipment-data";
import {Bond, CharacterClass, FocusFeature, Skill} from "@/lib/rules";
import {ActionRef, ReactionRef, TraitRef} from "@/lib/baseRefs";

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
    reactions: ReactionRef[]

    // Actions
    actions: ActionRef[]

    // Traits
    traits: TraitRef[]

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

export const defaultCharacter: CharacterSaveData = {
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
    speed: 4,

    // Other stats
    resistances: ["Water", "Nature"],
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
        {
            id: "returnFire",
            slotIndex: -1,
            charges: 0
        },
    ],

    // Actions
    actions: [
        {id: "honedStrike"},
        {id: "partingSlash"},
        {id: "acidSplash"},
        {id: "shadowSpears"},
    ],

    // Traits
    traits: [
        {
            id: "statBuffTest",
            source: "Innate"
        },
        {
            id: "resistTest",
            source: "Innate"
        },
        {
            id: "weaponBond",
            source: "Weaponmaster"
        },
        {
            id: "bladestorm",
            source: "Weaponmaster"
        },
        {
            id: "statBuffTest2",
            source: "Innate"
        },
        {
            id: "statBuffTest3",
            source: "Innate"
        },
        {
            id: "languageTest",
            source: "Innate"
        },
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
    ip: 3,
    inventory: [
        {id: "sword_w1", uid: "sword_w1-v4n9z2"},
        {id: "shield_s1", uid: "shield_s1-v4n9z2"},
        {id: "wand_w2", uid: "wand_w2-x7m3k1"},
        {id: "dagger_w1", uid: "dagger_w1-p9l5r8"},
        {id: "i-a1", uid: "i-a1-q2w4e6"},
        {id: "i-a2", uid: "i-a2-t8y1u3"},
        {id: "i-a3", uid: "i-a3-i0o2p4"},
        {id: "i-a4", uid: "i-a4-a7s9d1"},
        {id: "i-acc1", uid: "i-acc1-f3g5h7"},
        {id: "i-acc2", uid: "i-acc2-j9k1l3"},
        {id: "i-acc3", uid: "i-acc3-z8x0c2"},
        {id: "i-1", uid: "i-1-v4b6n8"},
        {id: "i-3", uid: "i-3-m1q3w5"}
    ],

    // Equipment
    equipment: {
        activeWeapon: "sword_w1-v4n9z2",
        offhand: "shield_s1-v4n9z2",
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
