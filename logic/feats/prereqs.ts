/**
 * Feat prerequisites (`feat.prereqs` in rules.json):
 * - `feat.minLevel` — adventurer level gate (not in prereqs)
 * - Leaves: `{ classes: { "N": ["classId", ...] } }` (OR among ids in bucket), `{ other: ["id", ...] }` (AND)
 * - Groups: `{ all: [...] }` (every child), `{ any: [...] }` (at least one child)
 */
import type { CharacterClass } from "@/lib/rules"
import type { FeatLevelPick, TraitRef } from "@/lib/baseRefs"

type ClassSelection = { id: string; source: string; selectedEffectIndices?: number[] }

type FeatPrereqsRules = {
    classes?: Record<string, { name?: string; passives?: Record<string, { name?: string }>; actions?: Record<string, unknown> }>
    actionCards?: Record<string, { name?: string }>
    system?: { feats?: Record<string, { name?: string }> }
}

/** Map: required class level (string key) → class ids (any one at that level or higher). */
export type ClassLevelRequirementMap = Record<string, string[]>

export type FeatPrereqLeaf = {
    classes?: ClassLevelRequirementMap
    other?: string[]
}

export type FeatPrereqGroup = {
    all?: FeatPrereqNode[]
    any?: FeatPrereqNode[]
}

export type FeatPrereqNode = FeatPrereqLeaf & FeatPrereqGroup

function classDisplayName(classId: string, rules: { classes?: Record<string, { name?: string }> }): string {
    return rules.classes?.[classId]?.name?.trim() || classId
}

/**
 * Normalize `prereqs.classes` on a single node to level-keyed map.
 * Legacy: `classes: string[]` + `level: N` → `{ "N": classes }`.
 */
export function getClassLevelRequirements(
    prereqs: Record<string, unknown> | null | undefined
): ClassLevelRequirementMap {
    if (!prereqs || typeof prereqs !== "object") return {}
    const p = prereqs as Record<string, unknown>
    const raw = p.classes

    if (Array.isArray(raw) && raw.length > 0) {
        const lvl =
            typeof p.level === "number" && Number.isFinite(p.level) ? Math.floor(p.level) : 1
        return { [String(lvl)]: raw.map(String) }
    }

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const out: ClassLevelRequirementMap = {}
        for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
            if (!Array.isArray(val) || val.length === 0) continue
            out[key] = val.map(String)
        }
        return out
    }

    return {}
}

function isPrereqRecord(v: unknown): v is Record<string, unknown> {
    return v != null && typeof v === "object" && !Array.isArray(v)
}

/** Canonical nested tree (also normalizes legacy flat roots). */
export function normalizeFeatPrereqs(
    prereqs: Record<string, unknown> | null | undefined
): FeatPrereqNode | null {
    if (!isPrereqRecord(prereqs)) return null
    const p = prereqs

    const allRaw = p.all
    if (Array.isArray(allRaw) && allRaw.length > 0) {
        const all = allRaw
            .map((child) => (isPrereqRecord(child) ? normalizeFeatPrereqs(child) : null))
            .filter((n): n is FeatPrereqNode => n != null)
        return all.length > 0 ? { all } : null
    }

    const anyRaw = p.any
    if (Array.isArray(anyRaw) && anyRaw.length > 0) {
        const any = anyRaw
            .map((child) => (isPrereqRecord(child) ? normalizeFeatPrereqs(child) : null))
            .filter((n): n is FeatPrereqNode => n != null)
        return any.length > 0 ? { any } : null
    }

    const children: FeatPrereqNode[] = []
    const classReqs = getClassLevelRequirements(p)
    const entries = Object.entries(classReqs).filter(([, ids]) => ids?.length)

    if (entries.length > 1) {
        children.push({
            any: entries.map(([lvl, ids]) => ({ classes: { [lvl]: ids } })),
        })
    } else if (entries.length === 1) {
        children.push({ classes: classReqs })
    }

    if (Array.isArray(p.other) && p.other.length > 0) {
        children.push({ other: (p.other as unknown[]).map(String) })
    }

    if (children.length === 0) return null
    if (children.length === 1) return children[0]
    return { all: children }
}

