import type { ActionCard } from "@/lib/rules"
import type { TraitRef } from "@/lib/baseRefs"
import type { InventoryItem } from "@/lib/equipment-data"
import { actionTagsIncludeCanonical } from "@/logic/actions/tag-utils"
import { animaWeaponActionVisible } from "@/logic/equipment/natural-weapons"
import {
    hasBrawlingWeaponInHands,
    hasEquippedWeaponForWeaponAction,
    hasThrowingWeaponInHands,
    isWeaponItem,
} from "@/logic/equipment/weapon-utils"

export type EquipmentGrantVisibilityContext = {
    inventory: InventoryItem[]
    equippedUids: readonly (string | null)[]
    handSlotUids?: readonly [string | null, string | null] | null
    resolvedHands?: {
        activeWeapon: InventoryItem | null
        offhandWeapon: InventoryItem | null
    } | null
    creatureGrantedActionIds?: readonly string[] | null
    traitRefs?: readonly TraitRef[] | null
    animaActionIds?: readonly string[] | null
    animaEquippedNaturalKeys?: ReadonlySet<string> | null
}

function itemListsAction(item: InventoryItem, actionId: string): boolean {
    return (item.actionIDs ?? []).includes(actionId)
}

export function filterVisibleEquipmentGrantedCards(
    cards: ActionCard[],
    ctx: EquipmentGrantVisibilityContext
): ActionCard[] {
    const creatureGranted = new Set(
        (ctx.creatureGrantedActionIds ?? []).filter(
            (id): id is string => typeof id === "string" && id.length > 0
        )
    )
    const animaActions = new Set(
        (ctx.animaActionIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)
    )
    const animaKeys = ctx.animaEquippedNaturalKeys ?? new Set<string>()

    const activeHandItem =
        ctx.resolvedHands?.activeWeapon ??
        (ctx.handSlotUids
            ? ctx.inventory.find((item) => item?.uid === ctx.handSlotUids?.[0]) ?? null
            : null)
    const offhandItem =
        ctx.resolvedHands?.offhandWeapon ??
        (ctx.handSlotUids
            ? ctx.inventory.find((item) => item?.uid === ctx.handSlotUids?.[1]) ?? null
            : null)

    const grantingItemByInstance = new Map<string, InventoryItem | null>()
    for (const action of cards) {
        if (!action.grantingItemUid) continue
        grantingItemByInstance.set(
            action.instanceKey ?? action.id,
            ctx.inventory.find((i) => i?.uid === action.grantingItemUid) ?? null
        )
    }

    return cards.filter((action) => {
        if (creatureGranted.has(action.id)) return true

        const grantingItem = action.grantingItemUid
            ? grantingItemByInstance.get(action.instanceKey ?? action.id) ?? null
            : null

        if (grantingItem && !ctx.equippedUids.includes(grantingItem.uid)) return false

        const tags = action.tags || []
        const isWeaponAction = actionTagsIncludeCanonical(tags, "Weapon")
        const wantsBrawling = actionTagsIncludeCanonical(tags, "brawling")
        const wantsThrowing = actionTagsIncludeCanonical(tags, "Throwing")

        if (animaActions.has(action.id) && isWeaponAction) {
            if (!animaWeaponActionVisible(tags, action.hiddenTags, animaKeys as Set<string>)) {
                return false
            }
        }

        if (grantingItem) {
            if (wantsBrawling && !isWeaponAction) {
                return (
                    isWeaponItem(grantingItem) &&
                    actionTagsIncludeCanonical(grantingItem.tags || [], "brawling")
                )
            }
            if (!isWeaponAction) return true

            if (itemListsAction(grantingItem, action.id)) return true

            const rollStats = action.powerRoll?.rollStats || []
            return hasEquippedWeaponForWeaponAction(
                action.tags,
                rollStats,
                isWeaponItem(grantingItem) || grantingItem.type === "shield" ? grantingItem : null,
                null,
                { traits: ctx.traitRefs ?? undefined }
            )
        }

        if (wantsBrawling && ctx.handSlotUids) {
            if (!isWeaponAction) {
                return hasBrawlingWeaponInHands(activeHandItem, offhandItem)
            }
        }

        if (wantsThrowing && isWeaponAction && (ctx.handSlotUids || ctx.resolvedHands)) {
            if (hasThrowingWeaponInHands(activeHandItem, offhandItem)) return true
        }

        if (!isWeaponAction) return true

        const rollStats = action.powerRoll?.rollStats || []
        if (ctx.handSlotUids || ctx.resolvedHands) {
            return hasEquippedWeaponForWeaponAction(
                action.tags,
                rollStats,
                activeHandItem,
                offhandItem,
                { traits: ctx.traitRefs ?? undefined }
            )
        }

        const activeWeaponAttributes = ctx.inventory
            .filter(
                (item) =>
                    item &&
                    ctx.equippedUids.includes(item.uid) &&
                    (item.type === "weapon" || item.type === "shield")
            )
            .flatMap((item) => item.attributes || [])

        return rollStats.some((stat) => activeWeaponAttributes.includes(stat))
    })
}
