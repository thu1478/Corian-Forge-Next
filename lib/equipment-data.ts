import { CharAttribute, type ChargeDefinition, type PowerRoll } from "@/lib/rules"
import type { InventionModuleConfig } from "@/lib/character-data"
import type { EquipmentSlotRef } from "@/logic/equipment/accessory-slots"

export interface InventoryContainer {
    id: string;
    name: string;
}

export interface InventoryEntry {
    id: string;
    uid: string;
    /** Stack count; defaults from item rules when omitted. */
    quantity?: number;
    /** Items with no container (or null) are carried loose (not inside any bag). */
    containerId?: string | null;
    /** Local display name only; does not change rules catalog. */
    customName?: string;
    /** Item quality tier id — see `rules.system.itemRanks`; instance overrides catalog default. */
    rank?: string;
    /** Active invention modules on this instance (Modular Armor / Support Backpack). */
    inventionModules?: string[];
    inventionModuleConfig?: InventionModuleConfig;
    /** Current charge count; `-1` = not tracked. Max comes from item rules. */
    charges?: number;
}

interface BaseItem {
    id: string;
    uid: string;
    name: string;
    /** Save-only override; reflected in `name` when hydrated. */
    customName?: string;
    /** Quality tier id from catalog or save override; colors name via `rules.system.itemRanks`. */
    rank?: string;
    quantity: number;
    description: string;
    tags: string[];
    containerId?: string | null;
    /** Hydrated charge snapshot for UI; save uses `InventoryEntry.charges`. */
    charges?: { current: number; max: number };
    fixedMaxCharges?: number;
    chargeReset?: ChargeDefinition["chargeReset"];
    value?: number;
    allowedSlots?: EquipmentSlotRef[];
    actionIDs?: string[];
    /** Rule ids and/or inline `{ traitId: passive }` objects from catalog. */
    traits?: Array<string | Record<string, unknown>>;
    inventionModules?: string[];
    inventionModuleConfig?: InventionModuleConfig;
    /** Optional item effect table (e.g. consumables, coatings); not merged into combat actions. */
    powerRoll?: PowerRoll;
}

// 2. Define specific "Sub-Types"
export interface WeaponItem extends BaseItem {
    type: "weapon"; // This is the "Discriminant"
    damage: number;
    damageType: string;
    range: number;
    attributes: CharAttribute[]
}

export interface ShieldItem extends BaseItem {
    type: "shield";
    defense: number;
    stability?: number;
}

export interface ArmorItem extends BaseItem {
    type: "armor";
    defense: {
        value: number,
        attribute?: string,
        attrMax?: number
    };
    stability: number;
    statBonuses?: Record<string, number>;
}

// Other items
export interface ConsumableItem extends BaseItem {
    type: "consumable";
}

/** Inventory bag as an item; children use `containerId` = this instance's `uid`. */
export interface ContainerItem extends BaseItem {
    type: "container";
    /** Max total item quantity inside (sum of stack sizes); omit for unlimited. */
    containerCapacity?: number;
    /** If set and non-empty, only these item types may be stored. Omit for any type (except nested containers). */
    containerAllowedTypes?: Array<"weapon" | "shield" | "armor" | "misc" | "consumable">;
}

export interface MiscItem extends BaseItem {
    type: "misc";
}

// 3. Combine them into a single Union Type
export type InventoryItem = WeaponItem | ShieldItem | ArmorItem | ConsumableItem | MiscItem | ContainerItem;

export interface Equipment {
    activeWeapon: string | null
    offhand: string | null
    armor: string | null
    accessories: {
        head: string | null
        neck: string | null
        waist: string | null
        wristLeft: string | null
        wristRight: string | null
        feet: string | null
    }
}