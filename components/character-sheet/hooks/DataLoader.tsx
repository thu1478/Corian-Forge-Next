import {useMemo} from 'react';
import {useCharacterIO} from '@/hooks/CharacterLoader';
import {hydrateItemData} from "@/hooks/ItemLoader";
import {useDerivedStats} from "@/components/character-sheet/hooks/statCalculator";
import {useActions} from "@/hooks/ActionCardLoader";
import {ActionCard, Reaction} from "@/lib/rules";
import {ReactionRef} from "@/lib/baseRefs";
import {HydratedCharacter} from "@/lib/HydratedChar";

export function useDataLoader(rulesDataParam: any) {
    // 1. Core Data IO (The source of truth)
    const {
        character: rawCharacter,
        setCharacter,
        importJSON,
        exportJSON
    } = useCharacterIO();

    // 2. Base Hydration (Getting item details from JSON)
    const { character: hydratedItemsChar } = hydrateItemData(rawCharacter, rulesDataParam);

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
        rawCharacter?.actions || []
    );

    // 5. Final Object Assembly
    const character = useMemo(() => {
        if (!hydratedItemsChar) return null;

        const fullyHydrated = hydrateCharacter(hydratedItemsChar, rulesDataParam);

        return {
            ...fullyHydrated,
            actions: hydratedActions,
            // Mapping UIDs back for components that need to identify "active" items
            activeWeaponUid: rawCharacter?.equipment?.activeWeapon,
            offhandUid: rawCharacter?.equipment?.offhand,
            activeArmorUid: rawCharacter?.equipment?.armor
        };
    }, [hydratedItemsChar, hydratedActions, rawCharacter?.equipment, rulesDataParam]);

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

export function hydrateCharacter(rawSave: any, rules: any): HydratedCharacter {
    // Flatten the rules once so we aren't searching classes in a loop
    // Pull data from classes
    // const classActions = Object.values(rules?.classes || {})
    //     .flatMap((c: any) => c.actions || []);
    const classReactions = Object.values(rules?.classes || {})
        .flatMap((c: any) => c.reactions || []);
    // Pull generic data not tied to classes as well
    const globalActions = Object.values(rules?.actionCards || []);
    // const actionLibrary = [...classActions, ...globalActions.filter(a => (a as ActionCard).type === "action")];
    const reactionLibrary = [...classReactions, ...globalActions.filter(a => (a as ActionCard).type === "reaction")];

    return {
        ...rawSave,
        // actions: rawSave.actions.map((ref: ActionRef) => {
        //     const rule = actionLibrary.find(r => r.id === ref.id);
        //     return {
        //         ...rule, // Trigger, Description, Name
        //         ...ref   // Charges, SlotIndex (overwrites defaults)
        //     } as ActionCard;
        // }),
        // Map the thin Refs into full-fat Reaction objects for the UI
        reactions: rawSave.reactions.map((ref: ReactionRef) => {
            const rule = reactionLibrary.find(r => r.id === ref.id);
            return {
                ...rule, // Trigger, Description, Name
                ...ref   // Charges, SlotIndex (overwrites defaults)
            } as Reaction;
        }),
        // Repeat this pattern for Traits, Actions, etc.
    };
}