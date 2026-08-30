import {useMemo} from 'react';
import {useCharacterIO} from '@/hooks/character/use-character-io';
import {hydrateItemData} from "@/hooks/character/use-item-hydration";
import {useActions} from "@/hooks/character/use-action-cards";
import type { CharacterSaveData } from "@/lib/character-data";
import type { RulesRoot } from "@/lib/rules-data";
import {Reaction, type CharacterClass, type TraitEffect} from "@/lib/rules";
import {ReactionRef, TraitRef} from "@/lib/baseRefs";
import {HydratedCharacter} from "@/lib/HydratedChar";
import { mergeActionChargeState } from "@/logic/traits/charge-helpers";
import {buildReactionLibrary} from "@/logic/traits/rest-helpers";
import { getInjectedEquipmentReactionRefs } from "@/logic/equipment/granted-actions";
import {
    getActiveDruidAnimaActionRefs,
    getDeployedCreatureActionRefs,
    getInjectedCompanionReactionRefs,
    type RulesWithBestiary,
} from "@/logic/creatures/roster";
import { discoverAllTraitRefs, hydrateTraitRefs } from "@/logic/traits/trait-hydration";
import { resolvePassiveById } from "@/logic/traits/passive-lookup";
import { computeDerivedStats } from "@/logic/character/derived-stats";
import { applyActionEnhancements } from "@/logic/actions/action-enhancements";
import { resolveEquippedHands } from "@/logic/equipment/weapon-utils";
import { getEquippedAnimaNaturalKeys } from "@/logic/equipment/natural-weapons";

