import { getAttributeModifier } from "@/lib/character-data"
import type { Reaction } from "@/lib/rules"

/**
 * Class reactions plus global `actionCards` with `type === "reaction"`, each global card
 * merged with its rule key as `id` (required for saves and lookups).
 */
export function buildReactionLibrary(rules: { classes?: Record<string, unknown>; actionCards?: Record<string, unknown> }) {
    const classReactions = Object.values(rules?.classes || {}).flatMap((c: any) => c.reactions || [])
    const globalReactions = Object.entries(rules?.actionCards || {})
        .filter(([, a]) => (a as { type?: string })?.type === "reaction")
        .map(([id, a]) => ({ ...(a as object), id }))
    return [...classReactions, ...globalReactions]
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
