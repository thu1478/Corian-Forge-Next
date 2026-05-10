"use client"

import {useMemo, useState} from "react"
import {cn} from "@/lib/utils"
import {Brain, Briefcase, Filter, Globe2, GraduationCap, Heart, Languages, Plus, ScrollText, Sparkles, Trash2} from "lucide-react"
import {BondEmotionType, BondTarget, type PowerRoll, Skill, Trait} from "@/lib/rules";
import type {PowerRollAttributes} from "@/components/power-roll/power-roll-tier-row";
import {TraitPowerRollCollapsible} from "@/components/power-roll/trait-power-roll-collapsible";
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    bondLevelForTarget,
    canAppendEmotionToTarget,
    canReplaceEmotionInTarget,
    isEmotionTypeDisabledForTarget,
    newBondId,
    normalizeBondRules,
} from "@/lib/bonds"
import {getDeityPassiveEntries} from "@/lib/priest-deities"
import type {InventoryItem} from "@/lib/equipment-data"

interface ClassesPanelProps {
    classes: { id: string; level: number }[]; // Character's specific data
    rules: Record<string, any>;               // The entire classes section of rules.json
    /** Priest: show level 3 deity passive summary when level ≥ 3. */
    priestDeity?: string | null
}

export function ClassesPanel({classes, rules, priestDeity = null}: ClassesPanelProps) {

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5"/>
                Classes
                {/*<span className="text-sm text-muted-foreground font-normal">(Level {totalLevel})</span>*/}
            </h3>

            <div className="space-y-3">
                {classes.map((cls, i) => {
                    const priestPassives =
                        cls.id === "priest" && cls.level >= 3 && priestDeity
                            ? getDeityPassiveEntries({ classes: rules } as { classes?: Record<string, unknown> }, priestDeity)
                            : []

                    return (
                        <div
                            key={i}
                            className="p-3 rounded-lg bg-muted/20 border border-border space-y-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground text-base">
                    {rules?.[cls.id]?.name}
                  </span>
                            <span className="text-base font-bold text-primary shrink-0">
                    Lv. {cls.level}
                  </span>
                            </div>
                            {priestPassives.length > 0 ? (
                                <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                                    <span className="font-medium text-foreground/90">Deity passive</span>
                                    {priestPassives.map((p) => (
                                        <p key={p.slug} className="leading-snug">
                                            <span className="font-semibold text-foreground">{p.name}:</span>{" "}
                                            {p.description}
                                        </p>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}

interface TraitsPanelProps {
    traits: Trait[]
    /** Effective attributes (for potency DC math on trait power rolls). */
    attributes: {
        might: number
        dexterity: number
        reason: number
        willpower: number
        presence: number
    }
    /** For trait power rolls with +Wpn (same resolution as combat action cards). */
    activeWeapon?: InventoryItem | null
    offhandWeapon?: InventoryItem | null
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

export function TraitsPanel({traits, attributes, activeWeapon = null, offhandWeapon = null}: TraitsPanelProps) {
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

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
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
                        {trait.powerRoll && (
                            <TraitPowerRollCollapsible
                                roll={trait.powerRoll}
                                attributes={attributes}
                                currentWeapon={activeWeapon}
                                offhandWeapon={offhandWeapon}
                            />
                        )}
                    </div>
                ))}

                {filteredTraits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No traits found</p>
                )}
            </div>
        </div>
    )
}

type CultureBlock = Record<string, { name?: string; description?: string }>

interface CultureBackgroundOccupationPanelProps {
    theme: string
    cultureEnvironment: string | null
    cultureOrganization: string | null
    cultureUpbringing: string | null
    occupation: string | null
    /** `rules.system` — uses `culture` and `occupation`. */
    system: {
        culture?: {
            environment?: CultureBlock
            organization?: CultureBlock
            upbringing?: CultureBlock
        }
        occupation?: Record<string, { name?: string }>
    }
}

function cultureLabel(block: CultureBlock | undefined, id: string | null): string | null {
    if (!id || !block?.[id]) return null
    return block[id].name ?? id
}

export function CultureBackgroundOccupationPanel({
    theme,
    cultureEnvironment,
    cultureOrganization,
    cultureUpbringing,
    occupation,
    system,
}: CultureBackgroundOccupationPanelProps) {
    const culture = system.culture
    const envName = cultureLabel(culture?.environment, cultureEnvironment)
    const orgName = cultureLabel(culture?.organization, cultureOrganization)
    const upName = cultureLabel(culture?.upbringing, cultureUpbringing)
    const occName =
        occupation && system.occupation?.[occupation]
            ? system.occupation[occupation].name ?? occupation
            : null

    const row = (label: string, value: string | null) => (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 sm:w-28">
                {label}
            </span>
            <span className="text-sm text-foreground font-medium leading-snug">{value ?? "—"}</span>
        </div>
    )

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Globe2 className="w-5 h-5 shrink-0" aria-hidden />
                Culture & background
            </h3>
            <div className="space-y-5">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                        <Globe2 className="w-3.5 h-3.5" aria-hidden />
                        Culture
                    </div>
                    <div className="space-y-2 pl-0.5">
                        {row("Environment", envName)}
                        {row("Organization", orgName)}
                        {row("Upbringing", upName)}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                        <ScrollText className="w-3.5 h-3.5" aria-hidden />
                        Theme
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed pl-0.5">
                        {theme.trim() ? theme : "—"}
                    </p>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                        <Briefcase className="w-3.5 h-3.5" aria-hidden />
                        Occupation
                    </div>
                    <p className="text-sm text-foreground font-medium pl-0.5">{occName ?? "—"}</p>
                </div>
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

interface BondsPanelProps {
    bondTargets: BondTarget[]
    /** `rules.system` — expects `bonds` config from rules.json. */
    rulesSystem: unknown
    onBondTargetsChange: (bondTargets: BondTarget[]) => void
}

function BondLevelHeart({level}: {level: number}) {
    const capped = Math.min(3, level)
    return (
        <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center"
            title={`Bond level with this target: ${capped}`}
        >
            <Heart
                className="h-11 w-11 fill-rose-500/25 text-rose-500 dark:fill-rose-400/20 dark:text-rose-400"
                strokeWidth={1.5}
            />
            <span className="absolute text-sm font-bold tabular-nums text-foreground">{capped}</span>
        </div>
    )
}

export function BondsPanel({bondTargets, rulesSystem, onBondTargetsChange}: BondsPanelProps) {
    const rules = useMemo(() => normalizeBondRules(rulesSystem), [rulesSystem])

    const setTargets = (next: BondTarget[]) => {
        onBondTargetsChange(next.slice(0, rules.maxTargets))
    }

    const updateTargetName = (targetId: string, name: string) => {
        setTargets(bondTargets.map((t) => (t.id === targetId ? {...t, name} : t)))
    }

    const removeTarget = (targetId: string) => {
        setTargets(bondTargets.filter((t) => t.id !== targetId))
    }

    const addTarget = () => {
        if (bondTargets.length >= rules.maxTargets) return
        setTargets([
            ...bondTargets,
            {id: newBondId(), name: "", emotions: []},
        ])
    }

    const addEmotionToTarget = (targetId: string) => {
        const target = bondTargets.find((t) => t.id === targetId)
        if (!target) return
        if (target.emotions.length >= rules.maxEmotionsPerTarget) return
        const pickType = rules.allTypeIds.find((ty) =>
            canAppendEmotionToTarget(target.emotions, ty as BondEmotionType, rules)
        )
        if (!pickType) return
        setTargets(
            bondTargets.map((t) =>
                t.id === targetId
                    ? {
                          ...t,
                          emotions: [
                              ...t.emotions,
                              {id: newBondId(), type: pickType as BondEmotionType},
                          ],
                      }
                    : t
            )
        )
    }

    const updateEmotionType = (targetId: string, emotionId: string, type: BondEmotionType) => {
        const target = bondTargets.find((t) => t.id === targetId)
        if (!target) return
        const nextEmotions = target.emotions.map((e) => (e.id === emotionId ? {...e, type} : e))
        if (!canReplaceEmotionInTarget(target.emotions, emotionId, type, rules)) return
        setTargets(
            bondTargets.map((t) => (t.id === targetId ? {...t, emotions: nextEmotions} : t))
        )
    }

    const removeEmotion = (targetId: string, emotionId: string) => {
        setTargets(
            bondTargets.map((t) =>
                t.id === targetId
                    ? {...t, emotions: t.emotions.filter((e) => e.id !== emotionId)}
                    : t
            )
        )
    }

    const canAddEmotionTo = (t: BondTarget) => {
        if (t.emotions.length >= rules.maxEmotionsPerTarget) return false
        return rules.allTypeIds.some((ty) =>
            canAppendEmotionToTarget(t.emotions, ty as BondEmotionType, rules)
        )
    }

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Heart className="w-5 h-5"/>
                    Bonds
                    <span className="text-sm font-normal text-muted-foreground">
                        ({bondTargets.length}/{rules.maxTargets} targets)
                    </span>
                </h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={addTarget}
                    disabled={bondTargets.length >= rules.maxTargets}
                >
                    <Plus className="h-4 w-4"/>
                    Add target
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bondTargets.map((t) => (
                    <div
                        key={t.id}
                        className="rounded-lg border border-border/60 bg-muted/5 overflow-hidden"
                    >
                        <div className="flex flex-wrap items-start gap-3 border-b border-border/50 bg-muted/15 px-3 py-2.5">
                            <BondLevelHeart level={bondLevelForTarget(t)}/>
                            <div className="min-w-0 flex-1 space-y-2">
                                <Input
                                    className="w-full"
                                    placeholder="Target name (NPC, faction, place…)"
                                    value={t.name}
                                    onChange={(e) => updateTargetName(t.id, e.target.value)}
                                    aria-label="Bond target name"
                                />
                                <p className="text-xs leading-snug text-muted-foreground">
                                    Up to {rules.maxEmotionsPerTarget} emotion types per target; each type once;
                                    opposites from the same pair cannot both be chosen for this target.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeTarget(t.id)}
                                aria-label="Remove bond target"
                            >
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>

                        <div className="divide-y divide-border/40">
                            {t.emotions.map((em) => (
                                <div
                                    key={em.id}
                                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2"
                                >
                                    <Select
                                        value={em.type}
                                        onValueChange={(v) =>
                                            updateEmotionType(t.id, em.id, v as BondEmotionType)
                                        }
                                    >
                                        <SelectTrigger
                                            className="w-full sm:ml-auto sm:w-[12rem]"
                                            size="sm"
                                            aria-label="Bond emotion type"
                                        >
                                            <SelectValue placeholder="Emotion type"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rules.allTypeIds.map((tid) => {
                                                const disabled = isEmotionTypeDisabledForTarget(
                                                    tid,
                                                    em.id,
                                                    em.type,
                                                    t.emotions,
                                                    rules
                                                )
                                                return (
                                                    <SelectItem
                                                        key={tid}
                                                        value={tid}
                                                        disabled={disabled}
                                                    >
                                                        {rules.labels[tid] ?? tid}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 self-end text-muted-foreground hover:text-destructive sm:self-center"
                                        onClick={() => removeEmotion(t.id, em.id)}
                                        aria-label="Remove emotion"
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-border/50 p-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={() => addEmotionToTarget(t.id)}
                                disabled={!canAddEmotionTo(t)}
                            >
                                <Plus className="h-4 w-4"/>
                                Add emotion to this target
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {bondTargets.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground text-center py-2">
                    No bond targets yet. Add up to {rules.maxTargets} targets, then add emotions to each.
                </p>
            )}

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Inspiration & bond levels
                </h4>
                <ul className="list-disc space-y-1.5 pl-4 marker:text-muted-foreground/80">
                    <li>
                        <span className="font-medium text-foreground">Level 0</span> (no bond types with this
                        target) — narrative help when you spend Inspiration on the bond.
                    </li>
                    <li>
                        <span className="font-medium text-foreground">Level 1</span> (one bond type) — gain a
                        boon on a power roll.
                    </li>
                    <li>
                        <span className="font-medium text-foreground">Level 2</span> (two bond types) — this is
                        the limit for traits; temporarily increase an attribute modifier when applying potencies;
                        critical damage.
                    </li>
                    <li>
                        <span className="font-medium text-foreground">Level 3</span> (three bond types) — this
                        is the limit for bonds; reroll a power roll; add or erase up to two sections on a clock (DM
                        discretion).
                    </li>
                </ul>
            </div>
        </div>
    )
}
