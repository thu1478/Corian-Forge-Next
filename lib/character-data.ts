import {ArmorItem, Equipment, InventoryEntry, InventoryItem, MiscItem, WeaponItem} from "@/lib/equipment-data";
import {
    ActionCard,
    Bond,
    CharacterClass,
    CharAttribute, Condition,
    DamageType,
    FocusFeature, PotencyDuration, PotencyStrength,
    Reaction,
    Skill,
    Trait
} from "@/components/rules/rules";

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
    speed: 4,

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
            name: "Swing",
            type: "action",
            description: "Swing your weapon",
            apCost: 2,
            range: "Wpn",
            damageType: DamageType.Slashing,
            powerRoll: {
                rollStats: [CharAttribute.Might, CharAttribute.Dexterity],
                // Tier 1
                tier1Dmg: 0,
                tier1Wpn: true,

                // Tier 2
                tier2Dmg: 1,
                tier2Wpn: true,

                // Tier 3
                tier3Dmg: 2,
                tier3Wpn: true,
                tier3Effect: {
                    type: 'Condition',
                    effect: Condition.BLEEDING,
                    duration: PotencyDuration.TurnEnd
                }
            },
            tags: ["Melee", "Weapon"],
            source: "Equipment"
        },
        {
            id: "2",
            name: "Stab",
            type: "action",
            description: "Stab with the weapon",
            apCost: 2,
            range: "Wpn",
            damageType: DamageType.Slashing,
            powerRoll: {
                rollStats: [CharAttribute.Might, CharAttribute.Dexterity],
                // Tier 1
                tier1Dmg: 0,
                tier1Wpn: true,

                // Tier 2
                tier2Dmg: 1,
                tier2Wpn: true,
                tier2Effect: {
                    type: 'Condition',
                    effect: Condition.HEMORRHAGE,
                    duration: PotencyDuration.None
                },

                // Tier 3
                tier3Dmg: 2,
                tier3Wpn: true,
                tier3Effect: {
                    type: 'Condition',
                    effect: Condition.HEMORRHAGE,
                    duration: PotencyDuration.None
                }
            },
            tags: ["Melee", "Weapon"],
            source: "Equipment"
        },
        {
            id: "3",
            name: "Raise Shield",
            type: "action",
            description: "Raise your shield",
            apCost: 2,
            tags: [],
            source: "Equipment"
        },
        {
            id: "4",
            name: "Icicle Lance",
            type: "action",
            description: "Fire two sharp icicles at multiple targets",
            apCost: 2,
            mpCost: 8,
            focusCost: 1,
            range: "10",
            damageType: DamageType.Water,
            powerRoll: {
                rollStats: [CharAttribute.Reason],
                // Tier 1
                tier1Dmg: 3,
                tier1Wpn: false,

                // Tier 2
                tier2Dmg: 4,
                tier2Wpn: false,

                // Tier 3
                tier3Dmg: 6,
                tier3Wpn: false,
                tier3Effect: {
                    type: 'Condition',
                    srcStats: [CharAttribute.Reason],
                    targetStats: [CharAttribute.Dexterity],
                    effect: Condition.SLOWED,
                    duration: PotencyDuration.TurnEnd,
                    strength: PotencyStrength.Strong
                }
            },
            tags: ["Ranged", "Spell", "Multi(2)"],
            source: "Sorcerer"
        },
        {
            id: "5",
            name: "Fireball",
            type: "action",
            description: "Choose a target. The target must be a creature. Charge up a powerful concentration of flames that explodes in a 3x3 area once it hits its target dealing fire (fire) damage to all creatures in the area. The target is pushed away from the caster, but other creatures in the area are pushed away from the target. If you take at least 10 damage in one turn the explosive orb explodes prematurely on your location. In this case the push affecting you is changed to vertical push upwards. After the attack flames remain in the area for 1 minute",
            apCost: 2,
            focusCost: 3,
            mpCost: 10,
            range: "10",
            damageType: DamageType.Water,
            powerRoll: {
                rollStats: [CharAttribute.Reason],
                // Tier 1
                tier1Dmg: 5,
                tier1Wpn: false,
                tier1Effect: {
                    type: 'ForcedMovement',
                    effect: 'push',
                    distance: 2
                },

                // Tier 2
                tier2Dmg: 7,
                tier2Wpn: false,
                tier2Effect: {
                    type: 'ForcedMovement',
                    effect: 'push',
                    distance: 3
                },

                // Tier 3
                tier3Dmg: 9,
                tier3Wpn: false,
                tier3Effect: {
                    type: 'ForcedMovement',
                    effect: 'push',
                    distance: 4
                },
            },
            tags: ["Ranged", "Spell", "Area", "Delay"],
            source: "Sorcerer"
        },
        {
            id: "6",
            name: "Steal",
            type: "action",
            description: "Attempt to steal something. You may only steal from each such enemy once per combat",
            apCost: 1,
            range: "1",
            powerRoll: {
                rollStats: [CharAttribute.Dexterity],
                tier1Effect: {
                    type: 'Special',
                    effect: "You get 10 Zenny"
                },

                // Tier 2
                tier2Effect: {
                    type: 'Special',
                    effect: "You get 1 IP and 20 Zenny"
                },

                // Tier 3
                tier3Effect: {
                    type: 'Special',
                    effect: "You get 3 IP and 50 Zenny"
                },
            },
            tags: ["Melee"],
            source: "Scout"
        },
        {
            id: "7",
            name: "Flashbang",
            type: "action",
            description: "Throw a flashbang to blind enemies in a 2x2 area",
            apCost: 1,
            focusCost: 5,
            ipCost: 3,
            range: "3",
            powerRoll: {
                rollStats: [CharAttribute.Dexterity],
                tier1Effect: {
                    type: 'Condition',
                    srcStats: [CharAttribute.Dexterity],
                    targetStats: [CharAttribute.Dexterity],
                    effect: Condition.SHAKEN,
                    duration: PotencyDuration.RoundEnd,
                    strength: PotencyStrength.Weak
                },

                // Tier 2
                tier2Effect: {
                    type: 'Condition',
                    srcStats: [CharAttribute.Dexterity],
                    targetStats: [CharAttribute.Dexterity],
                    effect: Condition.SHAKEN,
                    duration: PotencyDuration.RoundEnd,
                    strength: PotencyStrength.Average
                },

                // Tier 3
                tier3Effect: {
                    type: 'Condition',
                    srcStats: [CharAttribute.Dexterity],
                    targetStats: [CharAttribute.Dexterity],
                    effect: Condition.SHAKEN,
                    duration: PotencyDuration.RoundEnd,
                    strength: PotencyStrength.Strong
                },
            },
            tags: ["Ranged, Area"],
            source: "Scout"
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
