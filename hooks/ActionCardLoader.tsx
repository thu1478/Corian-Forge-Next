import {useMemo} from 'react';
import rulesData from '@/lib/rules.json';
import {ActionCard} from "@/lib/rules";

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
    actionRefs: any[] = []
): ActionCard[] {
    return useMemo(() => {
        // 1. Gather all IDs we need to find
        const itemIds = inventory
            .filter((item: any) => item && equippedUids.includes(item.uid))
            .flatMap((item: any) => item.actionIDs || []);

        const savedIds = actionRefs.map(ref => (typeof ref === 'string' ? ref : ref?.id));

        const allTargetIds = Array.from(new Set([...itemIds, ...savedIds]));

        // 2. Search rules.json for these IDs
        return allTargetIds.map(id => {
            if (!id) return null;

            // CHECK GLOBAL ACTIONS FIRST
            const globalCard = (rulesData.actionCards as any)[id];
            if (globalCard) return { ...globalCard, id };

            // CHECK CLASS ACTIONS SECOND
            // We have to loop through classes because actions are nested inside them
            for (const className of Object.keys(rulesData.classes)) {
                const classData = (rulesData as any).classes[className];
                const actionWrapper = classData.actions?.[id];

                if (actionWrapper?.actionCard) {
                    return {
                        ...actionWrapper.actionCard,
                        id,
                        source: className
                    };
                }
            }

            console.warn(`ActionCardLoader: Could not find action with ID "${id}"`);
            return null;
        }).filter((card): card is ActionCard => card !== null);

    }, [inventory, equippedUids, classNames, actionRefs]);
}