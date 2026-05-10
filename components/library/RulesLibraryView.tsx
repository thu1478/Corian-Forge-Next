"use client"

import { useCallback, useMemo, useState, memo } from "react"
import rulesData from "@/lib/rules.json"
import type { ActionCard, PowerRoll } from "@/lib/rules"
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import { unwrapEmbeddedActionCard } from "@/lib/embedded-action-card"
import { hydrateActionCardById } from "@/lib/action-hydrate"
import type { InventoryItem } from "@/lib/equipment-data"
import { formatModifier, getAttributeModifier } from "@/lib/character-data"
import {
    type CreatureDefinition,
    getCreatureTemplates,
    resolveCreatureTraitEntries,
} from "@/lib/creature-roster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { formatFeatPrerequisiteLines } from "@/lib/feat-prereqs"
import { formatTraitEffectChoiceLabel } from "@/lib/trait-selection"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Award,
    BookOpen,
    ChevronDown,
    ChevronsUp,
    GraduationCap,
    Package,
    PawPrint,
    PanelLeftClose,
    PanelLeftOpen,
    Swords,
} from "lucide-react"

const RULES = rulesData as Record<string, any>

const DEMO_ATTRIBUTES = {
    might: 10,
    dexterity: 10,
    reason: 10,
    willpower: 10,
    presence: 10,
}

const PREVIEW_WEAPON_OPTIONS: { value: string; label: string }[] = [
    { value: "__none__", label: "No weapon" },
    { value: "wp_fist", label: "Fist (brawling)" },
    { value: "wp_dagger", label: "Dagger (melee)" },
    { value: "wp_hand_crossbow", label: "Hand crossbow (ranged)" },
]

function catalogToPreviewWeapon(catalogId: string): InventoryItem | null {
    if (!catalogId || catalogId === "__none__") return null
    const def = RULES.items?.[catalogId]
    if (!def || def.type !== "weapon") return null
    return {
        ...def,
        id: catalogId,
        uid: `library-preview-${catalogId}`,
        name: def.name ?? catalogId,
        quantity: def.quantity ?? 1,
        description: def.description ?? "",
        tags: Array.isArray(def.tags) ? def.tags : [],
        type: "weapon",
        damage: def.damage ?? 0,
        damageType: def.damageType ?? "",
        range: typeof def.range === "number" ? def.range : 1,
        attributes: Array.isArray(def.attributes) ? def.attributes : [],
    } as InventoryItem
}

function itemDefToPreviewWeapon(itemId: string, def: Record<string, any>): InventoryItem | null {
    if (!def || def.type !== "weapon") return null
    return {
        ...def,
        id: itemId,
        uid: `library-item-${itemId}`,
        name: def.name ?? itemId,
        quantity: def.quantity ?? 1,
        description: def.description ?? "",
        tags: Array.isArray(def.tags) ? def.tags : [],
        type: "weapon",
        damage: def.damage ?? 0,
        damageType: def.damageType ?? "",
        range: typeof def.range === "number" ? def.range : 1,
        attributes: Array.isArray(def.attributes) ? def.attributes : [],
    } as InventoryItem
}

function buildClassActionCard(classId: string, actionKey: string, wrapper: Record<string, any>): ActionCard | null {
    const ac = wrapper?.actionCard
    if (!ac || typeof ac !== "object") return null
    return {
        ...ac,
        id: actionKey,
        source: classId,
        tags: (ac.tags as string[]) ?? [],
    } as ActionCard
}

function reactionEmbeddedToActionCard(reactionId: string, raw: Record<string, unknown> | undefined): ActionCard | null {
    const unwrapped = unwrapEmbeddedActionCard(raw)
    if (!unwrapped) return null
    const name = unwrapped.name
    if (typeof name !== "string") return null
    const rawType = String(unwrapped.type ?? "reaction").toLowerCase()
    const type: ActionCard["type"] =
        rawType === "freereaction" ? "freeReaction" : rawType === "action" ? "action" : "reaction"
    return {
        ...unwrapped,
        id: reactionId,
        name,
        type,
        description: String(unwrapped.description ?? ""),
        tags: Array.isArray(unwrapped.tags) ? (unwrapped.tags as string[]) : [],
        source: String(unwrapped.source ?? "class"),
    } as ActionCard
}

/** Ids referenced by `GrantActionCard` feat/trait effects (e.g. Trusty Companion). */
function collectGrantActionCardIds(effects: unknown): string[] {
    if (!Array.isArray(effects)) return []
    const ids: string[] = []
    for (const e of effects) {
        if (!e || typeof e !== "object") continue
        const rec = e as Record<string, unknown>
        if (rec.type !== "GrantActionCard") continue
        const v = String(rec.value ?? "").trim()
        if (v) ids.push(v)
    }
    return [...new Set(ids)]
}

function matchesQuery(text: string, q: string): boolean {
    if (!q) return true
    return text.toLowerCase().includes(q)
}

const EQUIPMENT_TYPE_ORDER = ["weapon", "armor", "shield", "consumable", "misc", "container"] as const

function tocSlug(s: string): string {
    return (
        s
            .trim()
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase() || "section"
    )
}

function formatCreatureVuln(v: { stat: string; value?: string }): string {
    const vu = v.value != null && v.value !== "" ? ` (+${v.value} VU)` : ""
    return `${v.stat}${vu}`
}

