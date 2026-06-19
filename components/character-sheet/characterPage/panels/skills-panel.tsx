"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Brain } from "lucide-react"
import type { PowerRoll, Skill } from "@/lib/rules"
import type { PowerRollAttributes } from "@/components/power-roll/power-roll-tier-row"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type SkillCatalogEntry = {
    name?: string
    description?: string
    categories?: string[]
    powerRoll?: PowerRoll
}

const UNCATEGORIZED = "__uncategorized__"

function findRuleForSkill(
    catalog: Record<string, SkillCatalogEntry>,
    skillName: string
): SkillCatalogEntry | null {
    const target = skillName.trim().toLowerCase()
    for (const def of Object.values(catalog)) {
        if (String(def.name ?? "").trim().toLowerCase() === target) {
            return def
        }
    }
    return null
}

function categoryHeadingLabel(categoryId: string): string {
    if (categoryId === UNCATEGORIZED) return "Other"
    return categoryId
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
}

interface SkillsPanelProps {
    skills: Skill[]
    /** `rules.system.skills` — names, descriptions, categories, optional power rolls. */
    skillCatalog: Record<string, SkillCatalogEntry>
    attributes: PowerRollAttributes
}

export function SkillsPanel({ skills, skillCatalog, attributes }: SkillsPanelProps) {
    const categoryOrder = useMemo(() => {
        const ids = new Set<string>()
        for (const def of Object.values(skillCatalog)) {
            for (const c of def.categories ?? []) {
                if (c) ids.add(c)
            }
        }
        return [...ids].sort((a, b) => a.localeCompare(b))
    }, [skillCatalog])

    const sections = useMemo(() => {
        const keys = [...categoryOrder, UNCATEGORIZED]
        return keys.map((catId) => {
            const inSection = skills.filter((s) => {
                const rule = findRuleForSkill(skillCatalog, s.name)
                if (!rule) {
                    return catId === UNCATEGORIZED
                }
                const cats = rule.categories ?? []
                if (cats.length === 0) {
                    return catId === UNCATEGORIZED
                }
                if (catId === UNCATEGORIZED) {
                    return false
                }
                return cats.includes(catId)
            })
            return {
                catId,
                label: categoryHeadingLabel(catId),
                list: inSection,
            }
        })
    }, [skills, skillCatalog, categoryOrder])

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5"/>
                Skills
            </h3>

            <div className="space-y-5">
                {sections.map(({ catId, label, list }) => (
                    <div key={catId} className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                            {label}
                        </h4>
                        {list.length === 0 ? (
                            <p className="text-xs text-muted-foreground/90 italic py-0.5 pl-0.5">—</p>
                        ) : (
                            <ul className="space-y-1.5 list-none p-0 m-0">
                                {list.map((skill, i) => {
                                    const rule = findRuleForSkill(skillCatalog, skill.name)
                                    const desc = (rule?.description ?? "").trim()
                                    return (
                                        <li
                                            key={`${catId}-${skill.name}-${i}`}
                                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border/40 bg-muted/5"
                                        >
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "text-sm text-foreground font-medium truncate text-left min-w-0",
                                                            "rounded px-0.5 -mx-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        )}
                                                    >
                                                        {skill.name}
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    align="start"
                                                    side="top"
                                                    sideOffset={6}
                                                    className="w-[min(92vw,28rem)] max-w-none border-border p-4 text-left shadow-md"
                                                >
                                                    <div className="space-y-2">
                                                        <p className="text-sm font-semibold leading-tight text-foreground">
                                                            {skill.name}
                                                        </p>
                                                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                                            {desc ||
                                                                "No description for this skill in the rules catalog."}
                                                        </p>
                                                        {rule?.powerRoll && (
                                                            <TraitPowerRollCollapsible
                                                                roll={rule.powerRoll}
                                                                attributes={attributes}
                                                            />
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        aria-label={
                                                            skill.hasExpertise
                                                                ? "Expertise — tap for details"
                                                                : "No expertise — tap for details"
                                                        }
                                                        className={cn(
                                                            "h-2.5 w-2.5 rounded-full border-2 shrink-0 transition-colors",
                                                            "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                            skill.hasExpertise
                                                                ? "border-primary bg-primary"
                                                                : "border-muted-foreground/50 bg-transparent"
                                                        )}
                                                    />
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    align="end"
                                                    side="top"
                                                    sideOffset={6}
                                                    className="w-[min(92vw,20rem)] border-border p-3 text-left shadow-md"
                                                >
                                                    <p className="text-sm font-semibold text-foreground">Expertise</p>
                                                    <p className="text-sm leading-relaxed text-muted-foreground mt-1">
                                                        {skill.hasExpertise
                                                            ? "This skill is marked with expertise on your sheet (apply any expertise rules from your table or class features)."
                                                            : "This skill is not marked with expertise."}
                                                    </p>
                                                </PopoverContent>
                                            </Popover>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
