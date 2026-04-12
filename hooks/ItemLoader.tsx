import { useMemo } from "react";
import {Character, HydratedCharacter} from "@/lib/character-data";
import {WeaponItem, ArmorItem, MiscItem, ShieldItem} from "@/lib/equipment-data";

export function useCharacter(rawCharacter: Character | null, rules: any) {
    const hydratedCharacter = useMemo((): HydratedCharacter | null => {
        if (!rawCharacter || !rules) return null;

        // 1. Map the raw inventory (IDs) to full Rule Objects
        const fullInventory = rawCharacter.inventory.map(entry => {
            const itemDef = rules.items[entry.id];

            // Debugging
            if (!itemDef) {
                console.warn(`Could not find item definition for ID: ${entry.id}`);
            }

            return {
                ...itemDef, // Spread name, description, type, etc.
                uid: entry.uid,
                id: entry.id,
                // Fallbacks to prevent UI crashes if itemDef is missing
                name: itemDef?.name ?? `Unknown (${entry.id})`,
                description: itemDef?.description ?? ""
            };
        });

        // 2. Hydrate the Equipment slots using the new fullInventory
        const equipment = rawCharacter.equipment;
        const hydratedEquipment = {
            activeWeapon: fullInventory.find(i => i.uid === equipment.activeWeapon) as WeaponItem || null,
            offhand: fullInventory.find(i => i.uid === equipment.offhand) as (WeaponItem | ShieldItem) || null,
            armor: fullInventory.find(i => i.uid === equipment.armor) as ArmorItem || null,
            accessories: Object.fromEntries(
                Object.entries(equipment.accessories).map(([slot, uid]) => [
                    slot,
                    fullInventory.find(i => i.uid === uid) as MiscItem || null
                ])
            )
        };

        return {
            ...rawCharacter,
            inventory: fullInventory,
            equipment: hydratedEquipment
        };
    }, [rawCharacter, rules]);

    return { character: hydratedCharacter };
}