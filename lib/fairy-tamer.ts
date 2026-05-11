import type { TraitRef } from "@/lib/baseRefs"
import { canAssignClassXpPicksSmallestFirst } from "@/lib/class-xp-display"
import rulesData from "@/lib/rules.json"

export const FAIRY_LESSER_TEMPLATE_IDS = [
    "fairySylph",
    "fairyWillOWisp",
    "fairyGnome",
    "fairyPixie",
    "fairySalamander",
    "fairyUndine",
    "fairySprite",
] as const

export const FAIRY_GREATER_TEMPLATE_IDS = [
    "fairyFlugel",
    "fairyUnicorn",
    "fairyGargoyle",
    "fairyDryad",
    "fairyCarbuncle",
    "fairySelkie",
    "fairyAlmiraj",
] as const

/** Element tags on bestiary fairies used for “one fairy per element” contracts and lesser→greater pairing. */
const FAIRY_ELEMENT_TAG_SET = new Set([
    "air",
    "volt",
    "water",
    "fire",
    "earth",
    "nature",
    "ice",
    "poison",
])

type CreatureTagsRule = { tags?: string[]; creatureTypes?: string[] }

function getFairyContractElementKeyFromCreature(c: CreatureTagsRule | undefined): string | undefined {
    if (!c) return undefined
    const fromTags = c.tags?.find((t) => FAIRY_ELEMENT_TAG_SET.has(t))
    if (fromTags) return fromTags
    if (c.creatureTypes?.includes("volt")) return "volt"
    return undefined
}

/** Element aspect for a fairy template (from bestiary tags / types). Used for upgrade path and duplicate rules. */
export function getFairyContractElementKey(templateId: string): string | undefined {
    const creatures = (rulesData as { bestiary?: { creatures?: Record<string, CreatureTagsRule> } }).bestiary?.creatures
    return getFairyContractElementKeyFromCreature(creatures?.[templateId])
}

const LEGACY_LESSER_TO_GREATER: Record<string, string> = {
    fairySylph: "fairyFlugel",
    fairyWillOWisp: "fairyUnicorn",
    fairyGnome: "fairyGargoyle",
    fairyPixie: "fairyDryad",
    fairySalamander: "fairyCarbuncle",
    fairyUndine: "fairySelkie",
    fairySprite: "fairyAlmiraj",
}

function buildLesserToGreaterFromElementTags(): Record<string, string> {
    const creatures = (rulesData as { bestiary?: { creatures?: Record<string, CreatureTagsRule> } }).bestiary?.creatures ?? {}
    const lessers = (FAIRY_LESSER_TEMPLATE_IDS as readonly string[]).map((id) => ({
        id,
        el: getFairyContractElementKeyFromCreature(creatures[id]),
    }))
    const greaters = (FAIRY_GREATER_TEMPLATE_IDS as readonly string[]).map((id) => ({
        id,
        el: getFairyContractElementKeyFromCreature(creatures[id]),
    }))
    const lesserToGreater: Record<string, string> = {}
    for (const l of lessers) {
        if (!l.el) continue
        const g = greaters.find((x) => x.el === l.el)
        if (g) lesserToGreater[l.id] = g.id
    }
    for (const [lesser, greater] of Object.entries(LEGACY_LESSER_TO_GREATER)) {
        if (!lesserToGreater[lesser]) lesserToGreater[lesser] = greater
    }
    return lesserToGreater
}

const COMPUTED_LESSER_TO_GREATER = buildLesserToGreaterFromElementTags()

export const FAIRY_LESSER_TO_GREATER: Record<string, string> = COMPUTED_LESSER_TO_GREATER

export const FAIRY_GREATER_TO_LESSER: Record<string, string> = Object.fromEntries(
    Object.entries(FAIRY_LESSER_TO_GREATER).map(([lesser, greater]) => [greater, lesser])
)

