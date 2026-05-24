import { applyRestChargeEffects, type RulesWithCharges } from "@/lib/charge-helpers"
import type { Reaction } from "@/lib/rules"

/**
 * Class reactions plus global `actionCards` with `type === "reaction"` or `freeReaction`, each global card
 * merged with its rule key as `id` (required for saves and lookups).
 */
export function buildReactionLibrary(rules: { classes?: Record<string, unknown>; actionCards?: Record<string, unknown> }) {
    const classReactions = Object.values(rules?.classes || {}).flatMap((c: any) => c.reactions || [])
    const globalReactions = Object.entries(rules?.actionCards || {})
        .filter(([, a]) => {
            const t = (a as { type?: string })?.type
            return t === "reaction" || t === "freeReaction"
        })
        .map(([id, a]) => ({ ...(a as object), id }))
    return [...classReactions, ...globalReactions]
}

import type { ActionRef, TraitRef } from "@/lib/baseRefs"

type EndOfCombatCharacter = {
    focus?: number
    barrier?: number
    combatDefenseDelta?: number
    combatStabilityDelta?: number
    combatSpeedDelta?: number
    traits?: TraitRef[]
    actions?: ActionRef[]
    reactions?: Reaction[]
}

/** Focus/barrier cleared, combat stat adjustments reset; restores charges tagged `endOfCombat`. */
export function applyEndOfCombatEffects<T extends EndOfCombatCharacter>(
    prev: T,
    attributes: Record<string, number>,
    rules: RulesWithCharges
): T {
    const withCharges = applyRestChargeEffects(
        {
            traits: prev.traits,
            actions: prev.actions,
            reactions: prev.reactions,
        },
        "endOfCombat",
        attributes,
        rules
    )
    return {
        ...prev,
        ...withCharges,
        focus: 0,
        barrier: 0,
        combatDefenseDelta: 0,
        combatStabilityDelta: 0,
        combatSpeedDelta: 0,
    }
}
