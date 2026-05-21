import { CharAttribute, type PowerRoll } from "@/lib/rules"
import { traitRefsIncludeId } from "@/lib/trait-helpers"
import type { InventionModuleConfig } from "@/lib/character-data"

export const EQUIPMENT_RULES = {
    getNewState: (slot: string, item: any, prev: any) => {
        const incomingUid = item?.uid || null;
        const equipment = prev.equipment || {};

        // Match the dump: "activeWeapon" <-> "offhand"
        const otherKey = slot === "activeWeapon" ? "offhand" : "activeWeapon";

        // Pulling values directly from the equipment object in your dump
        const currentOtherValue = equipment[otherKey];
        const currentSlotValue = equipment[slot];

        // 1. Initialize updates
        let updates: any = {
            [slot]: incomingUid,
            [otherKey]: currentOtherValue
        };

        if (!incomingUid) return { equipment: { ...equipment, ...updates } };

        // 2. Handle 2-Handers
        if (item.type === '2H') {
            updates[otherKey] = null;
            return { equipment: { ...equipment, ...updates } };
        }

        // 3. The Swap Check
        // If the ID we are clicking (incomingUid) is currently in the OTHER hand, it's a swap.
        const isMovingFromOtherSlot = currentOtherValue === incomingUid;

        if (isMovingFromOtherSlot) {
            // If the hand we're equipping *into* had a shield, clear the other hand instead of swapping
            // (shield rules / one-handed flow). `currentSlotValue` may be null when that hand was empty.
            const slotUid = currentSlotValue;
            const invItem = Array.isArray(prev.inventory)
                ? prev.inventory.find((i: any) => i && String(i.uid) === String(slotUid))
                : null;
            const isShield =
                invItem?.type === "shield" ||
                (typeof slotUid === "string" && slotUid.includes("shield"));

            const shieldMaster = traitRefsIncludeId(prev.traits, "shieldMaster");
            updates[otherKey] = isShield && !shieldMaster ? null : currentSlotValue;
        }

        // 4. Return the nested structure to match your "FULL EQUIPMENT DUMP2"
        return {
            equipment: {
                ...equipment,
                ...updates
            }
        };
    }
};

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
    /** Active invention modules on this instance (Modular Armor / Support Backpack). */
    inventionModules?: string[];
    inventionModuleConfig?: InventionModuleConfig;
}

interface BaseItem {
    id: string;
    uid: string;
    name: string;
    /** Save-only override; reflected in `name` when hydrated. */
    customName?: string;
    quantity: number;
    description: string;
    tags: string[];
    containerId?: string | null;
    charges?: { current: number; max: number };
    value?: number;
    allowedSlots?: Array<keyof Equipment["accessories"] | "rightHand" | "leftHand" | "armor">;
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