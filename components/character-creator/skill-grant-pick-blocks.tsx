"use client"

import rulesData from "@/lib/rules.json"
import { cn } from "@/lib/utils"
import type { SkillChooserRequirement } from "@/lib/grant-skill-effects"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import type { PowerRoll } from "@/lib/rules"
import type { PowerRollAttributes } from "@/components/power-roll/power-roll-tier-row"

type CatalogRow = {
    name?: string
    description?: string
    categories?: string[]
    powerRoll?: PowerRoll
}

export function SkillGrantPickBlocks({
    title,
    description,
    requirements,
    picks,
    globalSkillCounts,
    attributes,
    onChange,
    density = "default",
    showOuterHeading = true,
}: {
    title?: string
    description?: string
    requirements: SkillChooserRequirement[]
    picks: Record<string, string[]>
    globalSkillCounts: Record<string, number>
    attributes: PowerRollAttributes
    onChange: (key: string, nextIds: string[]) => void
    /** `inline`: tighter spacing for embedding (e.g. under class focus feature). */
    density?: "default" | "inline"
    /** When false, omit title/description heading (caller provides chrome). */
    showOuterHeading?: boolean
}) {
    const catalog = rulesData.system.skills as Record<string, CatalogRow>
    if (requirements.length === 0) return null

    const isInline = density === "inline"

    return (
        <section className={cn(isInline ? "space-y-6" : "mt-12 space-y-10 border-t border-border pt-10")}>
            {showOuterHeading ? (
                <div className={isInline ? "space-y-1" : ""}>
                    <h2
                        className={cn(
                            "font-black uppercase italic tracking-tighter mb-2",
                            isInline ? "text-xl" : "text-3xl"
                        )}
                    >
                        {title?.trim() ? title : "Skill picks"}
                    </h2>
                    {description ? (
                        <p
                            className={cn(
                                "text-muted-foreground max-w-3xl leading-relaxed",
                                isInline ? "text-xs" : "text-sm"
                            )}
                        >
                            {description}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {requirements.map((req) => {
                const row = picks[req.key] ?? []
                const available = [...req.candidates]
                    .sort((a, b) => {
                        const na = catalog[a]?.name ?? a
                        const nb = catalog[b]?.name ?? b
                        return na.localeCompare(nb, undefined, { sensitivity: "base" }) || a.localeCompare(b)
                    })
                    .map((id) => [id, catalog[id]] as const)

                const toggle = (id: string) => {
                    const cur = [...(picks[req.key] ?? [])]
                    const pos = cur.indexOf(id)
                    if (pos >= 0) {
                        cur.splice(pos, 1)
                        onChange(req.key, cur)
                        return
                    }
                    if (req.distinctPicks && cur.includes(id)) return
                    if (cur.length >= req.pickCount) return
                    onChange(req.key, [...cur, id])
                }

                return (
                    <div key={req.key} className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h3 className={cn("font-bold text-foreground", isInline ? "text-lg" : "text-xl")}>
                                    {req.label}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {req.pickCount === 1
                                        ? "Choose one skill."
                                        : `Choose ${req.pickCount} different skills.`}
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "text-2xl font-black tabular-nums px-3 py-1 rounded-xl border shrink-0",
                                    row.length === req.pickCount
                                        ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                                        : "border-border bg-card text-foreground"
                                )}
                            >
                                {row.length}/{req.pickCount}
                            </div>
                        </div>

                        {row.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {row.map((id) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => toggle(id)}
                                        className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 transition-colors"
                                    >
                                        <span>{catalog[id]?.name ?? id}</span>
                                        <span className="opacity-60" aria-hidden>
                                            ✕
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                            {available.map(([id, skill]) => {
                                const chosen = row.includes(id)
                                const global = globalSkillCounts[id] ?? 0
                                const rowFull = row.length >= req.pickCount
                                const atExpertiseCap = global >= 2 && !chosen
                                const wouldExpertise =
                                    !chosen && global === 1 && row.length < req.pickCount && !rowFull
                                const canAdd =
                                    !!skill && !chosen && !rowFull && global < 2

                                const handleClick = () => {
                                    if (chosen || canAdd) toggle(id)
                                }

                                const disabledBtn = chosen ? false : !canAdd || atExpertiseCap

                                return (
                                    <div
                                        key={id}
                                        className={cn(
                                            "flex flex-col rounded-xl border-2 transition-all w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]",
                                            global >= 2
                                                ? "bg-purple-100 border-purple-600 text-foreground ring-1 ring-purple-500/30 dark:bg-purple-900/40 dark:border-purple-500 dark:ring-purple-500/50"
                                                : global === 1
                                                  ? "bg-muted border-purple-400/60 dark:border-purple-500/50"
                                                  : "bg-card border-border",
                                            disabledBtn && !chosen ? "opacity-50" : ""
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={handleClick}
                                            disabled={disabledBtn}
                                            className={cn(
                                                "flex flex-col items-start p-3 text-left w-full rounded-t-xl transition-all",
                                                !disabledBtn
                                                    ? "cursor-pointer hover:bg-foreground/[0.03]"
                                                    : "cursor-not-allowed"
                                            )}
                                        >
                                            <div className="flex justify-between items-start w-full mb-1">
                                                <span className="font-bold text-foreground">{skill?.name ?? id}</span>
                                                {chosen ? (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                                                        Selected
                                                    </span>
                                                ) : global > 0 ? (
                                                    <span
                                                        className={cn(
                                                            "text-xs font-bold px-2 py-0.5 rounded",
                                                            global >= 2
                                                                ? "bg-purple-700 text-white dark:bg-purple-500"
                                                                : "bg-muted text-purple-900 dark:text-purple-300"
                                                        )}
                                                    >
                                                        {global >= 2 ? "Expertise" : "Proficient"}
                                                    </span>
                                                ) : null}
                                            </div>
                                            {wouldExpertise ? (
                                                <span className="text-[10px] font-bold text-purple-800 mb-1 dark:text-purple-300">
                                                    Adding here grants Expertise (free reroll)
                                                </span>
                                            ) : null}
                                            {atExpertiseCap ? (
                                                <span className="text-[10px] font-bold text-red-800 mb-1 dark:text-red-300">
                                                    Already at Expertise from other picks
                                                </span>
                                            ) : null}
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-wide">
                                                {(skill?.categories ?? []).join(", ")}
                                            </span>
                                            <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                                                {skill?.description ?? ""}
                                            </p>
                                        </button>
                                        {skill?.powerRoll ? (
                                            <div className="px-2 pb-2 pt-0">
                                                <TraitPowerRollCollapsible
                                                    roll={skill.powerRoll}
                                                    attributes={attributes}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </section>
    )
}
