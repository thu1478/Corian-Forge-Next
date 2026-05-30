export const STANDARD_CREATURE_SIZES = ["1T", "1S", "1M", "1L"] as const

export type StandardCreatureSize = (typeof STANDARD_CREATURE_SIZES)[number]
export type NumericCreatureSize = `${number}`
export type CreatureSize = StandardCreatureSize | NumericCreatureSize

export function isCreatureSize(value: unknown): value is CreatureSize {
    if (typeof value !== "string") return false
    if ((STANDARD_CREATURE_SIZES as readonly string[]).includes(value)) return true
    return /^[2-9]\d*$/.test(value)
}
