import {CharAttribute} from "@/lib/rules";

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
            // Find if the thing we're bumping is a Shield
            const isShield = prev.equipment[slot].includes("shield")

            console.log("other: " + otherKey)
            console.log("slot: " + prev.equipment[slot])
            console.log("isShield: " + isShield)

            updates[otherKey] = isShield ? null : currentSlotValue;
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

export interface InventoryEntry {
    id: string;
    uid: string;
}

interface BaseItem {
    id: string;
    uid: string;
    name: string;
    quantity: number;
    description: string;
    tags: string[];
    charges?: { current: number; max: number };
    value?: number;
    allowedSlots?: Array<keyof Equipment["accessories"] | "rightHand" | "leftHand" | "armor">;
    actionIDs?: string[];
    traits?: string[]
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

// Consumables and other items
export interface MiscItem extends BaseItem {
    type: "misc";
}

// 3. Combine them into a single Union Type
export type InventoryItem = WeaponItem | ShieldItem | ArmorItem | MiscItem;

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