/** Each fairy template’s two contract spells (each costs one Fairy Tamer class XP pick, like other class actions). */
export const FAIRY_ACTIONS_BY_TEMPLATE: Record<string, readonly [string, string]> = {
    fairySylph: ["fairy/gentleCyclone", "fairy/sonicShield"],
    fairyWillOWisp: ["fairy/magnetRail", "fairy/shockingGrasp"],
    fairyGnome: ["fairy/earthPillar", "fairy/mudsport"],
    fairyPixie: ["fairy/hornetNest", "fairy/vineWall"],
    fairySalamander: ["fairy/fireWall", "fairy/trailingComet"],
    fairyUndine: ["fairy/clearSpring", "fairy/fog"],
    fairySprite: ["fairy/frostField", "fairy/snowflakes"],
    fairyFlugel: ["fairy/clearSkies", "fairy/vacuumSeal"],
    fairyUnicorn: ["fairy/thunderstorm", "fairy/magnetRise"],
    fairyGargoyle: ["fairy/shiftingEarth", "fairy/collapse"],
    fairyDryad: ["fairy/leafStorm", "fairy/gigaDrain"],
    fairyCarbuncle: ["fairy/lavaSpout", "fairy/overheat"],
    fairySelkie: ["fairy/blessedRain", "fairy/waterWhip"],
    fairyAlmiraj: ["fairy/hail", "fairy/snowCloak"],
}

const LESSER_SET = new Set<string>(FAIRY_LESSER_TEMPLATE_IDS as unknown as string[])

export type FairyTamerSlotSave = {
    templateId: string
    actionCardIds: string[]
}

export type FairyTamerContractsSave = {
    slot0: FairyTamerSlotSave | null
    slot1: FairyTamerSlotSave | null
    slot2: FairyTamerSlotSave | null
    slot3: FairyTamerSlotSave | null
    level5Mode: null | "fourthLesser" | "upgrade"
    upgradedSlotIndex: null | 0 | 1 | 2
}

export function emptyFairyTamerContracts(): FairyTamerContractsSave {
    return {
        slot0: null,
        slot1: null,
        slot2: null,
        slot3: null,
        level5Mode: null,
        upgradedSlotIndex: null,
    }
}

export function isFairyLesserTemplate(templateId: string): boolean {
    return LESSER_SET.has(templateId)
}

export function isFairyGreaterTemplate(templateId: string): boolean {
    return (FAIRY_GREATER_TEMPLATE_IDS as readonly string[]).includes(templateId)
}

export function getFairytamerLevel(classes: { id: string; level: number }[]): number {
    return classes.find((c) => c.id === "fairytamer")?.level ?? 0
}

export function characterHasFairyContractFromPicks(picks: { id: string; source: string }[]): boolean {
    return picks.some((p) => p.id === "fairyContract" && p.source === "fairytamer")
}

export function characterHasFairyContract(traits: TraitRef[]): boolean {
    return traits.some((t) => t.id === "fairyContract" && String(t.source).toLowerCase() === "class")
}

export function getFairySlot(
    c: FairyTamerContractsSave,
    index: 0 | 1 | 2 | 3
): FairyTamerSlotSave | null {
    if (index === 0) return c.slot0
    if (index === 1) return c.slot1
    if (index === 2) return c.slot2
    return c.slot3
}

export function setFairySlotAt(
    c: FairyTamerContractsSave,
    index: 0 | 1 | 2 | 3,
    slot: FairyTamerSlotSave | null
): FairyTamerContractsSave {
    const next = { ...c }
    if (index === 0) next.slot0 = slot
    else if (index === 1) next.slot1 = slot
    else if (index === 2) next.slot2 = slot
    else next.slot3 = slot
    return next
}

/** Element keys already taken by another contract slot (excluding `exceptSlotIndex` if set). */
export function getOccupiedFairyContractElementKeys(
    contracts: FairyTamerContractsSave,
    exceptSlotIndex?: number
): Set<string> {
    const used = new Set<string>()
    for (const i of [0, 1, 2, 3] as const) {
        if (exceptSlotIndex !== undefined && i === exceptSlotIndex) continue
        const slot = getFairySlot(contracts, i)
        if (!slot?.templateId) continue
        const el = getFairyContractElementKey(slot.templateId)
        if (el) used.add(el)
    }
    return used
}

