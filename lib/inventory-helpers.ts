import type { Equipment } from "@/lib/equipment-data";

/** Clears equipment slots that reference any of the given inventory UIDs. */
export function unequipInventoryUids(equipment: Equipment, uids: Iterable<string>): Equipment {
    const set = new Set([...uids].map(String));
    const slot = (uid: string | null) =>
        uid != null && uid !== "" && set.has(String(uid)) ? null : uid;
    const acc = equipment.accessories || {};
    return {
        activeWeapon: slot(equipment.activeWeapon),
        offhand: slot(equipment.offhand),
        armor: slot(equipment.armor),
        accessories: Object.fromEntries(
            Object.entries(acc).map(([k, v]) => [k, slot(v as string | null)])
        ) as Equipment["accessories"],
    };
}

export const INV_DRAG_ITEM_PREFIX = "inv-item:" as const;
export const INV_CONTAINER_PREFIX = "inv-container:" as const;
export const INV_DROP_ROOT = "inv-zone-root" as const;
export function invDropZoneId(containerId: string) {
    return `inv-zone:${containerId}`;
}