/** JSON-safe canonical form for rules authoring / migration. */
export function toCanonicalPrereqs(
    prereqs: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined {
    const node = normalizeFeatPrereqs(prereqs)
    if (!node) return undefined
    return nodeToJson(node)
}

function nodeToJson(node: FeatPrereqNode): Record<string, unknown> {
    if (node.all?.length) {
        return { all: node.all.map(nodeToJson) }
    }
    if (node.any?.length) {
        return { any: node.any.map(nodeToJson) }
    }
    const out: Record<string, unknown> = {}
    if (node.classes && Object.keys(node.classes).length > 0) {
        out.classes = { ...node.classes }
    }
    if (node.other?.length) {
        out.other = [...node.other]
    }
    return out
}

function formatClassLevelRequirementLine(
    classLevel: number,
    classIds: string[],
    rules: FeatPrereqsRules
): string {
    const names = classIds.map((id) => classDisplayName(id, rules))
    return `Class level ${classLevel}+ in ${names.join(" or ")}`
}

function bucketRequirementMet(
    lvlStr: string,
    classIds: string[],
    characterClasses: CharacterClass[]
): boolean {
    const req = Math.max(1, Math.floor(Number(lvlStr) || 1))
    if (!classIds?.length) return false
    return characterClasses.some((c) => classIds.includes(c.id) && c.level >= req)
}

/** OR across map keys; OR within each bucket's class list. */
function classLevelRequirementsMet(
    requirements: ClassLevelRequirementMap,
    characterClasses: CharacterClass[]
): boolean {
    const entries = Object.entries(requirements).filter(([, ids]) => ids?.length)
    if (entries.length === 0) return true
    return entries.some(([lvlStr, classIds]) => bucketRequirementMet(lvlStr, classIds, characterClasses))
}

function formatClassRequirementsAlternatives(
    requirements: ClassLevelRequirementMap,
    rules: FeatPrereqsRules
): string {
    const parts = Object.entries(requirements)
        .filter(([, ids]) => ids?.length)
        .map(([lvlStr, classIds]) => {
            const req = Math.max(1, Math.floor(Number(lvlStr) || 1))
            return formatClassLevelRequirementLine(req, classIds, rules)
        })
    if (parts.length === 0) return ""
    if (parts.length === 1) return parts[0]
    return parts.join(", or ")
}

function formatClassLeaf(requirements: ClassLevelRequirementMap, rules: FeatPrereqsRules): string {
    return formatClassRequirementsAlternatives(requirements, rules)
}

function formatOtherLeaf(ids: string[], rules: FeatPrereqsRules): string {
    const bits = ids.map((id) => formatTalentOrActionPrereq(id, rules))
    return `Requires: ${bits.join("; ")}`
}

function formatPrereqNode(node: FeatPrereqNode, rules: FeatPrereqsRules): string[] {
    if (node.all?.length) {
        const childLines = node.all.flatMap((c) => formatPrereqNode(c, rules))
        if (childLines.length === 0) return []
        if (childLines.length === 1) return childLines
        return [`All of: ${childLines.join("; ")}`]
    }
    if (node.any?.length) {
        const childLines = node.any.flatMap((c) => formatPrereqNode(c, rules))
        if (childLines.length === 0) return []
        if (childLines.length === 1) return childLines
        return [`One of: ${childLines.join("; ")}`]
    }

    const lines: string[] = []
    if (node.classes && Object.keys(node.classes).length > 0) {
        const alt = formatClassLeaf(node.classes, rules)
        if (alt) lines.push(alt)
    }
    if (node.other?.length) {
        lines.push(formatOtherLeaf(node.other, rules))
    }
    return lines
}

/** Human-readable lines for feat prerequisites (for library / tooltips). */
export function formatFeatPrerequisiteLines(
    prereqs: Record<string, unknown> | null | undefined,
    rules: FeatPrereqsRules
): string[] {
    const tree = normalizeFeatPrereqs(prereqs)
    if (!tree) return []
    return formatPrereqNode(tree, rules)
}

function formatTalentOrActionPrereq(id: string, rules: FeatPrereqsRules): string {
    const featName = rules.system?.feats?.[id]?.name
    if (featName) return `${featName} (feat)`

    const ac = rules.actionCards?.[id]?.name
    if (ac) return `${ac} (action)`

    for (const [cid, cdata] of Object.entries(rules.classes || {})) {
        const cd = cdata as {
            passives?: Record<string, { name?: string }>
            actions?: Record<string, { name?: string; actionCard?: { name?: string } }>
        }
        if (cd.passives?.[id]?.name) {
            return `${cd.passives[id].name} (${classDisplayName(cid, rules)} passive)`
        }
        const act = cd.actions?.[id]
        const an = act?.name ?? act?.actionCard?.name
        if (an) {
            return `${an} (${classDisplayName(cid, rules)} action)`
        }
    }

    return id
}

export type CreatorFeatPrereqContext = {
    adventurerLevel: number
    classes: CharacterClass[]
    classSelections: ClassSelection[]
    traits: TraitRef[]
    /** Other feat slots already chosen in the creator (for `prereqs.other` feat ids). */
    selectedFeats?: Partial<Record<number, FeatLevelPick>>
}

function talentOrActionKnown(id: string, ctx: CreatorFeatPrereqContext): boolean {
    if (ctx.classSelections.some((s) => s.id === id)) return true
    if (ctx.traits.some((t) => t.id === id)) return true
    if (ctx.selectedFeats) {
        for (const pick of Object.values(ctx.selectedFeats)) {
            if (pick?.id === id) return true
        }
    }
    return false
}

function evaluateClassLeaf(
    requirements: ClassLevelRequirementMap,
    ctx: CreatorFeatPrereqContext,
    rules: FeatPrereqsRules
): { met: boolean; reason: string } {
    if (Object.keys(requirements).length === 0) return { met: true, reason: "" }
    if (classLevelRequirementsMet(requirements, ctx.classes)) {
        return { met: true, reason: "" }
    }
    const alt = formatClassRequirementsAlternatives(requirements, rules)
    return { met: false, reason: alt || "Class requirement not met" }
}

function evaluateOtherLeaf(
    ids: string[],
    ctx: CreatorFeatPrereqContext,
    rules: FeatPrereqsRules
): { met: boolean; reason: string } {
    for (const reqId of ids) {
        if (!talentOrActionKnown(reqId, ctx)) {
            return {
                met: false,
                reason: `Requires ${formatTalentOrActionPrereq(reqId, rules)}`,
            }
        }
    }
    return { met: true, reason: "" }
}

function evaluatePrereqNode(
    node: FeatPrereqNode,
    ctx: CreatorFeatPrereqContext,
    rules: FeatPrereqsRules
): { met: boolean; reason: string } {
    if (node.all?.length) {
        const reasons: string[] = []
        for (const child of node.all) {
            const r = evaluatePrereqNode(child, ctx, rules)
            if (!r.met) {
                if (r.reason) reasons.push(r.reason)
                return { met: false, reason: reasons.join(" and ") }
            }
        }
        return { met: true, reason: "" }
    }

    if (node.any?.length) {
        const failures: string[] = []
        for (const child of node.any) {
            const r = evaluatePrereqNode(child, ctx, rules)
            if (r.met) return { met: true, reason: "" }
            if (r.reason) failures.push(r.reason)
        }
        const unique = [...new Set(failures.filter(Boolean))]
        return {
            met: false,
            reason: unique.length > 0 ? unique.join(", or ") : "Requirement not met",
        }
    }

    if (node.classes && Object.keys(node.classes).length > 0) {
        const r = evaluateClassLeaf(node.classes, ctx, rules)
        if (!r.met) return r
    }

    if (node.other?.length) {
        return evaluateOtherLeaf(node.other, ctx, rules)
    }

    return { met: true, reason: "" }
}

/** Feat picker: full prerequisite check including class level and `other` talent ids. */
export function evaluateFeatPrerequisitesForCreator(
    feat: { minLevel?: number; prereqs?: Record<string, unknown> },
    ctx: CreatorFeatPrereqContext,
    rules: FeatPrereqsRules
): { met: boolean; reason: string } {
    const minAdv = Number(feat.minLevel) || 1
    if (minAdv > ctx.adventurerLevel) {
        return { met: false, reason: `Requires Adventurer Level ${minAdv}` }
    }

    const tree = normalizeFeatPrereqs(feat.prereqs)
    if (!tree) return { met: true, reason: "" }

    return evaluatePrereqNode(tree, ctx, rules)
}

function describePrereqNode(
    node: FeatPrereqNode,
    ctx: CreatorFeatPrereqContext,
    rules: FeatPrereqsRules
): { text: string; met: boolean }[] {
    if (node.all?.length) {
        const childLines = node.all.flatMap((c) => describePrereqNode(c, ctx, rules))
        if (childLines.length === 0) return []
        const met = childLines.every((l) => l.met)
        if (childLines.length === 1) return childLines
        return [
            {
                text: `All of: ${childLines.map((l) => l.text).join("; ")}`,
                met,
            },
        ]
    }

    if (node.any?.length) {
        const childLines = node.any.flatMap((c) => describePrereqNode(c, ctx, rules))
        if (childLines.length === 0) return []
        const met = childLines.some((l) => l.met)
        if (childLines.length === 1) return childLines
        return [
            {
                text: `One of: ${childLines.map((l) => l.text).join("; ")}`,
                met,
            },
        ]
    }

    const out: { text: string; met: boolean }[] = []

    if (node.classes && Object.keys(node.classes).length > 0) {
        const alt = formatClassLeaf(node.classes, rules)
        if (alt) {
            out.push({
                text: alt,
                met: classLevelRequirementsMet(node.classes, ctx.classes),
            })
        }
    }

    if (node.other?.length) {
        for (const reqId of node.other) {
            out.push({
                text: formatTalentOrActionPrereq(reqId, rules),
                met: talentOrActionKnown(reqId, ctx),
            })
        }
    }

    return out
}

/** Rich lines with satisfied flag for creator UI (optional). */
export function describeFeatPrerequisitesForCreator(
    feat: { minLevel?: number; prereqs?: Record<string, unknown> },
    ctx: CreatorFeatPrereqContext,
    rules: FeatPrereqsRules
): { text: string; met: boolean }[] {
    const out: { text: string; met: boolean }[] = []
    const minAdv = Number(feat.minLevel) || 1
    out.push({
        text: `Adventurer level ${minAdv}+`,
        met: ctx.adventurerLevel >= minAdv,
    })

    const tree = normalizeFeatPrereqs(feat.prereqs)
    if (tree) {
        out.push(...describePrereqNode(tree, ctx, rules))
    }

    return out
}