/**
 * True if this lesser can be newly chosen at `slotIndex` without duplicating an element
 * already covered by another slot (greater or lesser). Current slot’s old choice is ignored.
 */
export function isLesserFairyTemplateAllowedAtSlot(
    contracts: FairyTamerContractsSave,
    slotIndex: 0 | 1 | 2 | 3,
    lesserTemplateId: string
): boolean {
    if (!LESSER_SET.has(lesserTemplateId)) return false
    const el = getFairyContractElementKey(lesserTemplateId)
    if (!el) return true
    const occupied = getOccupiedFairyContractElementKeys(contracts, slotIndex)
    return !occupied.has(el)
}

/**
 * Spell ids valid for this contract slot: current template pair, plus — when this slot is a level-5-upgraded greater —
 * the paired lesser fairy’s spells (kept from before upgrade).
 */
export function getAllowedFairySpellIdsForSlot(
    contracts: FairyTamerContractsSave,
    slot: 0 | 1 | 2 | 3
): Set<string> | null {
    const s = getFairySlot(contracts, slot)
    if (!s?.templateId) return null
    const pair = FAIRY_ACTIONS_BY_TEMPLATE[s.templateId]
    if (!pair) return null
    const ids = new Set<string>([pair[0], pair[1]])
    const resolved = resolveUpgradedFairySlotIndex(contracts)
    const mergeUpgrade =
        contracts.level5Mode === "upgrade" &&
        resolved === slot &&
        isFairyGreaterTemplate(s.templateId)
    if (mergeUpgrade) {
        const lesser = FAIRY_GREATER_TO_LESSER[s.templateId]
        const lp = lesser ? FAIRY_ACTIONS_BY_TEMPLATE[lesser] : undefined
        if (lp) {
            ids.add(lp[0])
            ids.add(lp[1])
        }
        // #region agent log
        fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d70b49" },
            body: JSON.stringify({
                sessionId: "d70b49",
                location: "fairy-tamer.ts:getAllowedFairySpellIdsForSlot",
                message: "upgrade slot: merged lesser+greater spell ids",
                data: {
                    slot,
                    templateId: s.templateId,
                    resolved,
                    lesserTid: lesser ?? null,
                    mergedLesserPair: Boolean(lp),
                },
                timestamp: Date.now(),
                hypothesisId: "H1",
            }),
        }).catch(() => {})
        // #endregion
    } else if (contracts.level5Mode === "upgrade" && isFairyGreaterTemplate(s.templateId)) {
        // #region agent log
        fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d70b49" },
            body: JSON.stringify({
                sessionId: "d70b49",
                location: "fairy-tamer.ts:getAllowedFairySpellIdsForSlot",
                message: "greater template but merge NOT applied (lesser spells may strip)",
                data: {
                    slot,
                    templateId: s.templateId,
                    resolved,
                    upgradedSlotIndex: contracts.upgradedSlotIndex,
                },
                timestamp: Date.now(),
                hypothesisId: "H2",
            }),
        }).catch(() => {})
        // #endregion
    }
    return ids
}

/** Spell id is allowed for this slot (see {@link getAllowedFairySpellIdsForSlot}). */
export function isFairySpellAllowedForContractSlot(
    contracts: FairyTamerContractsSave,
    slot: 0 | 1 | 2 | 3,
    cardId: string
): boolean {
    const allowed = getAllowedFairySpellIdsForSlot(contracts, slot)
    return Boolean(allowed?.has(cardId))
}

