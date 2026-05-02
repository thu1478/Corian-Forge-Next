/**
 * Class reactions may embed `actionCard` as the card itself, or as a single keyed wrapper
 * (legacy import shape, e.g. `{ flareArrow: { … } }`).
 */
export function unwrapEmbeddedActionCard(
    actionCard: Record<string, unknown> | undefined
): Record<string, unknown> | null {
    if (!actionCard || typeof actionCard !== "object" || Array.isArray(actionCard)) return null
    const o = actionCard
    if (typeof o.name === "string" && o.type != null) return o
    for (const v of Object.values(o)) {
        if (
            v &&
            typeof v === "object" &&
            !Array.isArray(v) &&
            typeof (v as Record<string, unknown>).name === "string"
        ) {
            return v as Record<string, unknown>
        }
    }
    return null
}
