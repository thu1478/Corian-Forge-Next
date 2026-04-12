import { useMemo } from 'react';
import { useCharacterIO } from '@/hooks/CharacterLoader';
import { useCharacter } from "@/hooks/ItemLoader";
import { useDerivedStats } from "@/components/character-sheet/hooks/statCalculator";
import { useActions } from "@/hooks/ActionCardLoader";
import rulesData from '@/lib/rules.json';

export function useDataLoader(rulesDataParam: any) {
    // 1. Core Data IO (The source of truth)
    const {
        character: rawCharacter,
        setCharacter,
        importJSON,
        exportJSON
    } = useCharacterIO();

    // 2. Base Hydration (Getting item details from JSON)
    const { character: hydratedItemsChar } = useCharacter(rawCharacter, rulesDataParam);

    // 3. Prepare Inputs for specialized hooks
    const equippedUids = useMemo(() => {
        if (!rawCharacter?.equipment) return [];
        return [
            rawCharacter.equipment.activeWeapon,
            rawCharacter.equipment.offhand,
            rawCharacter.equipment.armor,
            ...Object.values(rawCharacter.equipment.accessories || {})
        ].filter(Boolean);
    }, [rawCharacter?.equipment]);

    const classNames = useMemo(() =>
            (hydratedItemsChar?.classes || []).map((c: any) => c.name),
        [hydratedItemsChar?.classes]);

    // 4. Delegate Action Discovery (Using the new hook)
    const hydratedActions = useActions(
        hydratedItemsChar?.inventory || [],
        equippedUids,
        classNames,
        (rawCharacter?.actions || []).map((a: any) => a.id)
    );

    // 5. Final Object Assembly
    const character = useMemo(() => {
        if (!hydratedItemsChar) return null;

        return {
            ...hydratedItemsChar,
            actions: hydratedActions,
            // Mapping UIDs back for components that need to identify "active" items
            activeWeaponUid: rawCharacter?.equipment?.activeWeapon,
            offhandUid: rawCharacter?.equipment?.offhand,
            activeArmorUid: rawCharacter?.equipment?.armor
        };
    }, [hydratedItemsChar, hydratedActions, rawCharacter?.equipment]);

    // 6. Stat Calculations (Triggered by the assembled character)
    const derived = useDerivedStats(character, rulesDataParam);

    return {
        character,
        derived,
        setCharacter,
        importJSON,
        exportJSON,
        isLoading: !rawCharacter || !character
    };
}