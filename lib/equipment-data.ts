import {ActionCard} from "@/components/rules/rules";

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
    actions?: ActionCard[];
}

// 2. Define specific "Sub-Types"
export interface WeaponItem extends BaseItem {
    type: "weapon"; // This is the "Discriminant"
    damage: number;
    damageType: string;
    range: number;
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
export type InventoryItem = WeaponItem | ArmorItem | MiscItem;

export interface Equipment {
    activeWeapon: string | null
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