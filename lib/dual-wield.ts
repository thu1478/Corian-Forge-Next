import type { InventoryItem, WeaponItem } from "@/lib/equipment-data"

function isWeaponItem(w: InventoryItem | null | undefined): w is WeaponItem {
    return !!w && w.type === "weapon"
}

/** Both hands hold weapons (any tags); shields do not count. */
export function isDualWielding(
    activeWeapon: InventoryItem | null | undefined,
    offhandWeapon: InventoryItem | null | undefined
): boolean {
    return isWeaponItem(activeWeapon) && isWeaponItem(offhandWeapon)
}

function resolveHandSlot(
    slot: unknown,
    inventory: unknown[] | undefined
): InventoryItem | null {
    if (slot == null) return null
    if (typeof slot === "object" && slot !== null && "type" in slot) {
        const t = (slot as InventoryItem).type
        if (t === "weapon" || t === "shield") return slot as InventoryItem
        return null
    }
    const uid = typeof slot === "string" ? slot : null
    if (!uid || !Array.isArray(inventory)) return null
    const item = inventory.find((i: unknown) => {
        if (!i || typeof i !== "object") return false
        return String((i as { uid?: string }).uid) === String(uid)
    }) as InventoryItem | undefined
    if (!item) return null
    if (item.type === "weapon" || item.type === "shield") return item
    return null
}

/** Hydrated equipment objects or inventory UIDs (creator / save). */
export function resolveEquippedHands(character: {
    equipment?: { activeWeapon?: unknown; offhand?: unknown } | null
    inventory?: unknown[]
} | null | undefined): {
    activeWeapon: InventoryItem | null
    offhandWeapon: InventoryItem | null
} {
    const eq = character?.equipment
    if (!eq) {
        return { activeWeapon: null, offhandWeapon: null }
    }
    return {
        activeWeapon: resolveHandSlot(eq.activeWeapon, character?.inventory),
        offhandWeapon: resolveHandSlot(eq.offhand, character?.inventory),
    }
}
