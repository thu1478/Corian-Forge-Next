import type { BondEmotion, BondEmotionType, BondTarget } from "@/lib/rules"

export const FALLBACK_BOND_PAIRS: [string, string][] = [
    ["admiration", "inferiority"],
    ["loyalty", "mistrust"],
    ["affection", "hatred"],
]

export const FALLBACK_BOND_LABELS: Record<string, string> = {
    admiration: "Admiration",
    inferiority: "Inferiority",
    loyalty: "Loyalty",
    mistrust: "Mistrust",
    affection: "Affection",
    hatred: "Hatred",
}

export interface NormalizedBondRules {
    maxTargets: number
    maxEmotionsPerTarget: number
    typePairs: [string, string][]
    labels: Record<string, string>
    allTypeIds: string[]
    oppositeOf: Map<string, string>
}

/** Normalize target name for grouping legacy flat `bonds` rows. */
export function bondNameKey(name: string): string {
    return name.trim().toLowerCase()
}

export function newBondId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return `bond-${crypto.randomUUID()}`
    }
    return `bond-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildOppositeMap(pairs: [string, string][]): Map<string, string> {
    const m = new Map<string, string>()
    for (const [a, b] of pairs) {
        if (!a || !b || a === b) continue
        m.set(a, b)
        m.set(b, a)
    }
    return m
}

/** Read bond configuration from `rules.system` (expects `system.bonds` from rules.json). */
export function normalizeBondRules(system: unknown): NormalizedBondRules {
    const raw = (system as { bonds?: unknown } | null)?.bonds as
        | {
              maxTargets?: unknown
              maxPerCharacter?: unknown
              maxEmotionsPerTarget?: unknown
              typePairs?: unknown
              labels?: unknown
          }
        | undefined

    let typePairs: [string, string][] = [...FALLBACK_BOND_PAIRS]
    if (Array.isArray(raw?.typePairs) && raw.typePairs.length > 0) {
        const parsed: [string, string][] = []
        for (const p of raw.typePairs) {
            if (!Array.isArray(p) || p.length < 2) continue
            const a = String(p[0] ?? "").trim()
            const b = String(p[1] ?? "").trim()
            if (a && b && a !== b) parsed.push([a, b])
        }
        if (parsed.length > 0) typePairs = parsed
    }

    const labels: Record<string, string> = { ...FALLBACK_BOND_LABELS }
    if (raw?.labels && typeof raw.labels === "object" && raw.labels !== null) {
        for (const [k, v] of Object.entries(raw.labels as Record<string, unknown>)) {
            if (typeof v === "string" && v.trim()) labels[k] = v.trim()
        }
    }

    const allTypeIds = [...new Set(typePairs.flat())]
    const oppositeOf = buildOppositeMap(typePairs)

    const maxTargetsRaw = Number(raw?.maxTargets ?? raw?.maxPerCharacter)
    const maxTargets =
        Number.isFinite(maxTargetsRaw) && maxTargetsRaw > 0
            ? Math.min(20, Math.floor(maxTargetsRaw))
            : 6

    const pairCount = typePairs.length || 3
    const maxEmoRaw = Number(raw?.maxEmotionsPerTarget)
    const maxEmotionsPerTarget = Number.isFinite(maxEmoRaw) && maxEmoRaw > 0
        ? Math.min(allTypeIds.length, Math.floor(maxEmoRaw))
        : Math.min(allTypeIds.length, pairCount)

    return { maxTargets, maxEmotionsPerTarget, typePairs, labels, allTypeIds, oppositeOf }
}

export function bondLevelForTarget(target: BondTarget): number {
    return target.emotions.length
}

function coerceEmotion(row: unknown, rules: NormalizedBondRules): BondEmotion | null {
    if (!row || typeof row !== "object") return null
    const o = row as Record<string, unknown>
    const type = typeof o.type === "string" ? o.type.trim() : ""
    if (!rules.allTypeIds.includes(type)) return null
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newBondId()
    return { id, type: type as BondEmotionType }
}

/** Whether `addType` can be added to this target's emotion list (capacity, duplicate, opposite pair). */
export function canAppendEmotionToTarget(
    emotions: BondEmotion[],
    addType: BondEmotionType,
    rules: NormalizedBondRules
): boolean {
    if (emotions.length >= rules.maxEmotionsPerTarget) return false
    if (emotions.some((e) => e.type === addType)) return false
    const opp = rules.oppositeOf.get(addType)
    if (opp && emotions.some((e) => e.type === opp)) return false
    return true
}

export function canReplaceEmotionInTarget(
    emotions: BondEmotion[],
    emotionId: string,
    nextType: BondEmotionType,
    rules: NormalizedBondRules
): boolean {
    const others = emotions.filter((e) => e.id !== emotionId)
    return canAppendEmotionToTarget(others, nextType, rules)
}

export function isEmotionTypeDisabledForTarget(
    candidateType: string,
    emotionId: string,
    currentType: string,
    emotions: BondEmotion[],
    rules: NormalizedBondRules
): boolean {
    if (candidateType === currentType) return false
    return !canReplaceEmotionInTarget(emotions, emotionId, candidateType as BondEmotionType, rules)
}

function sanitizeEmotionsForTarget(raw: unknown[], rules: NormalizedBondRules): BondEmotion[] {
    const out: BondEmotion[] = []
    const usedIds = new Set<string>()
    for (const row of raw) {
        if (out.length >= rules.maxEmotionsPerTarget) break
        let e = coerceEmotion(row, rules)
        if (!e) continue
        if (!canAppendEmotionToTarget(out, e.type, rules)) continue
        while (usedIds.has(e.id)) {
            e = { ...e, id: newBondId() }
        }
        usedIds.add(e.id)
        out.push(e)
    }
    return out
}

function coerceBondTarget(row: unknown, rules: NormalizedBondRules): BondTarget | null {
    if (!row || typeof row !== "object") return null
    const o = row as Record<string, unknown>
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newBondId()
    const name =
        typeof o.name === "string"
            ? o.name
            : typeof o.target === "string"
              ? o.target
              : ""
    const emotionsRaw = Array.isArray(o.emotions) ? o.emotions : []
    const emotions = sanitizeEmotionsForTarget(emotionsRaw, rules)
    return { id, name, emotions }
}

function sanitizeBondTargetsArray(raw: unknown[], rules: NormalizedBondRules): BondTarget[] {
    const out: BondTarget[] = []
    const usedIds = new Set<string>()
    for (const row of raw) {
        if (out.length >= rules.maxTargets) break
        let t = coerceBondTarget(row, rules)
        if (!t) continue
        while (usedIds.has(t.id)) {
            t = { ...t, id: newBondId() }
        }
        usedIds.add(t.id)
        out.push(t)
    }
    return out
}

/** Migrate legacy `bonds: { id, target, type }[]` into bond targets (grouped by target name). */
export function migrateLegacyFlatBondsToTargets(rows: unknown[], rules: NormalizedBondRules): BondTarget[] {
    type Flat = { id: string; target: string; type: BondEmotionType }
    const flat: Flat[] = []
    for (const row of rows) {
        if (!row || typeof row !== "object") continue
        const o = row as Record<string, unknown>
        const type = typeof o.type === "string" ? o.type.trim() : ""
        if (!rules.allTypeIds.includes(type)) continue
        const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newBondId()
        const target = typeof o.target === "string" ? o.target : ""
        flat.push({ id, target, type: type as BondEmotionType })
    }

    const order: string[] = []
    const map = new Map<string, Flat[]>()
    for (const b of flat) {
        const k = bondNameKey(b.target)
        if (!map.has(k)) {
            order.push(k)
            map.set(k, [])
        }
        map.get(k)!.push(b)
    }

    const targets: BondTarget[] = []
    for (const k of order) {
        if (targets.length >= rules.maxTargets) break
        const list = map.get(k)!
        const name = list[0]?.target ?? ""
        const emotions: BondEmotion[] = []
        const sorted = [...list].sort((a, b) => a.type.localeCompare(b.type))
        for (const r of sorted) {
            if (emotions.length >= rules.maxEmotionsPerTarget) break
            if (!canAppendEmotionToTarget(emotions, r.type, rules)) continue
            emotions.push({ id: r.id, type: r.type })
        }
        if (emotions.length === 0 && !name.trim()) continue
        targets.push({ id: newBondId(), name, emotions })
    }
    return targets
}

/**
 * Build `bondTargets` from import JSON: prefers `bondTargets`, else migrates legacy `bonds`.
 */
export function sanitizeBondTargetsFromCharacterJson(
    json: Record<string, unknown> | null | undefined,
    system: unknown
): BondTarget[] {
    const rules = normalizeBondRules(system)
    if (Array.isArray(json?.bondTargets)) {
        return sanitizeBondTargetsArray(json.bondTargets as unknown[], rules)
    }
    if (Array.isArray(json?.bonds)) {
        return migrateLegacyFlatBondsToTargets(json.bonds as unknown[], rules)
    }
    return []
}
