/**
 * Class XP “packets” are earned per class level (see {@link getMaxClassXpPacketCount}).
 * For UI we group those packets under adventurer-style cutoffs 1 / 3 / 5 / 7 / 9 so players see
 * which tier of talents still has unspent picks (same smallest-first assignment as creator validation).
 */

export const CLASS_XP_ADVENTURER_CUTOFFS = [1, 3, 5, 7, 9] as const
export type ClassXpAdventurerCutoff = (typeof CLASS_XP_ADVENTURER_CUTOFFS)[number]

export type ClassXpPacket = { tier: number; cutoff: ClassXpAdventurerCutoff }

type LevelKey = `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`

/** Starting XP threshold for an adventurer tier (from rules `startingXPPerLvl`). */
export function getStartingXpForAdventurerLevel(
    adventurerLevel: number,
    startingXPPerLvl: Record<string, number>
): number {
    return startingXPPerLvl[String(adventurerLevel) as LevelKey] ?? 0
}

/** Total XP cost to reach `classLevel` in one class (sum of `xpCostPerLvl` 1..level). */
export function calculateClassXPCost(
    classLevel: number,
    xpCostPerLvl: Record<string, number>
): number {
    let total = 0
    for (let i = 1; i <= classLevel; i++) {
        total += xpCostPerLvl[String(i) as LevelKey] ?? 0
    }
    return total
}

/** Talent pick slots earned at `classLevel` (same count as {@link buildClassXpPackets}). */
export function getMaxClassXpPacketCount(classLevel: number): number {
    return buildClassXpPackets(classLevel).length
}

/** Alias kept for call sites that pass this as a callback (e.g. fairy-tamer). */
export const getMaxClassXP = getMaxClassXpPacketCount

/**
 * XP available to spend on class levels: max of starting threshold for adventurer tier and earned total.
 */
export function getAdventurerXpBudget(
    adventurerLevel: number,
    totalXP: number,
    startingXPPerLvl: Record<string, number>
): number {
    return Math.max(getStartingXpForAdventurerLevel(adventurerLevel, startingXPPerLvl), totalXP)
}

/** Class levels 1–2 → cutoff 1, 3–4 → 3, … */
export function classLevelToXpCutoff(classLevel: number): ClassXpAdventurerCutoff {
    if (classLevel <= 2) return 1
    if (classLevel <= 4) return 3
    if (classLevel <= 6) return 5
    if (classLevel <= 8) return 7
    return 9
}

/** Packets for one class at `classLevel`, same construction as availablePackets in ClassSelection. */
export function buildClassXpPackets(classLevel: number): ClassXpPacket[] {
    const out: ClassXpPacket[] = []
    for (let l = 1; l <= classLevel; l++) {
        const count = l <= 4 ? 2 : 1
        const cutoff = classLevelToXpCutoff(l)
        for (let j = 0; j < count; j++) {
            out.push({ tier: l, cutoff })
        }
    }
    return out
}

export type ClassXpBandSummary = {
    cutoff: ClassXpAdventurerCutoff
    /** Inclusive class level range that contributes packets to this band */
    classLevelRangeLabel: string
    total: number
    assigned: number
    remaining: number
}

const CUTOFF_RANGE: Record<ClassXpAdventurerCutoff, string> = {
    1: "1–2",
    3: "3–4",
    5: "5–6",
    7: "7–8",
    9: "9–10",
}

/**
 * Assign each pick (talent min level) a distinct packet whose tier is ≥ that level.
 * Picks are processed **highest requirement first**; each step uses the **smallest** packet that still fits so
 * low tiers are spent before high tiers when possible (same rule as creator validation).
 */
export function assignClassXpPacketsSmallestFirst(
    classLevel: number,
    pickTalentLevels: number[]
): ClassXpPacket[] | null {
    const pool = buildClassXpPackets(classLevel).map((p, i) => ({ p, i }))
    pool.sort((a, b) => (a.p.tier !== b.p.tier ? a.p.tier - b.p.tier : a.i - b.i))
    const picks = [...pickTalentLevels].sort((a, b) => b - a)
    const consumed: ClassXpPacket[] = []
    for (const need of picks) {
        const idx = pool.findIndex(({ p }) => p.tier >= need)
        if (idx < 0) return null
        consumed.push(pool[idx]!.p)
        pool.splice(idx, 1)
    }
    return consumed
}

/** True if every pick can be satisfied with a distinct packet (see {@link assignClassXpPacketsSmallestFirst}). */
export function canAssignClassXpPicksSmallestFirst(pickTalentLevels: number[], classLevel: number): boolean {
    return assignClassXpPacketsSmallestFirst(classLevel, pickTalentLevels) !== null
}

/**
 * How many packets from each adventurer cutoff are consumed under smallest-first assignment.
 * Unassigned packets do not count as “assigned” to any cutoff.
 */
export function summarizeClassXpByAdventurerCutoff(
    classLevel: number,
    pickTalentLevels: number[]
): ClassXpBandSummary[] {
    const packets = buildClassXpPackets(classLevel)
    const byCutoffTotal = new Map<ClassXpAdventurerCutoff, number>()
    for (const p of packets) {
        byCutoffTotal.set(p.cutoff, (byCutoffTotal.get(p.cutoff) ?? 0) + 1)
    }

    const consumed = assignClassXpPacketsSmallestFirst(classLevel, pickTalentLevels) ?? []
    const byCutoffAssigned = new Map<ClassXpAdventurerCutoff, number>()
    for (const p of consumed) {
        byCutoffAssigned.set(p.cutoff, (byCutoffAssigned.get(p.cutoff) ?? 0) + 1)
    }

    return CLASS_XP_ADVENTURER_CUTOFFS.map((cutoff) => {
        const total = byCutoffTotal.get(cutoff) ?? 0
        const assigned = byCutoffAssigned.get(cutoff) ?? 0
        return {
            cutoff,
            classLevelRangeLabel: CUTOFF_RANGE[cutoff],
            total,
            assigned,
            remaining: total - assigned,
        }
    }).filter((row) => row.total > 0)
}