function slotPicksComplete(
    slot: FairyTamerSlotSave | null,
    contracts?: FairyTamerContractsSave,
    slotIdx?: 0 | 1 | 2 | 3
): boolean {
    if (!slot?.templateId) return false
    const pair = FAIRY_ACTIONS_BY_TEMPLATE[slot.templateId]
    if (!pair) return false
    const have = new Set(slot.actionCardIds.map((x) => String(x).trim()).filter(Boolean))
    if (
        contracts != null &&
        slotIdx != null &&
        contracts.level5Mode === "upgrade" &&
        resolveUpgradedFairySlotIndex(contracts) === slotIdx &&
        isFairyGreaterTemplate(slot.templateId)
    ) {
        return have.has(pair[0]) && have.has(pair[1])
    }
    return have.size === 2 && have.has(pair[0]) && have.has(pair[1])
}

export function isFairyTamerPicksComplete(
    contracts: FairyTamerContractsSave | undefined,
    ftLevel: number,
    hasContract: boolean
): boolean {
    if (!hasContract || ftLevel < 1) return true
    const c = contracts ?? emptyFairyTamerContracts()
    if (!slotPicksComplete(c.slot0, c, 0)) return false
    if (ftLevel >= 2 && !slotPicksComplete(c.slot1, c, 1)) return false
    if (ftLevel >= 3 && !slotPicksComplete(c.slot2, c, 2)) return false
    if (ftLevel < 5) return true
    if (!c.level5Mode) return false
    if (c.level5Mode === "fourthLesser") return slotPicksComplete(c.slot3, c, 3)
    const idx = resolveUpgradedFairySlotIndex(c)
    if (idx == null) return false
    const s = getFairySlot(c, idx)
    if (!slotPicksComplete(s, c, idx)) return false
    return Boolean(s && isFairyGreaterTemplate(s.templateId))
}

/** Drop contracts that no longer match Fairy Tamer level or passive. */
export function sanitizeFairyTamerContracts(
    raw: FairyTamerContractsSave | undefined,
    ftLevel: number,
    hasContract: boolean
): FairyTamerContractsSave {
    if (!hasContract || ftLevel < 1) return emptyFairyTamerContracts()
    const b = raw ? { ...raw } : emptyFairyTamerContracts()
    if (ftLevel < 2) b.slot1 = null
    if (ftLevel < 3) b.slot2 = null
    if (ftLevel < 5) {
        b.slot3 = null
        b.level5Mode = null
        b.upgradedSlotIndex = null
    }
    if (b.level5Mode === "upgrade") b.slot3 = null
    if (b.level5Mode === "fourthLesser") b.upgradedSlotIndex = null
    return repairUpgradedSlotIndexIfNeeded(b)
}

/**
 * Which slot (0–2) is the level-5 “upgrade” target: explicit index, or infer when exactly one slot has a greater template.
 * If `upgradedSlotIndex` is missing after sync/import, UI would treat the row as a lesser Select with value=fairyFlugel (invalid) and hide upgrade UX.
 */
export function resolveUpgradedFairySlotIndex(c: FairyTamerContractsSave): 0 | 1 | 2 | null {
    if (c.level5Mode !== "upgrade") return null
    if (c.upgradedSlotIndex != null) return c.upgradedSlotIndex
    const greaterSlots = ([0, 1, 2] as const).filter((i) => {
        const s = getFairySlot(c, i)
        return Boolean(s?.templateId && isFairyGreaterTemplate(s.templateId))
    })
    return greaterSlots.length === 1 ? greaterSlots[0]! : null
}

export function repairUpgradedSlotIndexIfNeeded(c: FairyTamerContractsSave): FairyTamerContractsSave {
    if (c.level5Mode !== "upgrade") return c
    const r = resolveUpgradedFairySlotIndex(c)
    if (r == null) return c
    if (c.upgradedSlotIndex === r) return c
    return { ...c, upgradedSlotIndex: r }
}

/**
 * Min class level (packet tier) for a fairy spell pick in this contract slot.
 * From class level 5 onward you gain **one** packet per level (tier 5, 6, …); levels 1–4 grant two packets each.
 * Fourth lesser (slot 3) splits its two spells across tiers 4 and 5 by pair order (same capstone pattern as 1–4).
 * Greater spells from a level-5 **upgrade** are unlocked at 5+ only: **both** use tier **5** so they cannot spend a
 * leftover tier-4 packet. Only one fits at FT 5; take the second at FT 6+.
 */
