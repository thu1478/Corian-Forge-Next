import { PotencyStrength as PotencyOffsets } from "@/lib/rules"

/** JSON rules use lowercase strings; runtime may use numeric offsets. */
export function potencyStrengthToModifier(strength: unknown): number {
  if (typeof strength === "number" && Number.isFinite(strength)) {
    return strength
  }
  if (typeof strength === "string") {
    const k = strength.trim().toLowerCase()
    if (k === "weak") return PotencyOffsets.Weak
    if (k === "average") return PotencyOffsets.Average
    if (k === "strong") return PotencyOffsets.Strong
  }
  return PotencyOffsets.Strong
}

export function potencyStrengthDisplayLabel(strength: unknown): string | null {
  if (typeof strength === "string") {
    const k = strength.trim().toLowerCase()
    if (k === "weak" || k === "average" || k === "strong") return k
  }
  if (typeof strength === "number" && Number.isFinite(strength)) {
    if (strength === PotencyOffsets.Weak) return "weak"
    if (strength === PotencyOffsets.Average) return "average"
    if (strength === PotencyOffsets.Strong) return "strong"
  }
  return null
}
