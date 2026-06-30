import { normalizeDamageTypeKey } from "./damage-type-key.js"

const PHYSICAL_DAMAGE_TYPES = new Set(["crushing", "slashing", "piercing"])

export function isPhysicalDamageType(damageType: string): boolean {
    return PHYSICAL_DAMAGE_TYPES.has(normalizeDamageTypeKey(damageType))
}

export function conflictingDamageTypeKeys(
    resistances: string[],
    vulnerabilities: Record<string, number>,
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
    sundered?: boolean
    damageChannel: DamageChannel
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

export function resolveIncomingDamage(
    input: ResolveIncomingDamageInput,
): ResolveIncomingDamageBreakdown {
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