export function getFairySpellPickMinLevel(
    slot: 0 | 1 | 2 | 3,
    c: FairyTamerContractsSave,
    spellCardId?: string
): number {
    const tierFromPair = (templateId: string | undefined): number | undefined => {
        if (!templateId || !spellCardId) return undefined
        const pair = FAIRY_ACTIONS_BY_TEMPLATE[templateId]
        if (!pair) return undefined
        if (spellCardId === pair[0]) return 4
        if (spellCardId === pair[1]) return 5
        return undefined
    }

    if (slot === 3) {
        const s = getFairySlot(c, 3)
        const t = tierFromPair(s?.templateId)
        if (t != null) return t
        return 5
    }

    const upIdx = resolveUpgradedFairySlotIndex(c)
    if (upIdx === slot) {
        const s = getFairySlot(c, slot)
        if (s?.templateId && isFairyGreaterTemplate(s.templateId) && spellCardId) {
            const lesser = FAIRY_GREATER_TO_LESSER[s.templateId]
            const lPair = lesser ? FAIRY_ACTIONS_BY_TEMPLATE[lesser] : undefined
            if (lPair && (spellCardId === lPair[0] || spellCardId === lPair[1])) {
                return slot === 0 ? 1 : slot === 1 ? 2 : 3
            }
            const gPair = FAIRY_ACTIONS_BY_TEMPLATE[s.templateId]
            if (gPair && (spellCardId === gPair[0] || spellCardId === gPair[1])) {
                // #region agent log
                fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d70b49" },
                    body: JSON.stringify({
                        sessionId: "d70b49",
                        location: "fairy-tamer.ts:getFairySpellPickMinLevel",
                        message: "greater-upgrade spell min packet tier (both use 5)",
                        data: { slot, spellCardId, templateId: s.templateId, minLevel: 5 },
                        timestamp: Date.now(),
                        hypothesisId: "H_GR",
                    }),
                }).catch(() => {})
                // #endregion
                return 5
            }
            return 5
        }
    }

    return slot === 0 ? 1 : slot === 1 ? 2 : 3
}

export type FairyClassSpellPick = { id: string; source: string; fairySpellSlot?: 0 | 1 | 2 | 3 }

/** Copy spell ids from class selections into contract slots (after XP picks). */
export function syncFairyTamerContractSpellsFromPicks(
    contracts: FairyTamerContractsSave,
    picks: FairyClassSpellPick[]
): FairyTamerContractsSave {
    let next = { ...contracts }
    for (const slotIdx of [0, 1, 2, 3] as const) {
        const slot = getFairySlot(next, slotIdx)
        if (!slot?.templateId) continue
        const allowed = getAllowedFairySpellIdsForSlot(next, slotIdx)
        if (!allowed) continue
        const ids = picks
            .filter(
                (p) =>
                    p.source === "fairytamer" &&
                    p.fairySpellSlot === slotIdx &&
                    allowed.has(p.id)
            )
            .map((p) => p.id)
        next = setFairySlotAt(next, slotIdx, { templateId: slot.templateId, actionCardIds: [...new Set(ids)] })
    }
    return repairUpgradedSlotIndexIfNeeded(next)
}

/** Remove fairy spell picks that no longer match the fairy template for that slot. */
export function stripInvalidFairySpellPicks<T extends FairyClassSpellPick>(picks: T[], contracts: FairyTamerContractsSave): T[] {
    return picks.filter((p) => {
        if (p.source !== "fairytamer" || p.fairySpellSlot == null) return true
        const allowed = getAllowedFairySpellIdsForSlot(contracts, p.fairySpellSlot)
        const ok = Boolean(allowed?.has(p.id))
        if (!ok) {
            // #region agent log
            fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d70b49" },
                body: JSON.stringify({
                    sessionId: "d70b49",
                    location: "fairy-tamer.ts:stripInvalidFairySpellPicks",
                    message: "fairy spell class XP pick removed (not in allowed set)",
                    data: {
                        pickId: p.id,
                        fairySpellSlot: p.fairySpellSlot,
                        slotTemplate: getFairySlot(contracts, p.fairySpellSlot)?.templateId ?? null,
                        allowedIds: allowed ? [...allowed] : null,
                        resolvedUpgrade: resolveUpgradedFairySlotIndex(contracts),
                        level5Mode: contracts.level5Mode,
                    },
                    timestamp: Date.now(),
                    hypothesisId: "H3",
                }),
            }).catch(() => {})
            // #endregion
        }
        return ok
    })
}

