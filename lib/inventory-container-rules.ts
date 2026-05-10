import type { InventoryContainer, InventoryItem } from "@/lib/equipment-data"

/** Legacy named bags plus every `type: "container"` item instance `uid`. */
export function allValidContainerZoneIds(
    legacyContainers: InventoryContainer[],
    inventory: InventoryItem[]
): Set<string> {
    const s = new Set(legacyContainers.map((c) => c.id))
    for (const it of inventory) {
        if (it.type === "container") s.add(it.uid)
    }
    return s
}

export function getContainerItemByZoneUid(
    inventory: InventoryItem[],
    zoneUid: string
): (InventoryItem & { type: "container" }) | undefined {
    const it = inventory.find((i) => i.uid === zoneUid && i.type === "container")
    return it as (InventoryItem & { type: "container" }) | undefined
}

/** Per-stack quantity (minimum 1). */
export function itemStackQuantity(item: InventoryItem): number {
    const q = Math.floor(Number((item as { quantity?: unknown }).quantity))
    return Number.isFinite(q) && q > 0 ? q : 1
}

/** Sum of stack quantities for items whose `containerId` is this zone (capacity is by total items, not row count). */
export function sumDirectChildQuantities(inventory: InventoryItem[], containerUid: string): number {
    return inventory
        .filter((i) => i.containerId === containerUid)
        .reduce((acc, i) => acc + itemStackQuantity(i), 0)
}

/** True when a finite `containerCapacity` is exceeded by direct children (stack quantities). */
export function containerItemIsOverCapacity(
    parent: InventoryItem & { type: "container" },
    inventory: InventoryItem[]
): boolean {
    const cap = parent.containerCapacity
    if (typeof cap !== "number" || cap < 0) return false
    return sumDirectChildQuantities(inventory, parent.uid) > cap
}

export type ContainerDropCheck = { ok: true } | { ok: false; reason: string }

/**
 * Enforce capacity / allowed types for `type: "container"` items. Legacy `containers` entries have no limits.
 */
export function checkContainerDrop(
    inventory: InventoryItem[],
    draggedUid: string,
    targetZoneId: string | null
): ContainerDropCheck {
    if (targetZoneId == null) return { ok: true }

    const dragged = inventory.find((i) => i.uid === draggedUid)
    if (!dragged) return { ok: false, reason: "Item not found." }

    const parent = getContainerItemByZoneUid(inventory, targetZoneId)
    if (!parent) return { ok: true }

    if (dragged.type === "container") {
        return { ok: false, reason: "Containers can't be stored inside other containers." }
    }
    if (dragged.uid === parent.uid) {
        return { ok: false, reason: "Invalid target." }
    }

    const allowed = parent.containerAllowedTypes
    if (allowed && allowed.length > 0 && !(allowed as readonly string[]).includes(dragged.type)) {
        return {
            ok: false,
            reason: `This container only holds: ${allowed.join(", ")}.`,
        }
    }

    const cap = parent.containerCapacity
    if (typeof cap === "number" && cap >= 0) {
        const dragQty = itemStackQuantity(dragged)
        const wasInside = dragged.containerId === parent.uid
        const qtyInParent = sumDirectChildQuantities(inventory, parent.uid)
        const qtyAfterMove = wasInside ? qtyInParent : qtyInParent + dragQty
        if (qtyAfterMove > cap) return { ok: false, reason: "That container is full." }
    }

    return { ok: true }
}
