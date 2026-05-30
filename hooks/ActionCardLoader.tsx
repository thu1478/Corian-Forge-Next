import {useMemo} from 'react';
import rulesData from '@/lib/rules.json';
import {ActionCard} from "@/lib/rules";
import { hydrateActionCardById } from "@/lib/action-hydrate";
import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils";
import type { TraitRef } from "@/lib/baseRefs"
import {
    hasBrawlingWeaponInHands,
    hasEquippedWeaponForWeaponAction,
} from "@/lib/weapon-utils";
import type { InventoryItem } from "@/lib/equipment-data";
import { animaWeaponActionVisible } from "@/lib/natural-weapons";

/**
 * Specialized hook to discover and hydrate Action Cards.
 * @param inventory - The full hydrated inventory array
 * @param equippedUids - Array of UIDs currently in equipment slots
 * @param classNames - Array of strings representing the character's classes
 * @param actionRefs - Array of strings for actions the character has
 * @param creatureGrantedActionIds - Action card ids granted by deployed creatures; skip PC weapon checks (their attacks use their own stats).
 */
export function useActions(
    inventory: any[],
    equippedUids: (string | null)[],
    classNames: string[],
    actionRefs: any[] = [],
    /** Main hand and offhand equipment UIDs (in order) for weapon-action eligibility; omit for legacy attribute-only check. */
    handSlotUids?: [string | null, string | null] | null,
    creatureGrantedActionIds?: readonly string[] | null,
    /** Character traits (e.g. Shield Master) for equipment eligibility. */
    traitRefs?: readonly TraitRef[] | null,
    /** Pre-resolved hand items (includes anima natural weapons). */
    resolvedHands?: {
        activeWeapon: InventoryItem | null
        offhandWeapon: InventoryItem | null
    } | null,
    /** Anima form action ids requiring natural-weapon key matching. */
    activeAnimaActionIds?: readonly string[] | null,
    animaEquippedNaturalKeys?: ReadonlySet<string> | null,
): ActionCard[] {
    return useMemo(() => {
        const creatureGranted = new Set(
            (creatureGrantedActionIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)
        )
        const animaActions = new Set(
            (activeAnimaActionIds ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)
        )
        const animaKeys = animaEquippedNaturalKeys ?? new Set<string>()

        const activeWeaponAttributes = inventory
            .filter((item: any) =>
                item &&
                equippedUids.includes(item.uid) &&
                (item.type === "weapon" || item.type === "shield")
            )
            .flatMap((item: any) => item.attributes || []);

        const activeHandItem = resolvedHands?.activeWeapon ??
            (handSlotUids
                ? inventory.find((item: any) => item?.uid === handSlotUids[0]) ?? null
                : null);
        const offhandItem = resolvedHands?.offhandWeapon ??
            (handSlotUids
                ? inventory.find((item: any) => item?.uid === handSlotUids[1]) ?? null
                : null);

        // 1. Gather all IDs we need to find
        const itemIds = inventory
            .filter((item: any) => item && equippedUids.includes(item.uid))
            .flatMap((item: any) => item.actionIDs || []);

        // The actions that the character knows not from items
        const savedIds = actionRefs.map(ref => (typeof ref === 'string' ? ref : ref?.id));
        const allTargetIds = Array.from(new Set([...itemIds, ...savedIds]));

        // 2. Hydrate actions from rules
        const hydratedActions = allTargetIds
            .map((id) => (id ? hydrateActionCardById(id, rulesData as any) : null))
            .filter((a): a is ActionCard => a !== null);

        // 3. APPLY THE WEAPON ATTRIBUTE FILTER
        return hydratedActions.filter(action => {
            if (creatureGranted.has(action.id)) return true

            const tags = action.tags || [];
            const isWeaponAction = actionTagsIncludeCanonical(tags, "Weapon");
            const wantsBrawling = actionTagsIncludeCanonical(tags, "brawling");

            if (animaActions.has(action.id) && isWeaponAction) {
                if (!animaWeaponActionVisible(tags, action.hiddenTags, animaKeys as Set<string>)) {
                    return false
                }
            }

            // Brawling-tagged actions (including non-Weapon) need a brawling weapon in a hand when we know hands.
            if (wantsBrawling && handSlotUids) {
                if (!isWeaponAction) {
                    return hasBrawlingWeaponInHands(activeHandItem, offhandItem);
                }
            }

            // If it's not a weapon action, it's always visible (Spells, generic moves, etc.)
            if (!isWeaponAction) return true;

            const rollStats = action.powerRoll?.rollStats || [];

            if (handSlotUids || resolvedHands) {
                return hasEquippedWeaponForWeaponAction(
                    action.tags,
                    rollStats,
                    activeHandItem,
                    offhandItem,
                    { traits: traitRefs ?? undefined },
                );
            }

            // Legacy: any equipped item contributed attributes
            return rollStats.some((stat) => activeWeaponAttributes.includes(stat));
        });

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
    ]);
}