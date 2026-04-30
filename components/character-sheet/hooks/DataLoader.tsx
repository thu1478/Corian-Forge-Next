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

    // Retrieve all trait refs before further hydration
    const traitRefs = useMemo(() =>
            discoverAllTraitRefs(hydratedItemsChar, rulesDataParam),
        [hydratedItemsChar, rulesDataParam]);

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
    const traitActionIds = useMemo(() => {
        return traitRefs.map(ref => {
            // Find the rule to check for GrantActionCard
            let rule = rulesDataParam.passives?.[ref.id];

            // Fallback to class passives if not global
            if (!rule) {
                for (const cls of Object.values(rulesDataParam.classes || {})) {
                    if ((cls as any).passives?.[ref.id]) {
                        rule = (cls as any).passives[ref.id];
                        break;
                    }
                }
            }

            // Fallback to item-specific trait data (like PocketCoatIPBonus)
            if (!rule && ref.itemId) {
                const item = hydratedItemsChar?.inventory?.find((i: any) => i.uid === ref.itemId);
                const nested = item?.traits?.find((t: any) => typeof t === 'object' && t[ref.id]);
                if (nested) rule = nested[ref.id];
            }

            return rule?.effects?.find((e: any) => e.type === "GrantActionCard")?.value;
        }).filter(Boolean);
    }, [traitRefs, rulesDataParam]);

    const hydratedActions = useActions(
        hydratedItemsChar?.inventory || [],
        equippedUids,
        classNames,
        [...(rawCharacter?.actions || []), ...traitActionIds.map(id => ({ id }))]
    );

    // 5. Final Object Assembly
    const character = useMemo(() => {
        if (!hydratedItemsChar) return null;

        const fullyHydrated = hydrateCharacter(hydratedItemsChar, rulesDataParam);

        // console.log("Fully hydrated")
        // console.log(fullyHydrated);
        return {
            ...fullyHydrated,
            actions: hydratedActions,
            traitRefs,
            // Mapping UIDs back for components that need to identify "active" items
            activeWeaponUid: rawCharacter?.equipment?.activeWeapon,
            offhandUid: rawCharacter?.equipment?.offhand,
            activeArmorUid: rawCharacter?.equipment?.armor
        };
    }, [hydratedItemsChar, hydratedActions, traitRefs, rawCharacter?.equipment, rulesDataParam]);

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

export function discoverAllTraitRefs(character: any, rulesData?: any) {
    if (!character) return [];

    // This Map ensures each ID exists exactly once
    const traitMap = new Map<string, any>();

    // 1. Process Innate Racial Traits (Auto-granted based on race)
    if (character.race && rulesData?.races?.[character.race.toLowerCase()]?.passives) {
      Object.entries(rulesData.races[character.race.toLowerCase()].passives).forEach(([id, passive]: [string, any]) => {
        if (passive.type === "innate") {
          traitMap.set(id, {
            id,
            source: "racial",
            inlineDefinition: passive
          });
        }
      });
    }

    // 2. Process Selected Traits (from user's selection)
    const baseRefs = character.traits || [];
    baseRefs.forEach((t: any) => {
      const id = typeof t === 'object' ? (t.id || Object.keys(t)[0]) : t;
      const declaredSource = typeof t === "object" && typeof t.source === "string" ? t.source.toLowerCase() : "other";
      const existing = traitMap.get(id);
      const next: any = {
        ...(existing || {}),
        id,
        source: declaredSource,
      };
      if (typeof t === "object") {
        if (!t.id && t[id]) next.inlineDefinition = t[id];
        if (t.itemId) next.itemId = t.itemId;
        if (Array.isArray(t.selectedEffectIndices)) {
          next.selectedEffectIndices = t.selectedEffectIndices;
        }
      }
      traitMap.set(id, next);
    });

    // 2. Identify Unique Active Item UIDs
    const activeUids = new Set(
        [
            character.equipment?.activeWeapon,
            character.equipment?.offhand,
            character.equipment?.armor,
            ...Object.values(character.equipment?.accessories || {})
        ]
            .filter(Boolean)
            .map(slot => (typeof slot === 'object' ? slot.uid : slot))
    );

    // 3. Process Gear Traits (Overwrite Layer)
    activeUids.forEach((targetUid) => {
        const item = character.inventory?.find((inv: any) => String(inv.uid) === String(targetUid));
        if (item?.traits) {
            item.traits.forEach((traitEntry: any) => {
                const id = typeof traitEntry === 'object'
                    ? Object.keys(traitEntry)[0]
                    : traitEntry;
                if (!id) return;

                // Overwrites innate if ID is the same
                traitMap.set(id, {
                    id,
                    source: "equipment",
                    itemId: targetUid,
                    inlineDefinition: typeof traitEntry === 'object' ? traitEntry[id] : null
                });
            });
        }
    });

    // Convert the unique Map back into the array we need
    return Array.from(traitMap.values());
}