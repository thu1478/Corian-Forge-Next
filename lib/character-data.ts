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
    id: string
    name: string
    description: string
    equipped: boolean
    isDefault?: boolean // Opportunity Attack and Start of Turn are always equipped
}

export interface Reaction {
  id: string
  name: string
  trigger: string
  effect: string
  equipped: boolean
  isDefault?: boolean
}

export interface CharacterClass {
  name: string
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
  attribute: "might" | "agility" | "reason" | "willpower" | "presence"
  hasExpertise: boolean
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  description: string
  type?: "weapon" | "armor" | "accessory" | "consumable" | "misc"
  damage?: string // For weapons
  slot?: keyof Equipment["accessories"] | "rightHand" | "leftHand" | "armor" // What slot this can equip to
}

export interface Equipment {
  rightHand: string | null
  leftHand: string | null
  armor: string | null
  accessories: {
    head: string | null
    face: string | null
    ears: string | null
    neck: string | null
    back: string | null
    hands: string | null
    ringLeft: string | null
    ringRight: string | null
    waist: string | null
    feet: string | null
  }
}

export interface Bond {
  id: string
  target: string
  type: "admiration" | "inferiority" | "loyalty" | "mistrust" | "affection" | "hatred"
}

export interface Character {
  // Character Info
  name: string
  level: number
  age: number
  gender: string
  race: string
  profileImage?: string
  background: string
  backstory: string

  // Classes
  classes: CharacterClass[]

  // Combat Resources
  hp: { current: number; max: number }
  barrier: { current: number; max: number }
  mp: { current: number; max: number }
  focus: { current: number; max: number }
  ap: { current: number; max: number }

  // Attributes (stat + modifier)
  attributes: {
    might: number
    agility: number
    reason: number
    willpower: number
    presence: number
  }

  // Non-resource stats
  defense: number
  stability: number
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
  inventory: InventoryItem[]

  // Equipment
  equipment: Equipment

  // Bonds
  bonds: Bond[]
}

