"use client"

import {useMemo, useState} from "react"
import {cn} from "@/lib/utils"
import {Brain, Filter, GraduationCap, Heart, Languages, Sparkles} from "lucide-react"
import {BondTarget, Skill, Trait} from "@/lib/rules";

interface ClassesPanelProps {
    classes: { id: string; level: number }[]; // Character's specific data
    rules: Record<string, any>;               // The entire classes section of rules.json
}

export function ClassesPanel({classes, rules}: ClassesPanelProps) {

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5"/>
                Classes
                {/*<span className="text-sm text-muted-foreground font-normal">(Level {totalLevel})</span>*/}
            </h3>

            <div className="space-y-3">
                {classes.map((cls, i) => {

                    return (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border"
                        >
                  <span className="font-semibold text-foreground text-base">
                    {rules?.[cls.id]?.name}
                  </span>
                            <span className="text-base font-bold text-primary">
                    Lv. {cls.level}
                  </span>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

interface TraitsPanelProps {
    traits: Trait[]
}

type TraitSource = "all" | "racial" | "feat" | "class" | "background" | "other"

const sourceColors: Record<string, string> = {
    racial: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50",
    feat: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
    class: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50",
    background: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50",
    other: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/50"
}

const sourceFilterColors: Record<string, string> = {
    all: "bg-primary text-primary-foreground",
    racial: "bg-emerald-600 text-white",
    feat: "bg-amber-600 text-white",
    class: "bg-blue-600 text-white",
    background: "bg-violet-600 text-white",
    other: "bg-slate-600 text-white"
}

export function TraitsPanel({traits}: TraitsPanelProps) {
    const [filter, setFilter] = useState<TraitSource>("all")

    // Get unique sources from traits
    const availableSources = ["all", ...Array.from(new Set(traits.map(t => t.source)))] as TraitSource[]

    const filteredTraits = filter === "all"
        ? traits
        : traits.filter(t => t.source === filter)

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5"/>
                Traits
                <span className="text-sm text-muted-foreground font-normal">({traits.length})</span>
            </h3>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0"/>
                {availableSources.map(source => (
                    <button
                        key={source}
                        onClick={() => setFilter(source)}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                            filter === source
                                ? sourceFilterColors[source]
                                : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                    >
                        {source}
                    </button>
                ))}
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {filteredTraits.map((trait) => (
                    <div
                        key={trait.uid}
                        className="p-3 rounded-lg bg-muted/10 border border-border/50"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-foreground text-base">{trait.name}</span>
                            <span
                                className={cn("text-xs px-2 py-0.5 rounded border uppercase font-medium", sourceColors[trait.source])}>
                {trait.source}
              </span>
                        </div>
                        <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">{trait.description}</p>
                    </div>
                ))}

                {filteredTraits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No traits found</p>
                )}
            </div>
        </div>
    )
}

interface LanguagesPanelProps {
    languages: string[]
}

export function LanguagesPanel({languages}: LanguagesPanelProps) {
    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5"/>
                Languages
            </h3>

            <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                    <span
                        key={lang}
                        className="px-4 py-2 text-base rounded-full bg-muted/30 border border-border text-foreground font-medium"
                    >
            {lang}
          </span>
                ))}
            </div>
        </div>
    )
}

type SkillCatalogEntry = {
    name?: string
    description?: string
    categories?: string[]
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
    /** `rules.system.skills` — names, descriptions, categories. */
    skillCatalog: Record<string, SkillCatalogEntry>
}

export function SkillsPanel({ skills, skillCatalog }: SkillsPanelProps) {
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
                                            <span
                                                className="text-sm text-foreground font-medium truncate cursor-default"
                                                title={desc || undefined}
                                            >
                                                {skill.name}
                                            </span>
                                            <span
                                                className={cn(
                                                    "h-2.5 w-2.5 rounded-full border-2 shrink-0 transition-colors",
                                                    skill.hasExpertise
                                                        ? "border-primary bg-primary"
                                                        : "border-muted-foreground/50 bg-transparent"
                                                )}
                                                title={skill.hasExpertise ? "Expertise" : "No expertise"}
                                            />
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

interface BondsPanelProps {
    bondTargets: BondTarget[]
}

const bondTypeColors: Record<string, string> = {
    admiration: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700/50",
    inferiority: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/50",
    loyalty: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50",
    mistrust: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
    affection: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700/50",
    hatred: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50"
}

/** Unused duplicate — use `characterPage/tracking-panel` BondsPanel. */
export function BondsPanel({bondTargets}: BondsPanelProps) {
    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5"/>
                Bonds
            </h3>

            <div className="space-y-3">
                {bondTargets.map((t) => (
                    <div key={t.id} className="space-y-2 rounded-lg bg-muted/10 border border-border/50 p-3">
                        <span className="text-base text-foreground font-medium">{t.name || "—"}</span>
                        <div className="flex flex-wrap gap-2">
                            {t.emotions.map((e) => (
                                <span
                                    key={e.id}
                                    className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border uppercase font-semibold",
                                        bondTypeColors[e.type]
                                    )}
                                >
                                    {e.type}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
