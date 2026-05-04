import {useMemo} from 'react';
import rulesData from '@/lib/rules.json';
import {ActionCard} from "@/lib/rules";
import { hydrateActionCardById } from "@/lib/action-hydrate";
import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils";
import {
    hasBrawlingWeaponInHands,
    hasEquippedWeaponForWeaponAction,
} from "@/lib/weapon-power-roll";

/**
 * Specialized hook to discover and hydrate Action Cards.
 * @param inventory - The full hydrated inventory array
 * @param equippedUids - Array of UIDs currently in equipment slots
 * @param classNames - Array of strings representing the character's classes
 * @param actionRefs - Array of strings for actions the character has
 */
export function useActions(
    inventory: any[],
    equippedUids: (string | null)[],
    classNames: string[],
    actionRefs: any[] = [],
    /** Main hand and offhand equipment UIDs (in order) for weapon-action eligibility; omit for legacy attribute-only check. */
    handSlotUids?: [string | null, string | null] | null,
): ActionCard[] {
    return useMemo(() => {

        const activeWeaponAttributes = inventory
            .filter((item: any) =>
                item &&
                equippedUids.includes(item.uid) &&
                (item.type === "weapon" || item.type === "shield")
            )
            .flatMap((item: any) => item.attributes || []);

        const activeHandItem = handSlotUids
            ? inventory.find((item: any) => item?.uid === handSlotUids[0]) ?? null
            : null;
        const offhandItem = handSlotUids
            ? inventory.find((item: any) => item?.uid === handSlotUids[1]) ?? null
            : null;

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
            const tags = action.tags || [];
            const isWeaponAction = actionTagsIncludeCanonical(tags, "Weapon");
            const wantsBrawling = actionTagsIncludeCanonical(tags, "brawling");

            // Brawling-tagged actions (including non-Weapon) need a brawling weapon in a hand when we know hands.
            if (wantsBrawling && handSlotUids) {
                if (!isWeaponAction) {
                    return hasBrawlingWeaponInHands(activeHandItem, offhandItem);
                }
            }

            // If it's not a weapon action, it's always visible (Spells, generic moves, etc.)
            if (!isWeaponAction) return true;

            const rollStats = action.powerRoll?.rollStats || [];

            if (handSlotUids) {
                return hasEquippedWeaponForWeaponAction(
                    action.tags,
                    rollStats,
                    activeHandItem,
                    offhandItem,
                );
            }

            // Legacy: any equipped item contributed attributes
            return rollStats.some((stat) => activeWeaponAttributes.includes(stat));
        });

    }, [inventory, equippedUids, classNames, actionRefs, handSlotUids]);
}