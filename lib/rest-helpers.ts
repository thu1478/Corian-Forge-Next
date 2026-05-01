import { getAttributeModifier } from "@/lib/character-data"
import type { Reaction } from "@/lib/rules"

/** Same reaction pool as `hydrateCharacter` in DataLoader. */
function buildReactionLibrary(rules: { classes?: Record<string, unknown>; actionCards?: Record<string, unknown> }) {
    const classReactions = Object.values(rules?.classes || {}).flatMap((c: any) => c.reactions || [])
    const globalActions = Object.values(rules?.actionCards || {})
    return [...classReactions, ...globalActions.filter((a: any) => a?.type === "reaction")]
}

/**
 * Sets each reaction's `charges` to its current maximum.
 * Uses `chargeStat` from the **rules definition** when present so saves that omit or null out
 * `chargeStat` still refill correctly. Reactions with `charges === -1` are left unchanged.
 */
export function restoreReactionCharges<T extends Reaction>(
    reactions: T[],
    attributes: Record<string, number>,
    rules: { classes?: Record<string, unknown>; actionCards?: Record<string, unknown> }
): T[] {
    const library = buildReactionLibrary(rules)
    return reactions.map((rx) => {
        if (rx.charges === -1) return rx

        const rule = library.find((r: any) => r?.id === rx.id) as { chargeStat?: string | null } | undefined
        const statFromRule =
            typeof rule?.chargeStat === "string" ? rule.chargeStat.trim() : ""
        const statFromRx =
            typeof rx.chargeStat === "string" ? rx.chargeStat.trim() : ""
        const stat = statFromRule || statFromRx
        if (!stat) return rx

        const maxCh = Math.max(0, getAttributeModifier(attributes[stat] ?? 10))
        return { ...rx, charges: maxCh }
    })
}