/**
 * Same packet budget check as other Fairy Tamer talents (levels 1–4: 2 picks/level, then 1/level).
 */
export function canAddFairytamerTalentPick(
    fairytamerClassLevel: number,
    currentFairytamerPicks: FairyClassSpellPick[],
    newPickLevel: number,
    getPickLevel: (p: FairyClassSpellPick) => number,
    getMaxClassXP: (level: number) => number
): boolean {
    if (fairytamerClassLevel < 1) return false
    const classSelections = currentFairytamerPicks.filter((o) => o.source === "fairytamer")
    if (classSelections.length >= getMaxClassXP(fairytamerClassLevel)) return false
    const merged = [...classSelections.map((s) => getPickLevel(s)), newPickLevel]
    return canAssignClassXpPicksSmallestFirst(merged, fairytamerClassLevel)
}

/** When level 5 mode is upgrade, rewrite the chosen slot to the greater template (spells must be bought again). */
export function applyFairyUpgradeToSlot(
    c: FairyTamerContractsSave,
    slotIndex: 0 | 1 | 2
): FairyTamerContractsSave {
    const cur = getFairySlot(c, slotIndex)
    if (!cur?.templateId) return { ...c, upgradedSlotIndex: slotIndex, level5Mode: "upgrade" }
    const greater = FAIRY_LESSER_TO_GREATER[cur.templateId]
    if (!greater) return { ...c, upgradedSlotIndex: slotIndex, level5Mode: "upgrade" }
    const lPair = FAIRY_ACTIONS_BY_TEMPLATE[cur.templateId]
    const keepIds =
        lPair && Array.isArray(cur.actionCardIds)
            ? cur.actionCardIds.filter((raw) => {
                  const id = String(raw ?? "").trim()
                  return id === lPair[0] || id === lPair[1]
              })
            : []
    const nextSlot: FairyTamerSlotSave = {
        templateId: greater,
        actionCardIds: keepIds,
    }
    // #region agent log
    fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d70b49" },
        body: JSON.stringify({
            sessionId: "d70b49",
            location: "fairy-tamer.ts:applyFairyUpgradeToSlot",
            message: "applied lesser→greater upgrade on contract slot",
            data: {
                slotIndex,
                fromTemplate: cur.templateId,
                greaterTemplate: greater,
                priorActionCardIds: cur.actionCardIds,
                keepIds,
            },
            timestamp: Date.now(),
            hypothesisId: "H4",
        }),
    }).catch(() => {})
    // #endregion
    return {
        ...setFairySlotAt(c, slotIndex, nextSlot),
        level5Mode: "upgrade",
        upgradedSlotIndex: slotIndex,
        slot3: null,
    }
}

/** Switching upgrade target reverts the previously upgraded slot to its lesser form. */
export function changeFairyUpgradeTargetSlot(
    c: FairyTamerContractsSave,
    newIdx: 0 | 1 | 2
): FairyTamerContractsSave {
    let next = { ...c }
    const prevIdx = c.upgradedSlotIndex
    if (prevIdx != null && prevIdx !== newIdx) {
        const s = getFairySlot(c, prevIdx)
        if (s && isFairyGreaterTemplate(s.templateId)) {
            const lesser = FAIRY_GREATER_TO_LESSER[s.templateId]
            if (lesser) next = setFairySlotAt(next, prevIdx, { templateId: lesser, actionCardIds: [] })
        }
    }
    return applyFairyUpgradeToSlot(next, newIdx)
}