export const defaultCharacter: Character = {
  // Character Info
  name: "Kira Shadowmend",
  level: 4,
  age: 27,
  gender: "Female",
  race: "Half-Elf",
  profileImage: "",
  background: "Shadow Touched Mercenary",
  backstory: "Born under a lunar eclipse in the border town of Ashwick, Kira's half-elven heritage made her an outsider in both human and elven societies. Her mother, an elven diplomat, was killed when Kira was twelve during a political assassination that was never solved. This tragedy awakened her latent magical abilities - a dark, shadow-tinged arcane power that frightened the townsfolk.\n\nShe spent her teenage years in the Shadow Guild, learning to harness her abilities and survive in the underworld of Ashwick. However, when the Guild demanded she assassinate an innocent family to prove her loyalty, she fled, becoming a freelance mercenary and adventurer.\n\nNow she travels with her current party, seeking both redemption for her past and answers about who ordered her mother's death. Her sister Elara, whom she left behind in Ashwick, is one of the few people she truly trusts.",

  // Classes
  classes: [
    { name: "Spellblade", level: 3 },
    { name: "Rogue", level: 1 }
  ],

  // Combat Resources
  hp: { current: 42, max: 56 },
  barrier: { current: 8, max: 12 },
  mp: { current: 18, max: 24 },
  focus: { current: 2, max: 3 },
  ap: { current: 3, max: 3 },

  // Attributes
  attributes: {
    might: 14,
    agility: 16,
    reason: 15,
    willpower: 12,
    presence: 13
  },

  // Non-resource stats
  defense: 16,
  stability: 14,
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
      id: "ff-1",
      name: "Start of Turn",
      description: "Regain 1 Focus at the start of your turn.",
      equipped: true,
      isDefault: true
    },
    {
      id: "ff-2",
      name: "Arcane Surge",
      description: "When you spend MP, gain +1 to your next attack roll.",
      equipped: true
    },
    {
      id: "ff-3",
      name: "Shadow Attunement",
      description: "While in dim light or darkness, gain +2 to Stealth checks.",
      equipped: true
    },
    {
      id: "ff-4",
      name: "Mana Recovery",
      description: "When you critically hit, recover 2 MP.",
      equipped: false
    }
  ],

  // Reactions
  reactions: [
    {
      id: "r-1",
      name: "Opportunity Attack",
      trigger: "When an enemy leaves your reach",
      effect: "Make a melee attack against the creature.",
      equipped: true,
      isDefault: true
    },
    {
      id: "r-2",
      name: "Mana Shield",
      trigger: "When you would take damage",
      effect: "Spend up to 6 MP to reduce damage by twice the MP spent.",
      equipped: true
    },
    {
      id: "r-3",
      name: "Parry",
      trigger: "When hit by a melee attack",
      effect: "Roll weapon die and reduce damage by that amount. If reduced to 0, make a free Blade Strike.",
      equipped: true
    },
    {
      id: "r-4",
      name: "Counterspell",
      trigger: "When a creature within 60ft casts a spell",
      effect: "Spend 4 MP to attempt to interrupt the spell with a contested Reason check.",
      equipped: false
    }
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
    { name: "Athletics", attribute: "might", hasExpertise: false },
    { name: "Acrobatics", attribute: "agility", hasExpertise: true },
    { name: "Stealth", attribute: "agility", hasExpertise: true },
    { name: "Arcana", attribute: "reason", hasExpertise: false },
    { name: "Investigation", attribute: "reason", hasExpertise: false },
    { name: "Perception", attribute: "willpower", hasExpertise: false },
    { name: "Insight", attribute: "willpower", hasExpertise: false },
    { name: "Intimidation", attribute: "presence", hasExpertise: false },
    { name: "Persuasion", attribute: "presence", hasExpertise: false }
  ],

  // Inventory
  money: 127,
  ip: 15,
  inventory: [
    // Weapons
    { id: "i-w1", name: "Shadowsteel Longsword", quantity: 1, description: "+2 Slashing, Shadow-touched", type: "weapon", damage: "1d8+2", slot: "rightHand" },
    { id: "i-w2", name: "Arcane Focus Crystal", quantity: 1, description: "Channels arcane energy", type: "weapon", damage: "1d6", slot: "rightHand" },
    { id: "i-w3", name: "Dagger", quantity: 2, description: "Light, Finesse, Thrown", type: "weapon", damage: "1d4+3", slot: "rightHand" },
    // Armor
    { id: "i-a1", name: "Leather Armor of Shadows", quantity: 1, description: "+2 Stealth in dim light", type: "armor", slot: "armor" },
    // Accessories
    { id: "i-acc1", name: "Silver Earring of Whispers", quantity: 1, description: "+2 Perception for hearing", type: "accessory", slot: "ears" },
    { id: "i-acc2", name: "Amulet of Minor Protection", quantity: 1, description: "+1 to all saves", type: "accessory", slot: "neck" },
    { id: "i-acc3", name: "Traveler's Cloak", quantity: 1, description: "Resistance to cold weather", type: "accessory", slot: "back" },
    { id: "i-acc4", name: "Fingerless Gloves", quantity: 1, description: "Better grip for climbing", type: "accessory", slot: "hands" },
    { id: "i-acc5", name: "Ring of Minor Protection", quantity: 1, description: "+1 AC", type: "accessory", slot: "ringLeft" },
    { id: "i-acc6", name: "Utility Belt", quantity: 1, description: "Quick access to small items", type: "accessory", slot: "waist" },
    { id: "i-acc7", name: "Soft Leather Boots", quantity: 1, description: "+1 Stealth", type: "accessory", slot: "feet" },
    { id: "i-acc8", name: "Circlet of Clarity", quantity: 1, description: "+1 to Reason checks", type: "accessory", slot: "head" },
    { id: "i-acc9", name: "Ring of Jumping", quantity: 1, description: "Triple jump distance", type: "accessory", slot: "ringRight" },
    { id: "i-acc10", name: "Mask of Many Faces", quantity: 1, description: "Cast Disguise Self at will", type: "accessory", slot: "face" },
    // Consumables
    { id: "i-1", name: "Health Potion", quantity: 3, description: "Restore 2d8+4 HP", type: "consumable" },
    { id: "i-2", name: "Mana Crystal", quantity: 2, description: "Restore 10 MP", type: "consumable" },
    // Misc
    { id: "i-3", name: "Rope (50 ft)", quantity: 1, description: "Standard hempen rope", type: "misc" },
    { id: "i-4", name: "Rations", quantity: 5, description: "One day's food", type: "misc" },
    { id: "i-5", name: "Torch", quantity: 3, description: "Light for 1 hour", type: "misc" }
  ],

  // Equipment
  equipment: {
    rightHand: "Shadowsteel Longsword",
    leftHand: "Arcane Focus Crystal",
    armor: "Leather Armor of Shadows",
    accessories: {
      head: null,
      face: null,
      ears: "Silver Earring of Whispers",
      neck: "Amulet of Minor Protection",
      back: "Traveler's Cloak",
      hands: "Fingerless Gloves",
      ringLeft: "Ring of Minor Protection",
      ringRight: null,
      waist: "Utility Belt",
      feet: "Soft Leather Boots"
    }
  },

  // Bonds
  bonds: [
    { id: "b-1", target: "Marcus (Party Leader)", type: "loyalty" },
    { id: "b-2", target: "Elara (Sister)", type: "affection" },
    { id: "b-3", target: "The Shadow Guild", type: "mistrust" }
  ]
}

export function getAttributeModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}
