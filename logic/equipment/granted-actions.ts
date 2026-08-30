import { hydrateActionCardById } from "@/logic/actions/hydrate"
import type { InventoryItem } from "@/lib/equipment-data"
import type { ActionCard } from "@/lib/rules"
import type { ReactionRef } from "@/lib/baseRefs"
import {
    equipmentGrantNeedsSplitInstance,
    type ItemChargeRules,
    type RulesWithItems,
} from "@/logic/equipment/item-charges"

export function isReactionActionCardType(type: string | undefined): boolean {
    return type === "reaction" || type === "freeReaction"
}

export type EquipmentActionGrant = {
    actionId: string
    itemUid: string
    item: InventoryItem
}

type ResolveEquipmentActionInstancesOpts = {
    inventory: InventoryItem[]
    equippedUids: readonly (string | null)[]
    activeHandUid: string | null
    offhandUid: string | null
    attributes: Record<string, number>
    rules: RulesWithItems & Parameters<typeof hydrateActionCardById>[1]
}

function itemGrantsAction(item: InventoryItem, actionId: string): boolean {
    return (item.actionIDs ?? []).includes(actionId)
}

function pickActiveHandGrantingItem(
    grants: EquipmentActionGrant[],
    activeHandUid: string | null,
    offhandUid: string | null
): EquipmentActionGrant | null {
    if (grants.length === 0) return null
    if (grants.length === 1) return grants[0]

    const active = grants.find((g) => g.itemUid === activeHandUid)
    if (active) return active

    const offhand = grants.find((g) => g.itemUid === offhandUid)
    if (offhand) return offhand

    return grants[0]
}

function savedChargesForItem(item: InventoryItem): number | undefined {
    const row = item as InventoryItem & {
        charges?: number | { current: number; max: number }
    }
    if (typeof row.charges === "number") return row.charges
    if (
        row.charges &&
        typeof row.charges === "object" &&
        typeof row.charges.current === "number"
    ) {
        return row.charges.current
    }
    return undefined
}

/** Collect raw grants from equipped inventory items. */
export function collectEquipmentGrantedActions(
    inventory: InventoryItem[],
    equippedUids: readonly (string | null)[]
): EquipmentActionGrant[] {
    const equipped = new Set(equippedUids.filter((u): u is string => !!u))
    const out: EquipmentActionGrant[] = []

    for (const item of inventory) {
        if (!item?.uid || !equipped.has(item.uid)) continue
        for (const actionId of item.actionIDs ?? []) {
            if (!actionId) continue
            out.push({ actionId, itemUid: item.uid, item })
        }
    }

    return out
}

/** Apply duplicate/split rules and hydrate action cards with equipment provenance. */
export function resolveEquipmentActionInstances(
    opts: ResolveEquipmentActionInstancesOpts
): ActionCard[] {
    return resolveEquipmentGrantedInstances(opts, "action")
}

/** Equipment-granted reaction / free reaction cards (e.g. Suplex from Wrestler's Gloves). */
export function resolveEquipmentReactionInstances(
    opts: ResolveEquipmentActionInstancesOpts
): ActionCard[] {
    return resolveEquipmentGrantedInstances(opts, "reaction")
}

function resolveEquipmentGrantedInstances(
    opts: ResolveEquipmentActionInstancesOpts,
    cardKind: "action" | "reaction"
): ActionCard[] {
    const grants = collectEquipmentGrantedActions(opts.inventory, opts.equippedUids)
    const byActionId = new Map<string, EquipmentActionGrant[]>()

    for (const grant of grants) {
        const list = byActionId.get(grant.actionId) ?? []
        list.push(grant)
        byActionId.set(grant.actionId, list)
    }

    const cards: ActionCard[] = []

    for (const [actionId, actionGrants] of byActionId) {
        const split = actionGrants.some((g) =>
            equipmentGrantNeedsSplitInstance(
                g.item as ItemChargeRules,
                savedChargesForItem(g.item),
                opts.attributes
            )
        )

        const selectedGrants = split
            ? actionGrants
            : (() => {
                  const picked = pickActiveHandGrantingItem(
                      actionGrants,
                      opts.activeHandUid,
                      opts.offhandUid
                  )
                  return picked ? [picked] : []
              })()

        for (const grant of selectedGrants) {
            const hydrated = hydrateActionCardById(actionId, opts.rules)
            if (!hydrated) continue

            const isReaction = isReactionActionCardType(hydrated.type)
            if (cardKind === "action" && isReaction) continue
            if (cardKind === "reaction" && !isReaction) continue

            const instanceKey =
                split || actionGrants.length > 1
                    ? `${actionId}::${grant.itemUid}`
                    : actionId

            cards.push({
                ...hydrated,
                source: "equipment",
                grantingItemUid: grant.itemUid,
                grantingItemName: grant.item.name,
                instanceKey,
            })
        }
    }

    return cards
}

