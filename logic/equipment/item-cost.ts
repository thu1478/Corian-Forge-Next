export function catalogItemZennyCost(def: Record<string, unknown> | undefined): number {
    const raw = def?.value
    if (raw == null || typeof raw !== "number" || !Number.isFinite(raw)) return 0
    return Math.max(0, Math.floor(raw))
}

export function catalogItemIsAffordable(
    def: Record<string, unknown> | undefined,
    zenny: number,
): boolean {
    return catalogItemZennyCost(def) <= zenny
}
