import {ActionCard, Reaction} from "@/lib/rules";
import {ArmorItem, InventoryItem, MiscItem, ShieldItem, WeaponItem} from "@/lib/equipment-data";
import {CharacterSaveData} from "@/lib/character-data";



export interface HydratedCharacter extends Omit<CharacterSaveData, 'equipment' | 'inventory'> {
    actions: ActionCard[]
    reactions: Reaction[]
    inventory: InventoryItem[];
    equipment: {
        activeWeapon: WeaponItem | null;
        offhand: WeaponItem | ShieldItem | null;
        armor: ArmorItem | null;
        accessories: Record<string, MiscItem | null>;
    };
    resistances: string[];
    vulnerabilities: Record<string, number>;
}