type RulesWithActionCards = {
    actionCards?: Record<string, { type?: string; fixedMaxCharges?: number }>
    items?: Record<string, { actionIDs?: string[] }>
}

/** Save rows or hydrated inventory — only `uid`, `id`, and optional `actionIDs` are read. */
type HandSlotInventoryRow = Pick<InventoryItem, "uid" | "id"> & { actionIDs?: string[] }

type CharacterWithHands = {
    equipment?: { activeWeapon?: string | null; offhand?: string | null }
    inventory?: HandSlotInventoryRow[]
    reactions?: ReactionRef[]
}

function handEquippedInventoryItems(raw: CharacterWithHands | null | undefined): HandSlotInventoryRow[] {
    const handUids = [raw?.equipment?.activeWeapon, raw?.equipment?.offhand].filter(
        (u): u is string => typeof u === "string" && u.length > 0
    )
    const inventory = raw?.inventory ?? []
    return handUids
        .map((uid) => inventory.find((item) => item?.uid === uid))
        .filter((item): item is HandSlotInventoryRow => item != null)
}

function actionIdsForHandItem(
    item: HandSlotInventoryRow,
    rules: RulesWithActionCards & { items?: Record<string, { actionIDs?: string[] }> }
): string[] {
    const onItem = item.actionIDs ?? []
    if (onItem.length > 0) return onItem
    return rules.items?.[item.id]?.actionIDs ?? []
}

function reactionChargeDefault(
    cards: RulesWithActionCards["actionCards"],
    actionId: string
): number {
    const fixed = cards?.[actionId]?.fixedMaxCharges
    return typeof fixed === "number" && Number.isFinite(fixed) ? Math.max(0, Math.floor(fixed)) : -1
}

/** Reaction ids granted by any item catalog entry via `actionIDs`. */
export function collectItemGrantedReactionIds(
    rules: RulesWithActionCards & { items?: Record<string, { actionIDs?: string[] }> }
): Set<string> {
    const cards = rules.actionCards ?? {}
    const out = new Set<string>()
    for (const item of Object.values(rules.items ?? {})) {
        for (const actionId of item.actionIDs ?? []) {
            if (isReactionActionCardType(cards[actionId]?.type)) {
                out.add(actionId)
            }
        }
    }
    return out
}

/** Reaction ids currently granted by items equipped in hand slots only. */
export function getHandEquippedEquipmentReactionIds(
    raw: CharacterWithHands | null | undefined,
    rules: RulesWithActionCards
): Set<string> {
    const cards = rules.actionCards ?? {}
    const out = new Set<string>()
    for (const item of handEquippedInventoryItems(raw)) {
        for (const actionId of actionIdsForHandItem(item, rules)) {
            if (isReactionActionCardType(cards[actionId]?.type)) {
                out.add(actionId)
            }
        }
    }
    return out
}

/**
 * When a hand-equipped item grants a reaction, inject a reaction ref (like deployed creatures).
 * Skips ids already present on the character save.
 */
export function getInjectedEquipmentReactionRefs(
    raw: CharacterWithHands | null | undefined,
    rules: RulesWithActionCards
): ReactionRef[] {
    const cards = rules.actionCards ?? {}
    const existing = new Set((raw?.reactions ?? []).map((r) => r.id))
    const out: ReactionRef[] = []

    for (const item of handEquippedInventoryItems(raw)) {
        for (const actionId of actionIdsForHandItem(item, rules)) {
            if (!isReactionActionCardType(cards[actionId]?.type)) continue
            if (existing.has(actionId)) continue
            existing.add(actionId)
            out.push({
                id: actionId,
                slotIndex: -1,
                charges: reactionChargeDefault(cards, actionId),
            })
        }
    }

    return out
}
