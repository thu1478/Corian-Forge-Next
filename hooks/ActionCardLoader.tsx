import { useMemo } from 'react';
import rulesData from '@/lib/rules.json';
import { ActionCard } from "@/components/rules/rules";

/**
 * Specialized hook to discover and hydrate Action Cards.
 * @param inventory - The full hydrated inventory array
 * @param equippedUids - Array of UIDs currently in equipment slots
 * @param classNames - Array of strings representing the character's classes
 * @param baseActionIds - Array of strings for actions inherent to the character
 */
export function useActions(
    inventory: any[],
    equippedUids: (string | null)[],
    classNames: string[],
    baseActionIds: string[] = []
): ActionCard[] {
    return useMemo(() => {
        // 1. Extract IDs from Character Classes
        // Mapping through rulesData.classes[className].actions
        // const classActionIds = classNames.flatMap((name) => {
        //     const classData = (rulesData as any).classes?.[name];
        //     return classData?.actions || [];
        // });

        // 2. Extract IDs from Equipped Items
        // Scanning only items that are actually equipped for 'actionIDs'
        const itemActionIds = inventory
            .filter((item: any) => item && equippedUids.includes(item.uid))
            .flatMap((item: any) => item.actionIDs || []);

        // 3. Merge and Deduplicate
        // Set prevents duplicate actions if granted by multiple sources
        const uniqueIds = Array.from(new Set([
            ...baseActionIds,
            // ...classActionIds,
            ...itemActionIds
        ]));

        // 4. Hydrate into full ActionCard objects
        // Pulling from the main actionCards registry in rules.json
        return uniqueIds
            .map(id => {
                // Access the raw data using 'any' to bypass the rigid Record check
                const rawCard = (rulesData.actionCards as Record<string, any>)[id];

                if (!rawCard) {
                    console.warn(`ActionCardLoader: Action ID "${id}" not found.`);
                    return null;
                }

                return {
                    ...rawCard,
                    id: id
                } as ActionCard;
            })
            .filter((card): card is ActionCard => card !== null);

    }, [inventory, equippedUids, classNames, baseActionIds]);
}