import type { ActionCard } from "@/lib/rules"

function isMonsterCatalogEntry(id: string, card: { type?: string; source?: string }) {
    if (id.startsWith("monster/")) return true
    if (String(card.source || "").toLowerCase() === "monster") return true
    return false
}

/** Every global `actionCards` attack action except monster entries (feat, fairy, generic, equipment, …). */
export function listCatalogActionCardIds(rules: {
    actionCards?: Record<string, ActionCard | Record<string, unknown>>
}): string[] {
    const cards = rules.actionCards || {}
    return Object.entries(cards)
        .filter(([id, c]) => (c as ActionCard)?.type === "action" && !isMonsterCatalogEntry(id, c as ActionCard))
        .map(([id]) => id)
        .sort()
}

/** Global `actionCards` with `type === "reaction"` or `freeReaction` except monster entries. */
export function listCatalogReactionCardIds(rules: {
    actionCards?: Record<string, ActionCard | Record<string, unknown>>
}): string[] {
    const cards = rules.actionCards || {}
    return Object.entries(cards)
        .filter(([id, c]) => {
            const t = (c as ActionCard)?.type
            return (t === "reaction" || t === "freeReaction") && !isMonsterCatalogEntry(id, c as ActionCard)
        })
        .map(([id]) => id)
        .sort()
}
