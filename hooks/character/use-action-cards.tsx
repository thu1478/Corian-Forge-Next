import {useMemo} from 'react';
import { rulesData } from "@/lib/rules-data";
import {ActionCard} from "@/lib/rules";
import { hydrateActionCardById } from "@/logic/actions/hydrate";
import { actionTagsIncludeCanonical } from "@/logic/actions/tag-utils";
import type { TraitRef } from "@/lib/baseRefs"
import {
    hasBrawlingWeaponInHands,
    hasEquippedWeaponForWeaponAction,
    hasThrowingWeaponInHands,
} from "@/logic/equipment/weapon-utils";
import type { InventoryItem } from "@/lib/equipment-data";
import { animaWeaponActionVisible } from "@/logic/equipment/natural-weapons";
import {
    isReactionActionCardType,
    resolveEquipmentActionInstances,
} from "@/logic/equipment/granted-actions";
import {
    filterVisibleEquipmentGrantedCards,
    type EquipmentGrantVisibilityContext,
} from "@/logic/equipment/granted-action-visibility";

/**
 * Specialized hook to discover and hydrate Action Cards.
 */
export function useActions(
    inventory: any[],
    equippedUids: (string | null)[],
    classNames: string[],
    actionRefs: any[] = [],
    handSlotUids?: [string | null, string | null] | null,
    creatureGrantedActionIds?: readonly string[] | null,
    traitRefs?: readonly TraitRef[] | null,
    resolvedHands?: {
        activeWeapon: InventoryItem | null
        offhandWeapon: InventoryItem | null
    } | null,
    activeAnimaActionIds?: readonly string[] | null,
    animaEquippedNaturalKeys?: ReadonlySet<string> | null,
    attributes: Record<string, number> = {},
): ActionCard[] {
    return useMemo(() => {
        const creatureGranted = new Set(
            (creatureGrantedActionIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)
        )
        const animaActions = new Set(
            (activeAnimaActionIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)
        )
        const animaKeys = animaEquippedNaturalKeys ?? new Set<string>()

        const activeHandItem = resolvedHands?.activeWeapon ??
            (handSlotUids
                ? inventory.find((item: any) => item?.uid === handSlotUids[0]) ?? null
                : null);
        const offhandItem = resolvedHands?.offhandWeapon ??
            (handSlotUids
                ? inventory.find((item: any) => item?.uid === handSlotUids[1]) ?? null
                : null);

        const activeHandUid = handSlotUids?.[0] ?? activeHandItem?.uid ?? null
        const offhandUid = handSlotUids?.[1] ?? offhandItem?.uid ?? null

        const visibilityCtx: EquipmentGrantVisibilityContext = {
            inventory: inventory as InventoryItem[],
            equippedUids,
            handSlotUids,
            resolvedHands,
            creatureGrantedActionIds,
            traitRefs,
            animaActionIds: activeAnimaActionIds ?? undefined,
            animaEquippedNaturalKeys: animaKeys,
        }

        const equipmentActions = filterVisibleEquipmentGrantedCards(
            resolveEquipmentActionInstances({
                inventory: inventory as InventoryItem[],
                equippedUids,
                activeHandUid,
                offhandUid,
                attributes,
                rules: rulesData as Parameters<typeof hydrateActionCardById>[1],
            }),
            visibilityCtx
        )

        const equipmentActionKeys = new Set(equipmentActions.map((a) => a.instanceKey ?? a.id))

        const nonEquipmentActions = Array.from(
            new Set(
                actionRefs
                    .map((ref) => (typeof ref === "string" ? ref : ref?.id))
                    .filter((id): id is string => !!id && !equipmentActionKeys.has(id))
            )
        )
            .map((id) => hydrateActionCardById(id, rulesData as any))
            .filter((a): a is ActionCard => a != null)
            .filter((action) => !isReactionActionCardType(action.type))

        const hydratedActions = [...equipmentActions, ...nonEquipmentActions]

        return hydratedActions.filter((action) => {
            if (isReactionActionCardType(action.type)) return false
            if (creatureGranted.has(action.id)) return true
            if (action.grantingItemUid) return true

            const tags = action.tags || []
            const isWeaponAction = actionTagsIncludeCanonical(tags, "Weapon")
            const wantsBrawling = actionTagsIncludeCanonical(tags, "brawling")
            const wantsThrowing = actionTagsIncludeCanonical(tags, "Throwing")

            if (animaActions.has(action.id) && isWeaponAction) {
                if (!animaWeaponActionVisible(tags, action.hiddenTags, animaKeys as Set<string>)) {
                    return false
                }
            }

            if (wantsBrawling && handSlotUids) {
                if (!isWeaponAction) {
                    return hasBrawlingWeaponInHands(activeHandItem, offhandItem)
                }
            }

            if (wantsThrowing && isWeaponAction && (handSlotUids || resolvedHands)) {
                if (hasThrowingWeaponInHands(activeHandItem, offhandItem)) return true
            }

            if (!isWeaponAction) return true

            const rollStats = action.powerRoll?.rollStats || []

            if (handSlotUids || resolvedHands) {
                return hasEquippedWeaponForWeaponAction(
                    action.tags,
                    rollStats,
                    activeHandItem,
                    offhandItem,
                    { traits: traitRefs ?? undefined },
                )
            }

            const activeWeaponAttributes = inventory
                .filter((item: any) =>
                    item &&
                    equippedUids.includes(item.uid) &&
                    (item.type === "weapon" || item.type === "shield")
                )
                .flatMap((item: any) => item.attributes || [])

            return rollStats.some((stat) => activeWeaponAttributes.includes(stat))
        })
    }, [
        inventory,
        equippedUids,
        classNames,
        actionRefs,
        handSlotUids,
        creatureGrantedActionIds,
        traitRefs,
        resolvedHands,
        activeAnimaActionIds,
        animaEquippedNaturalKeys,
        attributes,
    ])
}
