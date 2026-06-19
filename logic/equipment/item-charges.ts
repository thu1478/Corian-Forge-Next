import type { InventoryEntry } from "@/lib/equipment-data"
import type { ActionCard, ChargeDefinition, ChargeResetTiming } from "@/lib/rules"
import {
    hasChargeTracking,
    initialChargesForNewEntry,
    resolveCurrentCharges,
    resolveMaxCharges,
    shouldRestoreCharges,
} from "@/logic/traits/charge-helpers"

/** Item catalog fields for charge tracking (rules.json `items`). */
export type ItemChargeRules = ChargeDefinition

export type ItemChargeSnapshot = {
    current: number
    max: number
}

export type RulesWithItems = {
    items?: Record<string, unknown>
}

function asItemChargeRules(raw: unknown): ItemChargeRules | undefined {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined
    return raw as ItemChargeRules
}

export function itemChargeRulesFromCatalog(
    itemId: string,
    rules: RulesWithItems
): ItemChargeRules | undefined {
    return asItemChargeRules(rules.items?.[itemId])
}

export function itemHasChargeTracking(itemDef: ItemChargeRules | undefined): boolean {
    return hasChargeTracking(itemDef)
}

export function inventoryItemChargeCurrent(
    item: { charges?: number | { current?: number } } | null | undefined,
): number {
    if (!item?.charges) return 0
    if (typeof item.charges === "number") {
        return item.charges >= 0 ? item.charges : 0
    }
    return item.charges.current ?? 0
}

/** Charge cost per use from the action card rules (not the item). */
export function getActionItemChargeCost(
    action: Pick<ActionCard, "itemChargeCost"> | null | undefined
): number | null {
    const raw = action?.itemChargeCost
    if (raw == null || typeof raw !== "number" || !Number.isFinite(raw)) return null
    const cost = Math.max(0, Math.floor(raw))
    return cost > 0 ? cost : null
}

/** True when duplicate equipment grants should split into separate action cards. */
export function equipmentGrantNeedsSplitInstance(
    itemDef: ItemChargeRules | undefined,
    savedCharges: number | undefined,
    attributes: Record<string, number>
): boolean {
    if (!itemHasChargeTracking(itemDef)) return false
    const max = resolveMaxCharges(itemDef, attributes)
    if (max <= 0) return false
    if (savedCharges != null && savedCharges >= 0) return true
    return true
}

export function resolveItemChargeSnapshot(
    entry: Pick<InventoryEntry, "charges"> | undefined,
    itemDef: ItemChargeRules | undefined,
    attributes: Record<string, number>
): ItemChargeSnapshot | null {
    const max = resolveMaxCharges(itemDef, attributes)
    if (max <= 0) return null
    const current = resolveCurrentCharges(entry?.charges, max)
    return { current, max }
}

export function resolveHydratedItemCharges(
    entry: Pick<InventoryEntry, "charges"> | undefined,
    itemDef: ItemChargeRules | undefined,
    attributes: Record<string, number>
): { current: number; max: number } | undefined {
    const snap = resolveItemChargeSnapshot(entry, itemDef, attributes)
    if (!snap) return undefined
    return snap
}

export function initialInventoryEntryCharges(
    itemDef: ItemChargeRules | undefined,
    attributes: Record<string, number>
): number | undefined {
    const initial = initialChargesForNewEntry(itemDef, attributes)
    if (initial < 0) return undefined
    return initial
}

export function updateInventoryItemCharges<T extends InventoryEntry>(
    inventory: T[],
    uid: string,
    newCount: number
): T[] {
    return inventory.map((entry) =>
        entry.uid === uid ? { ...entry, charges: newCount } : entry
    )
}

export function restoreInventoryItemCharges<T extends InventoryEntry>(
    inventory: T[],
    timing: ChargeResetTiming,
    attributes: Record<string, number>,
    rules: RulesWithItems
): T[] {
    return inventory.map((entry) => {
        if (entry.charges === -1) return entry
        const def = itemChargeRulesFromCatalog(entry.id, rules)
        if (!shouldRestoreCharges(def, timing)) return entry
        const max = resolveMaxCharges(def, attributes)
        if (max <= 0) return entry
        return { ...entry, charges: max }
    })
}

export function isItemChargeDepletedForAction(
    itemDef: ItemChargeRules | undefined,
    action: Pick<ActionCard, "itemChargeCost"> | null | undefined,
    savedCharges: number | undefined,
    attributes: Record<string, number>
): boolean {
    const cost = getActionItemChargeCost(action)
    if (cost == null || cost <= 0) return false
    const max = resolveMaxCharges(itemDef, attributes)
    if (max <= 0) return false
    const current = resolveCurrentCharges(savedCharges, max)
    return current < cost
}
