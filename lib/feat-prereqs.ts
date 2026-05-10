import type { CharacterClass } from "@/lib/rules"
import type { TraitRef } from "@/lib/baseRefs"

type ClassSelection = { id: string; source: string; selectedEffectIndices?: number[] }

function classDisplayName(classId: string, rules: { classes?: Record<string, { name?: string }> }): string {
    return rules.classes?.[classId]?.name?.trim() || classId
}

/** Human-readable lines for feat prerequisites (for library / tooltips). */
export function formatFeatPrerequisiteLines(
    prereqs: Record<string, unknown> | null | undefined,
    rules: { classes?: Record<string, { name?: string; passives?: Record<string, { name?: string }>; actions?: Record<string, unknown> }>; actionCards?: Record<string, { name?: string }>; system?: { feats?: Record<string, { name?: string }> } }
): string[] {
    if (!prereqs || typeof prereqs !== "object") return []
    const lines: string[] = []
    const p = prereqs as Record<string, unknown>

    if (typeof p.level === "number" && Array.isArray(p.classes)) {
        const names = (p.classes as string[]).map((id) => classDisplayName(id, rules))
        lines.push(`At least level ${p.level} in: ${names.join(", ")}`)
    }

    if (Array.isArray(p.other) && p.other.length > 0) {
        const bits = (p.other as string[]).map((id) => formatTalentOrActionPrereq(id, rules))
        lines.push(`Requires: ${bits.join("; ")}`)
    }

    return lines
}

function formatTalentOrActionPrereq(id: string, rules: { classes?: Record<string, any>; actionCards?: Record<string, { name?: string }>; system?: { feats?: Record<string, { name?: string }> } }): string {
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
}

function talentOrActionKnown(id: string, ctx: CreatorFeatPrereqContext): boolean {
    if (ctx.classSelections.some((s) => s.id === id)) return true
    if (ctx.traits.some((t) => t.id === id)) return true
    return false
}

/** Feat picker: full prerequisite check including class level and `other` talent ids. */
export function evaluateFeatPrerequisitesForCreator(
    feat: { minLevel?: number; prereqs?: Record<string, unknown> },
    ctx: CreatorFeatPrereqContext,
    rules: { classes?: Record<string, { name?: string; passives?: Record<string, { name?: string }>; actions?: Record<string, unknown> }>; actionCards?: Record<string, { name?: string }>; system?: { feats?: Record<string, { name?: string }> } }
): { met: boolean; reason: string } {
    const minAdv = Number(feat.minLevel) || 1
    if (minAdv > ctx.adventurerLevel) {
        return { met: false, reason: `Requires Adventurer Level ${minAdv}` }
    }

    const prereqs = feat.prereqs
    if (prereqs && typeof prereqs === "object") {
        const p = prereqs as { classes?: string[]; level?: number; other?: string[] }
        if (Array.isArray(p.classes) && typeof p.level === "number") {
            const hasClassLevel = ctx.classes.some((c) => p.classes!.includes(c.id) && c.level >= p.level!)
            if (!hasClassLevel) {
                const names = p.classes!.map((cId) => classDisplayName(cId, rules))
                return {
                    met: false,
                    reason: `Requires level ${p.level} in ${names.join(" or ")}`,
                }
            }
        }
        if (Array.isArray(p.other) && p.other.length > 0) {
            for (const reqId of p.other) {
                if (!talentOrActionKnown(reqId, ctx)) {
                    return {
                        met: false,
                        reason: `Requires ${formatTalentOrActionPrereq(reqId, rules)}`,
                    }
                }
            }
        }
    }

    return { met: true, reason: "" }
}

/** Rich lines with satisfied flag for creator UI (optional). */
export function describeFeatPrerequisitesForCreator(
    feat: { minLevel?: number; prereqs?: Record<string, unknown> },
    ctx: CreatorFeatPrereqContext,
    rules: Parameters<typeof formatFeatPrerequisiteLines>[1]
): { text: string; met: boolean }[] {
    const out: { text: string; met: boolean }[] = []
    const minAdv = Number(feat.minLevel) || 1
    out.push({
        text: `Adventurer level ${minAdv}+`,
        met: ctx.adventurerLevel >= minAdv,
    })

    const prereqs = feat.prereqs
    if (prereqs && typeof prereqs === "object") {
        const p = prereqs as { classes?: string[]; level?: number; other?: string[] }
        if (Array.isArray(p.classes) && typeof p.level === "number") {
            const met = ctx.classes.some((c) => p.classes!.includes(c.id) && c.level >= p.level!)
            const names = p.classes!.map((cId) => classDisplayName(cId, rules))
            out.push({
                text: `Level ${p.level}+ in ${names.join(" or ")}`,
                met,
            })
        }
        if (Array.isArray(p.other) && p.other.length > 0) {
            for (const reqId of p.other) {
                out.push({
                    text: formatTalentOrActionPrereq(reqId, rules),
                    met: talentOrActionKnown(reqId, ctx),
                })
            }
        }
    }
    return out
}
