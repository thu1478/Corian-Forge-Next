import {
    ACCESSORY_SLOT_UI,
    expandItemAccessorySlots,
    type AccessorySlotKey,
} from "@/logic/equipment/accessory-slots"

/** Virtual library / filter category for worn accessory gear (distinct from raw `misc` / `container`). */
export const ACCESSORY_EQUIPMENT_TYPE = "accessory" as const

export type AccessoryEquipmentType = typeof ACCESSORY_EQUIPMENT_TYPE

/** Slot filter for accessory lists — `wrists` matches either wrist slot. */
export type AccessorySlotFilterKey = "all" | "head" | "neck" | "waist" | "wrists" | "feet"

export const ACCESSORY_SLOT_FILTER_OPTIONS: {
    id: Exclude<AccessorySlotFilterKey, "all">
    label: string
}[] = [
    { id: "head", label: "Head" },
    { id: "neck", label: "Neck" },
    { id: "waist", label: "Waist" },
    { id: "wrists", label: "Wrists" },
    { id: "feet", label: "Footwear" },
]

export function accessoryItemMatchesSlotFilter(
    allowedSlots: readonly string[] | undefined | null,
    filter: AccessorySlotFilterKey
): boolean {
    if (filter === "all") return true
    const expanded = expandItemAccessorySlots(allowedSlots ?? undefined)
    if (expanded.size === 0) return false
    if (filter === "wrists") {
        return expanded.has("wristLeft") || expanded.has("wristRight")
    }
    return expanded.has(filter as AccessorySlotKey)
}

export function countAccessoryItemsBySlotFilter<
    T extends { def: { allowedSlots?: readonly string[] | null } },
>(rows: readonly T[]): Map<AccessorySlotFilterKey, number> {
    const counts = new Map<AccessorySlotFilterKey, number>([["all", rows.length]])
    for (const { id } of ACCESSORY_SLOT_FILTER_OPTIONS) {
        counts.set(
            id,
            rows.filter((row) => accessoryItemMatchesSlotFilter(row.def.allowedSlots, id)).length
        )
    }
    return counts
}

export function isAccessoryCatalogItem(
    id: string,
    def: { type?: string; allowedSlots?: readonly string[] | null }
): boolean {
    const type = def.type
    if (type !== "misc" && type !== "container") return false
    const slots = expandItemAccessorySlots(def.allowedSlots ?? undefined)
    return slots.size > 0
}

/** Library grouping key — accessories are split out of misc/container like shields from weapons. */
export function resolveEquipmentLibraryType(
    id: string,
    def: { type?: string; allowedSlots?: readonly string[] | null }
): string {
    if (isAccessoryCatalogItem(id, def)) return ACCESSORY_EQUIPMENT_TYPE
    return typeof def.type === "string" ? def.type : "other"
}

export function formatEquipmentLibraryTypeLabel(type: string): string {
    switch (type) {
        case ACCESSORY_EQUIPMENT_TYPE:
            return "Accessories"
        case "weapon":
            return "Weapons"
        case "armor":
            return "Armor"
        case "shield":
            return "Shields"
        case "consumable":
            return "Consumables"
        case "misc":
            return "Misc"
        case "container":
            return "Containers"
        default:
            return type.charAt(0).toUpperCase() + type.slice(1)
    }
}

/** Human-readable accessory slot list for library cards and item detail (preserves catalog order). */
export function formatAccessoryAllowedSlotsLabel(
    allowedSlots: readonly string[] | undefined | null
): string {
    const expanded = expandItemAccessorySlots(allowedSlots ?? undefined)
    if (expanded.size === 0) return "—"

    const ordered: string[] = []
    for (const { key, label } of ACCESSORY_SLOT_UI) {
        if (expanded.has(key)) ordered.push(label)
    }
    return ordered.length > 0 ? ordered.join(", ") : "—"
}
