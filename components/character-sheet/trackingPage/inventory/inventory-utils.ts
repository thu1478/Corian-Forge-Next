import type { InventoryItem } from "@/lib/equipment-data"
import type { TraitEffect } from "@/lib/rules"
import {
    type InventoryKindFilter,
    itemMatchesKindFilter,
    itemMatchesSearch,
} from "@/logic/equipment/inventory-filters"
import { formatTraitEffectChoiceLabel } from "@/logic/traits/selection"

export { catalogItemIsAffordable, catalogItemZennyCost } from "@/logic/equipment/item-cost"

export function catalogDefType(def: Record<string, unknown>): InventoryItem["type"] | "misc" {
    const t = def.type
    if (
        t === "weapon" ||
        t === "shield" ||
        t === "armor" ||
        t === "misc" ||
        t === "consumable" ||
        t === "container"
    ) {
        return t
    }
    return "misc"
}

/** Synthetic uid for catalog preview rows — never used in saved inventory. */
export const CATALOG_PREVIEW_UID = "__cf_catalog_preview__"

/** Same merge shape as `ItemLoader` hydration, for rules-only preview (not on the character). */
export function previewInventoryItemFromCatalog(
    id: string,
    def: Record<string, unknown> | undefined
): InventoryItem | null {
    if (!def || typeof def !== "object") return null
    const ruleName = String(def.name ?? id)
    const tags = Array.isArray(def.tags) ? def.tags : []
    const qtyRaw = def.quantity
    const quantity = typeof qtyRaw === "number" && Number.isFinite(qtyRaw) ? qtyRaw : 1
    return {
        ...def,
        uid: CATALOG_PREVIEW_UID,
        id,
        customName: undefined,
        rank: typeof def.rank === "string" && def.rank.trim() ? def.rank.trim() : "common",
        quantity,
        containerId: null,
        name: ruleName,
        description: String(def.description ?? ""),
        tags: tags as string[],
    } as InventoryItem
}

/** Where the item belongs in the UI (invalid ids → root). */
export function resolveItemZone(item: InventoryItem, validIds: Set<string>): string | null {
    const c = item.containerId
    if (!c || !validIds.has(c)) return null
    return c
}

export function parseAdjustAmount(raw: string): number {
    const n = parseInt(raw, 10)
    if (Number.isNaN(n) || n < 1) return 1
    return Math.min(n, 999_999)
}

export function filterItems(
    items: InventoryItem[],
    invFilter: InventoryKindFilter,
    inventorySearch: string
) {
    return items.filter((item) => {
        if (!item) return false
        if (!itemMatchesKindFilter(item, invFilter)) return false
        return itemMatchesSearch(item, inventorySearch)
    })
}

export function formatTraitEffectLine(effect: unknown, rules?: Record<string, unknown>): string {
    if (effect == null) return ""
    if (typeof effect !== "object") return String(effect)
    const typed = effect as { type?: string }
    if (!typed.type || typeof typed.type !== "string") {
        try {
            return JSON.stringify(effect)
        } catch {
            return "effect"
        }
    }
    return formatTraitEffectChoiceLabel(effect as TraitEffect, rules as any)
}
