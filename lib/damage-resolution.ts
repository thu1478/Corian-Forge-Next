import { normalizeDamageTypeKey } from "@/lib/damage-type-key"

const PHYSICAL_DAMAGE_TYPES = new Set(["crushing", "slashing", "piercing"])

export function isPhysicalDamageType(damageType: string): boolean {
  return PHYSICAL_DAMAGE_TYPES.has(normalizeDamageTypeKey(damageType))
}

/** Types that appear as both resistance and vulnerability — effects cancel for that type. */
export function conflictingDamageTypeKeys(
  resistances: string[],
  vulnerabilities: Record<string, number>
): Set<string> {
  const vulnKeys = new Set(Object.keys(vulnerabilities).map(normalizeDamageTypeKey))
  const out = new Set<string>()
  for (const r of resistances) {
    const k = normalizeDamageTypeKey(r)
    if (vulnKeys.has(k)) out.add(k)
  }
  return out
}

export type DamageChannel = "physical" | "magical"

export type ResolveIncomingDamageInput = {
  rawDamage: number
  penetration: number
  defense: number
  /** When physical: treat defense as halved (round up) before subtracting penetration. */
  sundered?: boolean
  /** Physical vs magical delivery — controls defense + penetration (separate from elemental type for R/V). */
  damageChannel: DamageChannel
  /** Rules damage type (crushing, fire, …) for resist / vulnerability only. */
  damageType: string
  resistances: string[]
  vulnerabilities: Record<string, number>
}

export type ResolveIncomingDamageBreakdown = {
  rawDamage: number
  relevantDefense: number
  afterDefense: number
  resistApplied: boolean
  afterResist: number
  vulnFlat: number
  conflict: boolean
  finalDamage: number
}

/**
 * Incoming hit: defense + penetration when damageChannel is physical (any damage type),
 * optional sundered halves defense (round up) before penetration,
 * then resistance (half, round up), then flat vulnerability keyed by damageType.
 * If the type is both resisted and vulnerable, neither modifier applies.
 */
export function resolveIncomingDamage(input: ResolveIncomingDamageInput): ResolveIncomingDamageBreakdown {
  const typeKey = normalizeDamageTypeKey(input.damageType)
  const raw = Math.max(0, Math.floor(Number(input.rawDamage)) || 0)
  const pen = Math.max(0, Math.floor(Number(input.penetration)) || 0)
  const defense = Math.max(0, Math.floor(Number(input.defense)) || 0)

  let relevantDefense = 0
  let afterDefense: number

  if (input.damageChannel === "physical") {
    const defenseForHit = input.sundered ? Math.ceil(defense / 2) : defense
    relevantDefense = Math.max(defenseForHit - pen, 0)
    if (raw <= 0) {
      afterDefense = 0
    } else {
      afterDefense = Math.max(1, raw - relevantDefense)
    }
  } else {
    afterDefense = raw
  }

  const conflicts = conflictingDamageTypeKeys(input.resistances, input.vulnerabilities)
  const conflict = conflicts.has(typeKey)

  let afterResist = afterDefense
  let resistApplied = false
  if (!conflict && input.resistances.some((r) => normalizeDamageTypeKey(r) === typeKey)) {
    resistApplied = true
    afterResist = Math.ceil(afterDefense / 2)
  }

  let vulnFlat = 0
  if (!conflict) {
    for (const [k, v] of Object.entries(input.vulnerabilities)) {
      if (normalizeDamageTypeKey(k) === typeKey) {
        vulnFlat += Math.floor(Number(v)) || 0
      }
    }
  }

  const finalDamage = Math.max(0, afterResist + vulnFlat)

  return {
    rawDamage: raw,
    relevantDefense,
    afterDefense,
    resistApplied,
    afterResist,
    vulnFlat,
    conflict,
    finalDamage,
  }
}
