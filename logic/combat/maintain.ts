/** Damage in one turn that ends a Maintain effect: half Willpower, rounding up. */
export function maintainBreakThreshold(willpower: number): number {
    const score = Number.isFinite(willpower) ? willpower : 0
    return Math.max(0, Math.ceil(score / 2))
}