export function useDataLoader(rulesDataParam: RulesRoot) {
    const rosterRules = rulesDataParam as RulesWithBestiary
    // 1. Core Data IO (The source of truth)
    const {
        character: rawCharacter,
        setCharacter,
        importJSON,
        exportJSON,
        clearSavedCharacter,
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

    const handSlotUids = useMemo((): [string | null, string | null] | null => {
        if (!rawCharacter?.equipment) return null;
        return [
            rawCharacter.equipment.activeWeapon ?? null,
            rawCharacter.equipment.offhand ?? null,
        ];
    }, [rawCharacter?.equipment]);

    const classNames = useMemo(
        () =>
            (hydratedItemsChar?.classes || [])
                .map((c: CharacterClass & { name?: string }) => c.name)
                .filter((name): name is string => Boolean(name)),
        [hydratedItemsChar?.classes]
    );

    // 4. Delegate Action Discovery (Using the new hook)
    const traitActionIds = useMemo(() => {
        return traitRefs.map((ref) => {
            const rule = resolvePassiveById(ref.id, rulesDataParam, {
                character: hydratedItemsChar ?? undefined,
                traitRef: ref,
            })
            const effects = rule?.effects
            if (!Array.isArray(effects)) return undefined
            return effects.find(
                (e: TraitEffect) => e.type === "GrantActionCard"
            )?.value
        }).filter(Boolean)
    }, [traitRefs, rulesDataParam, hydratedItemsChar])

    const creatureActionRefs = useMemo(
        () => getDeployedCreatureActionRefs(rawCharacter, rosterRules),
        [rawCharacter?.creatures, rawCharacter?.traits, rosterRules]
    )

    const activeAnimaActionRefs = useMemo(
        () => getActiveDruidAnimaActionRefs(rawCharacter, rosterRules),
        [
            rawCharacter?.activeDruidAnimaTemplateId,
            rawCharacter?.druidAnimaTemplateIds,
            rawCharacter?.classes,
            rawCharacter?.traits,
            rosterRules,
        ]
    )

    const creatureGrantedActionIds = useMemo(
        () => [...creatureActionRefs, ...activeAnimaActionRefs].map((r) => r.id),
        [creatureActionRefs, activeAnimaActionRefs]
    )

    const reactionRefsWithInjections = useMemo(() => {
        const base = [...(rawCharacter?.reactions || [])] as ReactionRef[]
        const equipInject = getInjectedEquipmentReactionRefs(
            {
                equipment: rawCharacter?.equipment,
                inventory: hydratedItemsChar?.inventory,
                reactions: rawCharacter?.reactions,
            },
            rulesDataParam
        )
        const inject = [
            ...getInjectedCompanionReactionRefs(rawCharacter, rosterRules),
            ...equipInject,
        ]
        const seen = new Set(base.map((r) => r.id))
        for (const r of inject) {
            if (seen.has(r.id)) continue
            seen.add(r.id)
            base.push(r)
        }
        return base
    }, [
        rawCharacter?.reactions,
        rawCharacter?.creatures,
        rawCharacter?.traits,
        rawCharacter?.equipment,
        rawCharacter?.inventory,
        rosterRules,
        hydratedItemsChar?.inventory,
    ])

    const resolvedHands = useMemo(
        () =>
            resolveEquippedHands(rawCharacter, {
                rules: rosterRules,
                activeDruidAnimaTemplateId: rawCharacter?.activeDruidAnimaTemplateId,
            }),
        [
            rawCharacter?.equipment,
            rawCharacter?.inventory,
            rawCharacter?.activeDruidAnimaTemplateId,
            rulesDataParam,
        ]
    )

    const animaEquippedNaturalKeys = useMemo(
        () =>
            rawCharacter?.activeDruidAnimaTemplateId
                ? getEquippedAnimaNaturalKeys(rawCharacter)
                : new Set<string>(),
        [rawCharacter?.activeDruidAnimaTemplateId, rawCharacter?.equipment]
    )

    const activeAnimaActionIdList = useMemo(
        () => activeAnimaActionRefs.map((r) => r.id),
        [activeAnimaActionRefs]
    )

    const actionAttributes = rawCharacter?.attributes ?? {}

    const hydratedActions = useActions(
        hydratedItemsChar?.inventory || [],
        equippedUids,
        classNames,
        [
            ...(rawCharacter?.actions || []),
            ...traitActionIds.map((id) => ({ id })),
            ...creatureActionRefs,
            ...activeAnimaActionRefs,
        ],
        handSlotUids,
        creatureGrantedActionIds,
        traitRefs as TraitRef[] | undefined,
        resolvedHands,
        activeAnimaActionIdList,
        animaEquippedNaturalKeys,
        actionAttributes,
    );

    // 5. Final Object Assembly
    const character = useMemo(() => {
        if (!hydratedItemsChar) return null;

        const fullyHydrated = hydrateCharacter(
            {...hydratedItemsChar, reactions: reactionRefsWithInjections} as unknown as CharacterSaveData,
            rulesDataParam
        );

        // console.log("Fully hydrated")
        // console.log(fullyHydrated);
        const respite =
            Number.isFinite(fullyHydrated.respite)
                ? fullyHydrated.respite
                : 4

        const actionRefs = rawCharacter?.actions ?? []
        const actionsWithCharges = mergeActionChargeState(
            hydratedActions,
            actionRefs,
            fullyHydrated.attributes ?? rawCharacter?.attributes ?? {},
            rulesDataParam
        )

        const hydratedTraits = hydrateTraitRefs(
            traitRefs,
            hydratedItemsChar ?? rawCharacter,
            rulesDataParam
        )
        const actionsWithEnhancements = applyActionEnhancements(
            actionsWithCharges,
            hydratedTraits,
            rulesDataParam
        )

        return {
            ...fullyHydrated,
            respite,
            actions: actionsWithEnhancements,
            traitRefs,
            hydratedTraits,
            // Mapping UIDs back for components that need to identify "active" items
            activeWeaponUid: rawCharacter?.equipment?.activeWeapon,
            offhandUid: rawCharacter?.equipment?.offhand,
            activeArmorUid: rawCharacter?.equipment?.armor
        };
    }, [
        hydratedItemsChar,
        hydratedActions,
        traitRefs,
        rawCharacter,
        rulesDataParam,
        reactionRefsWithInjections,
    ]);

    const derived = useMemo(
        () => computeDerivedStats(character, rulesDataParam),
        [character, rulesDataParam]
    );

    return {
        character,
        derived,
        setCharacter,
        importJSON,
        exportJSON,
        clearSavedCharacter,
        isLoading: !rawCharacter || !character
    };
}

export function hydrateCharacter(rawSave: CharacterSaveData, rules: RulesRoot): HydratedCharacter {
    // Flatten the rules once so we aren't searching classes in a loop
    // Pull data from classes
    // const classActions = Object.values(rules?.classes || {})
    //     .flatMap((c: any) => c.actions || []);
    const reactionLibrary = buildReactionLibrary(rules);

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
        reactions: (rawSave.reactions ?? []).map((ref: ReactionRef) => {
            const rule = reactionLibrary.find(r => r.id === ref.id);
            return {
                ...rule, // Trigger, Description, Name
                ...ref   // Charges, SlotIndex (overwrites defaults)
            } as Reaction;
        }),
        // Repeat this pattern for Traits, Actions, etc.
    } as unknown as HydratedCharacter;
}