const LibraryCreatureCard = memo(function LibraryCreatureCard({
    id,
    def,
    rules,
    previewWeapon,
    collapseAllSignal,
}: {
    id: string
    def: CreatureDefinition
    rules: Record<string, any>
    previewWeapon: InventoryItem | null
    collapseAllSignal: number
}) {
    const traitEntries = resolveCreatureTraitEntries(rules, def.traitRefs)
    const actionIds = [...(def.actionIDs ?? [])]
    const attrKeys = ["might", "dexterity", "reason", "willpower", "presence"] as const
    const oa = def.opportunityAttack

    return (
        <div className="min-w-0 space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold leading-tight">{def.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                            {id}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                            {def.role}
                        </Badge>
                        {typeof def.catalogLevel === "number" ? (
                            <Badge variant="outline" className="text-[10px]">
                                Lv {def.catalogLevel}
                            </Badge>
                        ) : null}
                        {(def.tags ?? []).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] capitalize">
                                {t}
                            </Badge>
                        ))}
                        {def.creatureTypes?.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] capitalize">
                                {t}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
            {def.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{def.description}</p>
            ) : null}

            {def.attributes && Object.keys(def.attributes).length > 0 ? (
                <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Attributes
                    </p>
                    <div className="grid grid-cols-5 gap-1 text-xs">
                        {attrKeys.map((k) => {
                            const raw = def.attributes?.[k]
                            const score =
                                typeof raw === "number" && Number.isFinite(raw) ? raw : null
                            return (
                                <div key={k} className="rounded-md bg-muted/40 px-1.5 py-1 text-center">
                                    <div className="text-[9px] text-muted-foreground uppercase">{k.slice(0, 3)}</div>
                                    <div className="font-mono font-semibold tabular-nums">{score ?? "—"}</div>
                                    <div className="text-[9px] font-mono text-muted-foreground tabular-nums">
                                        {score != null ? formatModifier(getAttributeModifier(score)) : "—"}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-xs text-muted-foreground">
                {def.size ? (
                    <span>
                        <span className="font-medium text-foreground">Size</span> {def.size}
                    </span>
                ) : null}
                {def.speed != null ? (
                    <span>
                        <span className="font-medium text-foreground">Speed</span> {def.speed}
                    </span>
                ) : null}
                {def.stability != null ? (
                    <span>
                        <span className="font-medium text-foreground">Stability</span> {def.stability}
                    </span>
                ) : null}
                {def.defense != null && Number.isFinite(def.defense) ? (
                    <span>
                        <span className="font-medium text-foreground">Def</span> {def.defense}
                    </span>
                ) : null}
                {def.role === "summon" && (def.defaultMaxHp != null || def.defaultMaxMp != null) ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-3 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-muted-foreground">
                        {def.defaultMaxHp != null ? (
                            <span className="tabular-nums">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    HP{" "}
                                </span>
                                <span className="font-mono text-sm font-semibold text-foreground">{def.defaultMaxHp}</span>
                            </span>
                        ) : null}
                        {def.defaultMaxMp != null ? (
                            <span className="tabular-nums">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    MP{" "}
                                </span>
                                <span className="font-mono text-sm font-semibold text-foreground">{def.defaultMaxMp}</span>
                            </span>
                        ) : null}
                    </span>
                ) : null}
            </div>

            {def.resistances && def.resistances.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Resistances
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {def.resistances.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[10px] capitalize">
                                {r}
                            </Badge>
                        ))}
                    </div>
                </div>
            ) : null}
            {def.immunities && def.immunities.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Immunities
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {def.immunities.map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px] capitalize">
                                {r}
                            </Badge>
                        ))}
                    </div>
                </div>
            ) : null}
            {def.vulnerabilities && def.vulnerabilities.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Vulnerabilities
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground capitalize">
                        {def.vulnerabilities.map((v, i) => (
                            <li key={`${v.stat}-${i}`}>{formatCreatureVuln(v)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {oa != null && Number.isFinite(oa) && oa > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                    Opportunity attack:{" "}
                    <span className="font-mono font-semibold text-foreground">{oa}</span> damage.
                </p>
            ) : null}

            {traitEntries.length > 0 ? (
                <div className="space-y-2 border-t border-border/60 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Passives</p>
                    {traitEntries.map((t) => (
                        <div key={t.id} className="rounded-md border border-border/60 bg-muted/15 px-2 py-1.5">
                            <div className="text-xs font-semibold">{t.name ?? t.id}</div>
                            {t.description ? (
                                <p className="mt-0.5 text-[11px] text-muted-foreground whitespace-pre-line">
                                    {t.description}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}

            {actionIds.length > 0 ? (
                <div className="space-y-3 border-t border-border/60 pt-2">
                    <span className="text-sm font-semibold">Actions</span>
                    <div className="space-y-4">
                        {actionIds.map((aid) => {
                            const ac = hydrateActionCardById(aid, rules)
                            if (!ac) {
                                return (
                                    <p key={aid} className="text-sm text-destructive">
                                        Missing action: {aid}
                                    </p>
                                )
                            }
                            return (
                                <div key={aid} className="space-y-2">
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {aid}
                                    </Badge>
                                    <ActionCardComponent
                                        action={ac}
                                        attributes={DEMO_ATTRIBUTES}
                                        currentWeapon={previewWeapon}
                                        offhandWeapon={null}
                                        forceCollapsed={false}
                                        powerRollDisplayMode="simple"
                                        defaultPowerRollExpanded={false}
                                        collapseAllSignal={collapseAllSignal}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                    No action cards linked yet (<span className="font-mono">actionIDs</span> empty).
                </p>
            )}
        </div>
    )
})

export function RulesLibraryView() {
    const [mainTab, setMainTab] = useState("classes")
    const [classSearch, setClassSearch] = useState("")
    const [featSearch, setFeatSearch] = useState("")
    const [skillSearch, setSkillSearch] = useState("")
    const [equipmentSearch, setEquipmentSearch] = useState("")
    const [creatureSearch, setCreatureSearch] = useState("")
    const [selectedClassId, setSelectedClassId] = useState<string>("")
    const [weaponPreview, setWeaponPreview] = useState<string>("__none__")
    const [collapseAllSignal, setCollapseAllSignal] = useState(0)
    const [tocCollapsed, setTocCollapsed] = useState(false)

    const libraryScrollTo = useCallback((elementId: string) => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, [])

    const previewWeapon = useMemo(() => catalogToPreviewWeapon(weaponPreview), [weaponPreview])

    const classEntries = useMemo(() => {
        const classes = RULES.classes ?? {}
        return Object.entries(classes)
            .map(([id, c]) => ({ id, ...(c as object) } as Record<string, any>))
            .sort((a, b) => String(a.name ?? a.id).localeCompare(String(b.name ?? b.id)))
    }, [])

    const filteredClasses = useMemo(() => {
        const q = classSearch.trim().toLowerCase()
        if (!q) return classEntries
        return classEntries.filter((c) => {
            const blob = [c.id, c.name, c.description].filter(Boolean).join(" ")
            return matchesQuery(blob, q)
        })
    }, [classEntries, classSearch])

    const effectiveClassId = useMemo(() => {
        if (filteredClasses.some((c) => c.id === selectedClassId)) return selectedClassId
        return filteredClasses[0]?.id ?? ""
    }, [filteredClasses, selectedClassId])

    const selectedClass = effectiveClassId ? RULES.classes?.[effectiveClassId] : null

    const featEntries = useMemo(() => {
        const feats = RULES.system?.feats ?? {}
        return Object.entries(feats).map(([id, f]) => ({ id, ...(f as object) } as Record<string, any>))
    }, [])

    const filteredFeats = useMemo(() => {
        const q = featSearch.trim().toLowerCase()
        if (!q) return featEntries
        return featEntries.filter((f) => {
            const blob = [f.id, f.name, f.description].filter(Boolean).join(" ")
            return matchesQuery(blob, q)
        })
    }, [featEntries, featSearch])

    const skillEntries = useMemo(() => {
        const skills = RULES.system?.skills ?? {}
        return Object.entries(skills).map(([id, s]) => ({ id, ...(s as object) } as Record<string, any>))
    }, [])

    const filteredSkills = useMemo(() => {
        const q = skillSearch.trim().toLowerCase()
        if (!q) return skillEntries
        return skillEntries.filter((s) => {
            const cats = Array.isArray(s.categories) ? s.categories.join(" ") : ""
            const blob = [s.id, s.name, s.description, cats].filter(Boolean).join(" ")
            return matchesQuery(blob, q)
        })
    }, [skillEntries, skillSearch])

    const filteredEquipment = useMemo(() => {
        const items = RULES.items ?? {}
        const q = equipmentSearch.trim().toLowerCase()
        const entries = Object.entries(items).map(([id, def]) => ({ id, def: def as Record<string, any> }))
        if (!q) return entries
        return entries.filter(({ id, def }) => {
            const tags = Array.isArray(def.tags) ? def.tags.join(" ") : ""
            const blob = [id, def.name, def.description, def.type, tags].filter(Boolean).join(" ")
            return matchesQuery(blob, q)
        })
    }, [equipmentSearch])

    const equipmentByType = useMemo(() => {
        const map = new Map<string, typeof filteredEquipment>()
        for (const row of filteredEquipment) {
            const t = typeof row.def.type === "string" ? row.def.type : "other"
            if (!map.has(t)) map.set(t, [])
            map.get(t)!.push(row)
        }
        const ordered: { type: string; rows: typeof filteredEquipment }[] = []
        for (const t of EQUIPMENT_TYPE_ORDER) {
            const rows = map.get(t)
            if (rows?.length) ordered.push({ type: t, rows })
        }
        for (const [t, rows] of map.entries()) {
            if (!EQUIPMENT_TYPE_ORDER.includes(t as (typeof EQUIPMENT_TYPE_ORDER)[number])) {
                ordered.push({ type: t, rows })
            }
        }
        return ordered
    }, [filteredEquipment])

    const featsByLevel = useMemo(() => {
        const buckets = new Map<string, typeof filteredFeats>()
        for (const f of filteredFeats) {
            const key =
                typeof f.minLevel === "number" && Number.isFinite(f.minLevel) ? String(Math.floor(f.minLevel)) : "other"
            if (!buckets.has(key)) buckets.set(key, [])
            buckets.get(key)!.push(f)
        }
        const keys = [...buckets.keys()].sort((a, b) => {
            if (a === "other") return 1
            if (b === "other") return -1
            return Number(a) - Number(b)
        })
        return keys.map((levelKey) => ({ levelKey, label: levelKey === "other" ? "Other" : `Level ${levelKey}`, feats: buckets.get(levelKey)! }))
    }, [filteredFeats])

    const creatureEntries = useMemo(() => {
        const defs = getCreatureTemplates(RULES)
        return Object.entries(defs)
            .map(([id, def]) => ({ id, def }))
            .sort((a, b) => {
                const la = a.def.catalogLevel
                const lb = b.def.catalogLevel
                const ha = la != null && Number.isFinite(la)
                const hb = lb != null && Number.isFinite(lb)
                if (ha && hb && la !== lb) return la - lb
                if (ha !== hb) return ha ? -1 : 1
                return String(a.def.name ?? a.id).localeCompare(String(b.def.name ?? b.id))
            })
    }, [])

    const filteredCreatureEntries = useMemo(() => {
        const q = creatureSearch.trim().toLowerCase()
        if (!q) return creatureEntries
        return creatureEntries.filter(({ id, def }) => {
            const blob = [id, def.name, def.description, ...(def.tags ?? []), def.role, ...(def.creatureTypes ?? [])]
                .filter(Boolean)
                .join(" ")
            return matchesQuery(blob, q)
        })
    }, [creatureEntries, creatureSearch])

    const creaturesByLevel = useMemo(() => {
        const buckets = new Map<string, typeof filteredCreatureEntries>()
        for (const row of filteredCreatureEntries) {
            const key =
                typeof row.def.catalogLevel === "number" && Number.isFinite(row.def.catalogLevel)
                    ? String(Math.floor(row.def.catalogLevel))
                    : "other"
            if (!buckets.has(key)) buckets.set(key, [])
            buckets.get(key)!.push(row)
        }
        const keys = [...buckets.keys()].sort((a, b) => {
            if (a === "other") return 1
            if (b === "other") return -1
            return Number(a) - Number(b)
        })
        return keys
            .map((levelKey) => {
                const creatures = [...(buckets.get(levelKey) ?? [])].sort((a, b) =>
                    String(a.def.name ?? a.id).localeCompare(String(b.def.name ?? b.id))
                )
                return {
                    levelKey,
                    label: levelKey === "other" ? "Other" : `Level ${levelKey}`,
                    creatures,
                }
            })
            .filter((x) => x.creatures.length > 0)
    }, [filteredCreatureEntries])

    const skillsByCategory = useMemo(() => {
        const buckets = new Map<string, typeof filteredSkills>()
        for (const s of filteredSkills) {
            const cat =
                Array.isArray(s.categories) && s.categories.length > 0 ? String(s.categories[0]) : "general"
            if (!buckets.has(cat)) buckets.set(cat, [])
            buckets.get(cat)!.push(s)
        }
        return [...buckets.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([category, skills]) => ({ category, skills }))
    }, [filteredSkills])

    const classSectionIds = (classId: string) => ({
        passives: `lib-class-${tocSlug(classId)}-passives`,
        deities: `lib-class-${tocSlug(classId)}-deities`,
        actions: `lib-class-${tocSlug(classId)}-actions`,
        reactions: `lib-class-${tocSlug(classId)}-reactions`,
    })

    return (
        <main className="container mx-auto px-4 py-6">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur py-4 mb-2 space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <BookOpen className="w-4 h-4" />
                        <span>Rules library — preview action cards and catalog data from rules.json</span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList className="w-full sm:w-auto sm:flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1 h-auto min-h-10 py-1">
                            <TabsTrigger value="classes" className="gap-2">
                                <Swords className="w-4 h-4" />
                                Classes
                            </TabsTrigger>
                            <TabsTrigger value="feats" className="gap-2">
                                <Award className="w-4 h-4" />
                                Feats
                            </TabsTrigger>
                            <TabsTrigger value="skills" className="gap-2">
                                <GraduationCap className="w-4 h-4" />
                                Skills
                            </TabsTrigger>
                            <TabsTrigger value="equipment" className="gap-2">
                                <Package className="w-4 h-4" />
                                Equipment
                            </TabsTrigger>
                            <TabsTrigger value="creatures" className="gap-2">
                                <PawPrint className="w-4 h-4" />
                                Creatures
                            </TabsTrigger>
                        </TabsList>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 font-semibold"
                            onClick={() => setCollapseAllSignal((n) => n + 1)}
                        >
                            <ChevronsUp className="w-4 h-4 mr-2" />
                            Collapse all
                        </Button>
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <aside
                        className={cn(
                            "sticky z-30 shrink-0 self-start overflow-hidden rounded-lg border border-border bg-muted/20 shadow-sm transition-[width,min-width] duration-200",
                            tocCollapsed ? "w-11 min-w-[2.75rem]" : "w-56 min-w-[14rem] md:w-64 md:min-w-[16rem]"
                        )}
                        style={{ top: "8.5rem" }}
                    >
                        <div className="flex items-center gap-0.5 border-b border-border bg-background/90 px-0.5 py-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-expanded={!tocCollapsed}
                                aria-label={tocCollapsed ? "Show table of contents" : "Hide table of contents"}
                                onClick={() => setTocCollapsed((c) => !c)}
                            >
                                {tocCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                            </Button>
                            {!tocCollapsed ? (
                                <span className="truncate pr-1 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    Contents
                                </span>
                            ) : null}
                        </div>
                        {!tocCollapsed ? (
                            <ScrollArea className="h-[min(72vh,640px)]">
                                <nav className="space-y-2 p-2 pb-4" aria-label="Library table of contents">
                                    {mainTab === "classes" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Classes
                                            </p>
                                            <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
                                                {filteredClasses.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedClassId(c.id)
                                                            libraryScrollTo("lib-class-detail-top")
                                                        }}
                                                        className={cn(
                                                            "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                                                            effectiveClassId === c.id
                                                                ? "bg-primary font-semibold text-primary-foreground"
                                                                : "hover:bg-muted"
                                                        )}
                                                    >
                                                        <div className="truncate font-medium">{c.name ?? c.id}</div>
                                                    </button>
                                                ))}
                                            </div>
                                            {effectiveClassId && selectedClass ? (
                                                <Collapsible defaultOpen className="border-t border-border pt-2">
                                                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted">
                                                        In this class
                                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="mt-1 space-y-0.5">
                                                        {Object.keys(selectedClass.passives ?? {}).length > 0 ? (
                                                            <button
                                                                type="button"
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                                                                onClick={() =>
                                                                    libraryScrollTo(classSectionIds(effectiveClassId).passives)
                                                                }
                                                            >
                                                                Passives
                                                            </button>
                                                        ) : null}
                                                        {Array.isArray(selectedClass.deities) && selectedClass.deities.length > 0 ? (
                                                            <button
                                                                type="button"
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                                                                onClick={() =>
                                                                    libraryScrollTo(classSectionIds(effectiveClassId).deities)
                                                                }
                                                            >
                                                                Deities
                                                            </button>
                                                        ) : null}
                                                        {Object.keys(selectedClass.actions ?? {}).length > 0 ? (
                                                            <button
                                                                type="button"
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                                                                onClick={() =>
                                                                    libraryScrollTo(classSectionIds(effectiveClassId).actions)
                                                                }
                                                            >
                                                                Actions
                                                            </button>
                                                        ) : null}
                                                        {(selectedClass.reactions ?? []).length > 0 ? (
                                                            <button
                                                                type="button"
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                                                                onClick={() =>
                                                                    libraryScrollTo(classSectionIds(effectiveClassId).reactions)
                                                                }
                                                            >
                                                                Reactions
                                                            </button>
                                                        ) : null}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            ) : null}
                                        </>
                                    ) : null}
                                    {mainTab === "feats" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                By min. level
                                            </p>
                                            <div className="space-y-0.5">
                                                {featsByLevel.map(({ levelKey, label, feats }) => (
                                                    <button
                                                        key={levelKey}
                                                        type="button"
                                                        onClick={() => libraryScrollTo(`lib-feat-lvl-${levelKey}`)}
                                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{label}</span>
                                                        <span className="text-muted-foreground"> ({feats.length})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                    {mainTab === "skills" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                By category
                                            </p>
                                            <div className="space-y-0.5">
                                                {skillsByCategory.map(({ category, skills }) => (
                                                    <button
                                                        key={category}
                                                        type="button"
                                                        onClick={() =>
                                                            libraryScrollTo(`lib-skill-cat-${tocSlug(category)}`)
                                                        }
                                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs capitalize hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{category}</span>
                                                        <span className="text-muted-foreground"> ({skills.length})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                    {mainTab === "equipment" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                By type
                                            </p>
                                            <div className="space-y-0.5">
                                                {equipmentByType.map(({ type, rows }) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => libraryScrollTo(`lib-equip-type-${tocSlug(type)}`)}
                                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs capitalize hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{type}</span>
                                                        <span className="text-muted-foreground"> ({rows.length})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                    {mainTab === "creatures" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                By level
                                            </p>
                                            <div className="space-y-0.5">
                                                {creaturesByLevel.map(({ levelKey, label, creatures }) => (
                                                    <button
                                                        key={levelKey}
                                                        type="button"
                                                        onClick={() => libraryScrollTo(`lib-creature-lvl-${levelKey}`)}
                                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{label}</span>
                                                        <span className="text-muted-foreground"> ({creatures.length})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : null}
                                </nav>
                            </ScrollArea>
                        ) : null}
                    </aside>

                    <div className="min-w-0 flex-1">
                <TabsContent value="classes" className="mt-0">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                            <Label htmlFor="lib-class-search">Search classes</Label>
                            <Input
                                id="lib-class-search"
                                placeholder="Name or description…"
                                value={classSearch}
                                onChange={(e) => setClassSearch(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5 sm:w-64">
                            <Label>Weapon preview (+Wpn)</Label>
                            <Select value={weaponPreview} onValueChange={setWeaponPreview}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Weapon" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREVIEW_WEAPON_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div id="lib-class-detail-top" className="scroll-mt-36 min-h-[50vh] space-y-6">
                            {!selectedClass ? (
                                <p className="text-muted-foreground">No class selected.</p>
                            ) : (
                                <>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight">{selectedClass.name}</h2>
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                            {selectedClass.description}
                                        </p>
                                    </div>

                                    <section
                                        id={classSectionIds(effectiveClassId).passives}
                                        className="scroll-mt-36 space-y-3"
                                    >
                                        <h3 className="text-lg font-bold border-b border-border pb-1">Passives</h3>
                                        <div className="space-y-3">
                                            {Object.entries(selectedClass.passives ?? {}).map(([pid, p]) => {
                                                const passive = p as Record<string, any>
                                                return (
                                                    <div
                                                        key={pid}
                                                        className="rounded-lg border border-border p-4 bg-card/50 space-y-2"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold">{passive.name}</span>
                                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                                {pid}
                                                            </Badge>
                                                            {typeof passive.minLevel === "number" ? (
                                                                <Badge variant="secondary">Lv {passive.minLevel}</Badge>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                            {passive.description}
                                                        </p>
                                                        {Array.isArray(passive.effects) && passive.effects.length > 0 ? (
                                                            <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-x-auto">
                                                                {JSON.stringify(passive.effects, null, 2)}
                                                            </pre>
                                                        ) : null}
                                                        {passive.powerRoll ? (
                                                            <TraitPowerRollCollapsible
                                                                roll={passive.powerRoll as PowerRoll}
                                                                attributes={DEMO_ATTRIBUTES}
                                                                currentWeapon={previewWeapon}
                                                                offhandWeapon={null}
                                                                defaultExpanded={false}
                                                                collapseAllSignal={collapseAllSignal}
                                                            />
                                                        ) : null}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>

                                    {Array.isArray(selectedClass.deities) && selectedClass.deities.length > 0 ? (
                                        <section
                                            id={classSectionIds(effectiveClassId).deities}
                                            className="scroll-mt-36 space-y-3"
                                        >
                                            <h3 className="text-lg font-bold border-b border-border pb-1">Deities</h3>
                                            <div className="space-y-4">
                                                {selectedClass.deities.map((d: Record<string, any>) => (
                                                    <div
                                                        key={d.id}
                                                        className="rounded-lg border border-border p-4 space-y-2 bg-muted/10"
                                                    >
                                                        <div className="font-bold">
                                                            {d.name}{" "}
                                                            <span className="text-muted-foreground font-mono text-sm font-normal">
                                                                ({d.id})
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                            {d.description}
                                                        </p>
                                                        <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                                                            {Object.entries(d.passives ?? {}).map(([pid, p]) => {
                                                                const passive = p as Record<string, any>
                                                                return (
                                                                    <div key={pid} className="text-sm space-y-1">
                                                                        <div className="flex flex-wrap gap-2 items-center">
                                                                            <span className="font-semibold">{passive.name}</span>
                                                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                                                {pid}
                                                                            </Badge>
                                                                            {typeof passive.minLevel === "number" ? (
                                                                                <Badge variant="secondary">Lv {passive.minLevel}</Badge>
                                                                            ) : null}
                                                                        </div>
                                                                        <p className="text-muted-foreground whitespace-pre-line">
                                                                            {passive.description}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    ) : null}

                                    <section
                                        id={classSectionIds(effectiveClassId).actions}
                                        className="scroll-mt-36 space-y-3"
                                    >
                                        <h3 className="text-lg font-bold border-b border-border pb-1">Actions</h3>
                                        <div className="space-y-4">
                                            {Object.entries(selectedClass.actions ?? {}).map(([aid, wrap]) => {
                                                const wrapper = wrap as Record<string, any>
                                                const card = buildClassActionCard(effectiveClassId, aid, wrapper)
                                                if (!card) return null
                                                return (
                                                    <div key={aid} className="space-y-2">
                                                        <div className="flex flex-wrap gap-2 items-center">
                                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                                {aid}
                                                            </Badge>
                                                            {typeof wrapper.minLevel === "number" ? (
                                                                <Badge variant="secondary">Lv {wrapper.minLevel}</Badge>
                                                            ) : null}
                                                            {wrapper.deityId ? (
                                                                <Badge variant="default">Deity: {wrapper.deityId}</Badge>
                                                            ) : null}
                                                        </div>
                                                        <ActionCardComponent
                                                            action={card}
                                                            attributes={DEMO_ATTRIBUTES}
                                                            currentWeapon={previewWeapon}
                                                            offhandWeapon={null}
                                                            forceCollapsed={false}
                                                            powerRollDisplayMode="simple"
                                                            defaultPowerRollExpanded={false}
                                                            collapseAllSignal={collapseAllSignal}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>

                                    <section
                                        id={classSectionIds(effectiveClassId).reactions}
                                        className="scroll-mt-36 space-y-3"
                                    >
                                        <h3 className="text-lg font-bold border-b border-border pb-1">Reactions</h3>
                                        <div className="space-y-4">
                                            {(selectedClass.reactions ?? []).map((rx: Record<string, any>, rxi: number) => {
                                                const embedded = reactionEmbeddedToActionCard(String(rx.id ?? ""), rx.actionCard)
                                                return (
                                                    <div
                                                        key={rx.id ?? `reaction-${rxi}`}
                                                        className="rounded-lg border border-border p-4 space-y-3 bg-card/40"
                                                    >
                                                        <div className="flex flex-wrap gap-2 items-center">
                                                            <span className="font-semibold">{rx.name}</span>
                                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                                {rx.id}
                                                            </Badge>
                                                            {typeof rx.level === "number" ? (
                                                                <Badge variant="secondary">Lv {rx.level}</Badge>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                            Trigger
                                                        </p>
                                                        <p className="text-sm">{rx.trigger}</p>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                            {rx.description}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {rx.focusCost ? <Badge variant="outline">{rx.focusCost} Focus</Badge> : null}
                                                            {rx.mpCost ? <Badge variant="outline">{rx.mpCost} MP</Badge> : null}
                                                            {rx.ipCost ? <Badge variant="outline">{rx.ipCost} IP</Badge> : null}
                                                        </div>
                                                        {embedded ? (
                                                            <ActionCardComponent
                                                                action={embedded}
                                                                attributes={DEMO_ATTRIBUTES}
                                                                currentWeapon={previewWeapon}
                                                                offhandWeapon={null}
                                                                forceCollapsed={false}
                                                                powerRollDisplayMode="simple"
                                                                defaultPowerRollExpanded={false}
                                                                collapseAllSignal={collapseAllSignal}
                                                            />
                                                        ) : null}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </section>
                                </>
                            )}
                    </div>
                </TabsContent>

                <TabsContent value="feats" className="mt-0 space-y-6">
                    <div className="space-y-1.5 max-w-md">
                        <Label htmlFor="lib-feat-search">Search feats</Label>
                        <Input
                            id="lib-feat-search"
                            placeholder="Name or description…"
                            value={featSearch}
                            onChange={(e) => setFeatSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-10">
                        {featsByLevel.map(({ levelKey, label, feats }) => (
                            <section
                                key={levelKey}
                                id={`lib-feat-lvl-${levelKey}`}
                                className="scroll-mt-36 space-y-3"
                            >
                                <h2 className="border-b border-border pb-1 text-lg font-bold">{label}</h2>
                                <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4">
                                    {feats.map((f) => (
                                        <div
                                            key={f.id}
                                            className="min-w-0 space-y-2 rounded-lg border border-border bg-card/40 p-4"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-lg font-semibold">{f.name}</span>
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    {f.id}
                                                </Badge>
                                                {typeof f.minLevel === "number" ? (
                                                    <Badge variant="secondary">Min Lv {f.minLevel}</Badge>
                                                ) : null}
                                            </div>
                                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                {f.description}
                                            </p>
                                            {f.powerRoll ? (
                                                <TraitPowerRollCollapsible
                                                    roll={f.powerRoll as PowerRoll}
                                                    attributes={DEMO_ATTRIBUTES}
                                                    currentWeapon={previewWeapon}
                                                    offhandWeapon={null}
                                                    defaultExpanded={false}
                                                    collapseAllSignal={collapseAllSignal}
                                                />
                                            ) : null}
                                            <div className="space-y-1 text-sm">
                                                <span className="font-medium">Prerequisites</span>
                                                {(() => {
                                                    const prereqExtra = formatFeatPrerequisiteLines(f.prereqs, RULES)
                                                    const hasAdv =
                                                        typeof f.minLevel === "number" && Number.isFinite(f.minLevel)
                                                    const any = hasAdv || prereqExtra.length > 0
                                                    return (
                                                        <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                                            {hasAdv ? (
                                                                <li>Adventurer level {f.minLevel}+</li>
                                                            ) : null}
                                                            {prereqExtra.map((line, i) => (
                                                                <li key={i}>{line}</li>
                                                            ))}
                                                            {!any ? <li className="text-xs">None</li> : null}
                                                        </ul>
                                                    )
                                                })()}
                                            </div>
                                            {typeof f.selectAmount === "number" &&
                                            f.selectAmount > 0 &&
                                            Array.isArray(f.effects) &&
                                            f.effects.length > f.selectAmount ? (
                                                <div className="space-y-1 text-sm">
                                                    <span className="font-medium">Choose {f.selectAmount}</span>
                                                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                                        {f.effects.map((eff: Record<string, unknown>, i: number) => (
                                                            <li key={i}>{formatTraitEffectChoiceLabel(eff as any, RULES)}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : null}
                                            {(() => {
                                                const grantedIds = collectGrantActionCardIds(f.effects)
                                                if (grantedIds.length === 0) return null
                                                return (
                                                    <div className="space-y-3 pt-2 border-t border-border/60">
                                                        <span className="text-sm font-semibold">Action cards</span>
                                                        <p className="text-xs text-muted-foreground">
                                                            Full cards granted by this feat (e.g. companion picks).
                                                        </p>
                                                        <div className="space-y-4">
                                                            {grantedIds.map((aid) => {
                                                                const ac = hydrateActionCardById(aid, RULES)
                                                                if (!ac) {
                                                                    return (
                                                                        <p key={aid} className="text-sm text-destructive">
                                                                            Missing action: {aid}
                                                                        </p>
                                                                    )
                                                                }
                                                                return (
                                                                    <div key={aid} className="space-y-2">
                                                                        <Badge variant="outline" className="font-mono text-[10px]">
                                                                            {aid}
                                                                        </Badge>
                                                                        <ActionCardComponent
                                                                            action={ac}
                                                                            attributes={DEMO_ATTRIBUTES}
                                                                            currentWeapon={previewWeapon}
                                                                            offhandWeapon={null}
                                                                            forceCollapsed={false}
                                                                            powerRollDisplayMode="simple"
                                                                            defaultPowerRollExpanded={false}
                                                                            collapseAllSignal={collapseAllSignal}
                                                                        />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="skills" className="mt-0 space-y-6">
                    <div className="space-y-1.5 max-w-md">
                        <Label htmlFor="lib-skill-search">Search skills</Label>
                        <Input
                            id="lib-skill-search"
                            placeholder="Name, category, description…"
                            value={skillSearch}
                            onChange={(e) => setSkillSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-10">
                        {skillsByCategory.map(({ category, skills }) => (
                            <section
                                key={category}
                                id={`lib-skill-cat-${tocSlug(category)}`}
                                className="scroll-mt-36 space-y-3"
                            >
                                <h2 className="border-b border-border pb-1 text-lg font-bold capitalize">{category}</h2>
                                <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4">
                                    {skills.map((s) => (
                                        <div
                                            key={s.id}
                                            className="min-w-0 space-y-2 rounded-lg border border-border bg-card/40 p-4"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-lg font-semibold">{s.name}</span>
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    {s.id}
                                                </Badge>
                                                {Array.isArray(s.categories) && s.categories.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {s.categories.map((c: string) => (
                                                            <Badge key={c} variant="secondary">
                                                                {c}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                {s.description}
                                            </p>
                                            {s.powerRoll ? (
                                                <TraitPowerRollCollapsible
                                                    roll={s.powerRoll as PowerRoll}
                                                    attributes={DEMO_ATTRIBUTES}
                                                    currentWeapon={previewWeapon}
                                                    offhandWeapon={null}
                                                    defaultExpanded={false}
                                                    collapseAllSignal={collapseAllSignal}
                                                />
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="equipment" className="mt-0 space-y-4">
                    <div className="space-y-1.5 max-w-md">
                        <Label htmlFor="lib-equip-search">Search equipment</Label>
                        <Input
                            id="lib-equip-search"
                            placeholder="Id, name, tags, type…"
                            value={equipmentSearch}
                            onChange={(e) => setEquipmentSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-8">
                        {equipmentByType.map(({ type, rows }) => (
                            <section
                                key={type}
                                id={`lib-equip-type-${tocSlug(type)}`}
                                className="scroll-mt-36 space-y-3"
                            >
                                <h3 className="text-lg font-bold capitalize border-b border-border pb-1">{type}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
                                    {rows.map(({ id, def }) => {
                                        const selfWeapon = itemDefToPreviewWeapon(id, def)
                                        const cardWeapon = selfWeapon ?? previewWeapon
                                        const actionIds: string[] = Array.isArray(def.actionIDs) ? def.actionIDs : []
                                        return (
                                            <div
                                                key={id}
                                                className="rounded-lg border border-border p-4 space-y-3 bg-card/30 min-w-0"
                                            >
                                                <div className="flex flex-wrap gap-2 items-baseline">
                                                    <span className="font-bold text-lg">{def.name ?? id}</span>
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {id}
                                                    </Badge>
                                                    <Badge variant="secondary">{def.type}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                    {def.description}
                                                </p>
                                                {Array.isArray(def.tags) && def.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {def.tags.map((t: string) => (
                                                            <Badge key={t} variant="outline">
                                                                {t}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : null}
                                                {def.type === "weapon" ? (
                                                    <div className="text-sm grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                                                        <span>
                                                            <span className="font-medium text-foreground">Damage</span>{" "}
                                                            {def.damage}
                                                        </span>
                                                        <span>
                                                            <span className="font-medium text-foreground">Type</span>{" "}
                                                            {def.damageType || "—"}
                                                        </span>
                                                        <span>
                                                            <span className="font-medium text-foreground">Range</span>{" "}
                                                            {def.range}
                                                        </span>
                                                        <span>
                                                            <span className="font-medium text-foreground">Value</span>{" "}
                                                            {def.value ?? "—"}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {def.type === "armor" ? (
                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                        <div>
                                                            Def: {def.defense?.value ?? "—"}{" "}
                                                            {def.defense?.attribute
                                                                ? `(${def.defense.attribute}, max ${def.defense.attrMax ?? "—"})`
                                                                : ""}
                                                        </div>
                                                        <div>Stability: {def.stability ?? "—"}</div>
                                                    </div>
                                                ) : null}
                                                {def.type === "shield" ? (
                                                    <div className="text-sm text-muted-foreground">
                                                        Defense: {def.defense ?? "—"}
                                                    </div>
                                                ) : null}
                                                {def.traits && def.traits.length > 0 ? (
                                                    <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-x-auto max-h-40">
                                                        {JSON.stringify(def.traits, null, 2)}
                                                    </pre>
                                                ) : null}
                                                {def.powerRoll ? (
                                                    <TraitPowerRollCollapsible
                                                        roll={def.powerRoll as PowerRoll}
                                                        attributes={DEMO_ATTRIBUTES}
                                                        currentWeapon={cardWeapon}
                                                        offhandWeapon={null}
                                                        defaultExpanded={false}
                                                        collapseAllSignal={collapseAllSignal}
                                                    />
                                                ) : null}
                                                {actionIds.length > 0 ? (
                                                    <div className="space-y-3 pt-2 border-t border-border/60">
                                                        <span className="text-sm font-semibold">Actions from item</span>
                                                        {actionIds.map((aid) => {
                                                            const ac = hydrateActionCardById(aid, RULES)
                                                            if (!ac) {
                                                                return (
                                                                    <p key={aid} className="text-sm text-destructive">
                                                                        Missing action: {aid}
                                                                    </p>
                                                                )
                                                            }
                                                            return (
                                                                <ActionCardComponent
                                                                    key={`${id}-${aid}`}
                                                                    action={ac}
                                                                    attributes={DEMO_ATTRIBUTES}
                                                                    currentWeapon={cardWeapon}
                                                                    offhandWeapon={null}
                                                                    forceCollapsed={false}
                                                                    powerRollDisplayMode="simple"
                                                                    defaultPowerRollExpanded={false}
                                                                    collapseAllSignal={collapseAllSignal}
                                                                />
                                                            )
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="creatures" className="mt-0 space-y-6">
                    <div className="space-y-1.5 max-w-md">
                        <Label htmlFor="lib-creature-search">Search creatures</Label>
                        <Input
                            id="lib-creature-search"
                            placeholder="Name, id, tag, role, description…"
                            value={creatureSearch}
                            onChange={(e) => setCreatureSearch(e.target.value)}
                        />
                    </div>
                    <div className="space-y-10">
                        {creaturesByLevel.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No creatures match this search.</p>
                        ) : (
                            creaturesByLevel.map(({ levelKey, label, creatures }) => (
                                <section
                                    key={levelKey}
                                    id={`lib-creature-lvl-${levelKey}`}
                                    className="scroll-mt-36 space-y-3"
                                >
                                    <h2 className="border-b border-border pb-1 text-lg font-bold">{label}</h2>
                                    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4">
                                        {creatures.map(({ id, def }) => (
                                            <LibraryCreatureCard
                                                key={id}
                                                id={id}
                                                def={def}
                                                rules={RULES}
                                                previewWeapon={previewWeapon}
                                                collapseAllSignal={collapseAllSignal}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </TabsContent>
                    </div>
                </div>
            </Tabs>
        </main>
    )
}
