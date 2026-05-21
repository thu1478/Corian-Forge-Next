import { useMemo } from "react";
import {CharacterSaveData} from "@/lib/character-data";
import {WeaponItem, ArmorItem, MiscItem, ShieldItem} from "@/lib/equipment-data";
import {HydratedCharacter} from "@/lib/HydratedChar";

export function hydrateItemData(rawCharacter: CharacterSaveData | null, rules: any) {
    const hydratedCharacter = useMemo((): HydratedCharacter | null => {
        if (!rawCharacter || !rules) return null;

        // 1. Map the raw inventory (IDs) to full Rule Objects
        const fullInventory = rawCharacter.inventory.map(entry => {
            const itemDef = rules.items[entry.id];

            // Debugging
            if (!itemDef) {
                console.warn(`Could not find item definition for ID: ${entry.id}`);
            }

            const ruleName = itemDef?.name ?? `Unknown (${entry.id})`;
            const custom = typeof entry.customName === "string" ? entry.customName.trim() : "";
            return {
                ...itemDef, // Spread name, description, type, etc.
                uid: entry.uid,
                id: entry.id,
                customName: custom || undefined,
                quantity: entry.quantity ?? itemDef?.quantity ?? 1,
                containerId: entry.containerId ?? null,
                inventionModules: entry.inventionModules,
                inventionModuleConfig: entry.inventionModuleConfig,
                // Fallbacks to prevent UI crashes if itemDef is missing
                name: custom || ruleName,
                description: itemDef?.description ?? ""
            };
        });

        // 2. Hydrate the Equipment slots using the new fullInventory
        const equipment = rawCharacter.equipment;
        const hydratedEquipment = {
            activeWeapon: (() => {
                const i = fullInventory.find((x) => x.uid === equipment.activeWeapon);
                if (!i) return null;
                if (i.type === "weapon" || i.type === "shield") return i as WeaponItem | ShieldItem;
                return null;
            })(),
            offhand:
                (fullInventory.find((i) => i.uid === equipment.offhand) as WeaponItem | ShieldItem | undefined) ??
                null,
            armor: (fullInventory.find((i) => i.uid === equipment.armor) as ArmorItem | undefined) ?? null,
            accessories: Object.fromEntries(
                Object.entries(equipment.accessories ?? {}).map(([slot, uid]) => [
                    slot,
                    (fullInventory.find((i) => i.uid === uid) as MiscItem | undefined) ?? null,
                ]),
            ),
        };

        return {
            resistances: [], vulnerabilities: {},
            ...rawCharacter,
            inventory: fullInventory,
            equipment: hydratedEquipment,
        } as unknown as HydratedCharacter;
    }, [rawCharacter, rules]);

    return { character: hydratedCharacter };
}