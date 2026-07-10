"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { rulesData } from "@/lib/rules-data"
import type { PowerRoll } from "@/lib/rules"
import type { InventoryItem } from "@/lib/equipment-data"
import { hydrateActionCardById } from "@/logic/actions/hydrate"
import { isReactionActionCardType } from "@/logic/equipment/granted-actions"
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import { EffectGlossaryTag } from "@/components/effect-glossary-tag"
import { formatArmorDefenseValue, formatWeaponAttribLabel } from "@/logic/equipment/stats-display"
import { MARTIAL_PROFICIENCY_ROWS } from "@/logic/equipment/proficiency"
import { getCreatureTemplates } from "@/logic/creatures/roster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { formatFeatPrerequisiteLines } from "@/logic/feats/prereqs"
import { compareFeatsAlphabetically } from "@/logic/feats/sort"
import {
    getItemNameClass,
    getItemRankLabel,
    getItemRankPalette,
    resolveItemRank,
    type RulesWithItemRanks,
} from "@/logic/equipment/item-rank-display"
import { sortCatalogEntries, type CatalogSortKey } from "@/logic/equipment/catalog-sort"
import { CatalogSortSelect } from "@/components/equipment/catalog-sort-select"
import { ItemRequirementsDisplay } from "@/components/equipment/item-requirements-display"
import { buildItemInventoryTraitBlocks } from "@/logic/equipment/item-inventory-details"
import { getActionItemChargeCost, itemHasChargeTracking } from "@/logic/equipment/item-charges"
import { ChargePips } from "@/components/character-sheet/charge-pips"
import { resolveMaxCharges } from "@/logic/traits/charge-helpers"
import type { ChargeDefinition } from "@/lib/rules"
import { formatTraitEffectChoiceLabel } from "@/logic/traits/selection"
import { buildGlossaryLibrarySections } from "@/logic/display/glossary-lookup"
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
    ChevronRight,
    ChevronsUp,
    GraduationCap,
    Package,
    PawPrint,
    PanelLeftClose,
    PanelLeftOpen,
    ScrollText,
    Swords,
    Users,
} from "lucide-react"
import {
    RULES,
    DEMO_ATTRIBUTES,
    PREVIEW_WEAPON_OPTIONS,
    catalogToPreviewWeapon,
    matchesQuery,
    ClassLibraryGrantsSummary,
    LibraryRacePassiveCard,
    LibraryCreatureCard,
    tocSlug,
    sortedRacePassives,
    classProficiencyLabel,
    formatClassStatBonusRule,
    buildClassActionCard,
    reactionEmbeddedToActionCard,
    collectGrantActionCardIds,
    itemDefToPreviewWeapon,
    EQUIPMENT_TYPE_ORDER,
    formatCreatureVuln,
    getLibraryCreatureActionDisplayIds,
} from "@/logic/display/rules-library-helpers"
import {
    ACCESSORY_EQUIPMENT_TYPE,
    ACCESSORY_SLOT_FILTER_OPTIONS,
    accessoryItemMatchesSlotFilter,
    countAccessoryItemsBySlotFilter,
    formatAccessoryAllowedSlotsLabel,
    formatEquipmentLibraryTypeLabel,
    isAccessoryCatalogItem,
    resolveEquipmentLibraryType,
    type AccessorySlotFilterKey,
} from "@/logic/equipment/accessory-catalog"

type ItemRankFilterOption = {
    id: string
    label: string
    nameClass: string
}

function EquipmentRankMultiSelect({
    value,
    onChange,
    options,
    counts,
    id,
    className,
}: {
    value: Set<string>
    onChange: (next: Set<string>) => void
    options: ItemRankFilterOption[]
    counts: Map<string, number>
    id?: string
    className?: string
}) {
    const label = useMemo(() => {
        if (value.size === 0) return "All rarities"
        const selected = options.filter((option) => value.has(option.id))
        if (selected.length <= 2) return selected.map((option) => option.label).join(", ")
        return `${selected.length} rarities`
    }, [value, options])

    const toggleRank = (rankId: string, checked: boolean | "indeterminate") => {
        const next = new Set(value)
        if (checked === true) next.add(rankId)
        else next.delete(rankId)
        onChange(next)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    className={cn("justify-between font-normal", className)}
                >
                    <span className="truncate">{label}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-0.5">
                    {options.map((rank) => (
                        <label
                            key={rank.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                        >
                            <Checkbox
                                checked={value.has(rank.id)}
                                onCheckedChange={(checked) => toggleRank(rank.id, checked)}
                            />
                            <span className={cn("flex-1 font-medium", rank.nameClass)}>{rank.label}</span>
                            <span className="text-xs text-muted-foreground">{counts.get(rank.id) ?? 0}</span>
                        </label>
                    ))}
                </div>
                {value.size > 0 ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => onChange(new Set())}
                    >
                        Clear filter
                    </Button>
                ) : null}
            </PopoverContent>
        </Popover>
    )
}

function LibraryItemChargePips({
    itemId,
    def,
    attributes,
}: {
    itemId: string
    def: Record<string, unknown>
    attributes: Record<string, number>
}) {
    const maxCharges = useMemo(
        () => resolveMaxCharges(def as ChargeDefinition, attributes),
        [def, attributes],
    )
    const [currentCharges, setCurrentCharges] = useState(maxCharges)

    useEffect(() => {
        setCurrentCharges(maxCharges)
    }, [itemId, maxCharges])

    if (!itemHasChargeTracking(def as ChargeDefinition) || maxCharges <= 0) return null

    return (
        <ChargePips
            maxCharges={maxCharges}
            currentCharges={currentCharges}
            onChange={setCurrentCharges}
            label="Charges"
            className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
        />
    )
}

export function RulesLibraryView() {
    const [mainTab, setMainTab] = useState("classes")
    const [classSearch, setClassSearch] = useState("")
    const [raceSearch, setRaceSearch] = useState("")
    const [featSearch, setFeatSearch] = useState("")
    const [skillSearch, setSkillSearch] = useState("")
    const [equipmentSearch, setEquipmentSearch] = useState("")
    const [equipmentSort, setEquipmentSort] = useState<CatalogSortKey>("alphabetical")
    const [equipmentRankFilters, setEquipmentRankFilters] = useState<Set<string>>(() => new Set())
    const [accessoriesNavExpanded, setAccessoriesNavExpanded] = useState(false)
    const [libraryAccessorySlotFilter, setLibraryAccessorySlotFilter] =
        useState<AccessorySlotFilterKey>("all")
    const [creatureSearch, setCreatureSearch] = useState("")
    const [glossarySearch, setGlossarySearch] = useState("")
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

    const raceEntries = useMemo(() => {
        const races = RULES.races ?? {}
        return Object.entries(races)
            .map(([id, r]) => ({ id, ...(r as object) } as Record<string, any>))
            .sort((a, b) => String(a.name ?? a.id).localeCompare(String(b.name ?? b.id)))
    }, [])

    const filteredRaces = useMemo(() => {
        const q = raceSearch.trim().toLowerCase()
        if (!q) return raceEntries
        return raceEntries.filter((race) => {
            const passiveBlob = Object.entries(race.passives ?? {})
                .map(([pid, p]) => {
                    const passive = p as Record<string, unknown>
                    return [pid, passive.name, passive.description, passive.type].filter(Boolean).join(" ")
                })
                .join(" ")
            const blob = [race.id, race.name, race.description, passiveBlob].filter(Boolean).join(" ")
            return matchesQuery(blob, q)
        })
    }, [raceEntries, raceSearch])

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

    const itemRankFilterOptions = useMemo(() => {
        const palette = getItemRankPalette(RULES)
        const orderedIds = ["common", "intermediate", "advanced", "masterwork"]
        const ids = [
            ...orderedIds.filter((id) => palette[id] || id === "common"),
            ...Object.keys(palette).filter((id) => !orderedIds.includes(id)),
        ]
        return ids.map((id) => ({
            id,
            label: palette[id]?.label ?? (id === "common" ? "Common" : id),
            nameClass: palette[id]?.nameClass ?? "text-foreground",
        }))
    }, [])

    const equipmentMatchingSearch = useMemo(() => {
        const items = RULES.items ?? {}
        const q = equipmentSearch.trim().toLowerCase()
        const entries = Object.entries(items).map(([id, def]) => ({ id, def: def as Record<string, any> }))
        if (!q) return entries
        return entries.filter(({ id, def }) => {
            const rankId = resolveItemRank({ rank: def.rank }, RULES)
            const rankLabel = getItemRankLabel({ rank: def.rank }, RULES) ?? rankId
            const tags = Array.isArray(def.tags) ? def.tags.join(" ") : ""
            const blob = [id, def.name, def.description, def.type, tags, rankId, rankLabel]
                .filter(Boolean)
                .join(" ")
            return matchesQuery(blob, q)
        })
    }, [equipmentSearch])

    const equipmentRankCounts = useMemo(() => {
        const counts = new Map<string, number>()
        for (const { def } of equipmentMatchingSearch) {
            const rank = resolveItemRank({ rank: def.rank }, RULES)
            counts.set(rank, (counts.get(rank) ?? 0) + 1)
        }
        return counts
    }, [equipmentMatchingSearch])

    const filteredEquipment = useMemo(() => {
        if (equipmentRankFilters.size === 0) return equipmentMatchingSearch
        return equipmentMatchingSearch.filter(({ def }) =>
            equipmentRankFilters.has(resolveItemRank({ rank: def.rank }, RULES)),
        )
    }, [equipmentMatchingSearch, equipmentRankFilters])

    const accessoryEquipmentRows = useMemo(
        () =>
            filteredEquipment.filter(
                ({ id, def }) => resolveEquipmentLibraryType(id, def) === ACCESSORY_EQUIPMENT_TYPE,
            ),
        [filteredEquipment],
    )

    const accessorySlotCounts = useMemo(
        () => countAccessoryItemsBySlotFilter(accessoryEquipmentRows),
        [accessoryEquipmentRows],
    )

    const equipmentByType = useMemo(() => {
        const map = new Map<string, typeof filteredEquipment>()
        for (const row of filteredEquipment) {
            const t = resolveEquipmentLibraryType(row.id, row.def)
            if (
                t === ACCESSORY_EQUIPMENT_TYPE &&
                !accessoryItemMatchesSlotFilter(row.def.allowedSlots, libraryAccessorySlotFilter)
            ) {
                continue
            }
            if (!map.has(t)) map.set(t, [])
            map.get(t)!.push(row)
        }
        const ordered: { type: string; rows: typeof filteredEquipment }[] = []
        for (const t of EQUIPMENT_TYPE_ORDER) {
            const rows = map.get(t)
            if (rows?.length) {
                ordered.push({
                    type: t,
                    rows: sortCatalogEntries(rows, equipmentSort, RULES as RulesWithItemRanks),
                })
            }
        }
        for (const [t, rows] of map.entries()) {
            if (!EQUIPMENT_TYPE_ORDER.includes(t as (typeof EQUIPMENT_TYPE_ORDER)[number])) {
                ordered.push({
                    type: t,
                    rows: sortCatalogEntries(rows, equipmentSort, RULES as RulesWithItemRanks),
                })
            }
        }
        return ordered
    }, [filteredEquipment, libraryAccessorySlotFilter, equipmentSort])

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
        return keys.map((levelKey) => {
            const row = buckets.get(levelKey)!
            const feats = [...row].sort((a, b) => compareFeatsAlphabetically(a.id, a, b.id, b))
            return {
                levelKey,
                label: levelKey === "other" ? "Other" : `Level ${levelKey}`,
                feats,
            }
        })
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

    const glossarySections = useMemo(() => {
        const q = glossarySearch.trim().toLowerCase()
        const sections = buildGlossaryLibrarySections()
        if (!q) return sections
        return sections
            .map((section) => ({
                ...section,
                terms: section.terms.filter((t) =>
                    matchesQuery([t.key, t.name, t.description].filter(Boolean).join(" "), q)
                ),
            }))
            .filter((section) => section.terms.length > 0)
    }, [glossarySearch])

    const classSectionIds = (classId: string) => ({
        passives: `lib-class-${tocSlug(classId)}-passives`,
        deities: `lib-class-${tocSlug(classId)}-deities`,
        mounts: `lib-class-${tocSlug(classId)}-mounts`,
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
                        <TabsList className="w-full sm:w-auto sm:flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1 h-auto min-h-10 py-1">
                            <TabsTrigger value="classes" className="gap-2">
                                <Swords className="w-4 h-4" />
                                Classes
                            </TabsTrigger>
                            <TabsTrigger value="races" className="gap-2">
                                <Users className="w-4 h-4" />
                                Races
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
                            <TabsTrigger value="glossary" className="gap-2">
                                <ScrollText className="w-4 h-4" />
                                Glossary
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
                                                        {Array.isArray(selectedClass.mounts) && selectedClass.mounts.length > 0 ? (
                                                            <button
                                                                type="button"
                                                                className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                                                                onClick={() =>
                                                                    libraryScrollTo(classSectionIds(effectiveClassId).mounts)
                                                                }
                                                            >
                                                                Mounts
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
                                    {mainTab === "races" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Races
                                            </p>
                                            <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
                                                {filteredRaces.map((race) => (
                                                    <button
                                                        key={race.id}
                                                        type="button"
                                                        onClick={() => libraryScrollTo(`lib-race-${tocSlug(race.id)}`)}
                                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{race.name ?? race.id}</span>
                                                    </button>
                                                ))}
                                            </div>
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
                                            <div className="space-y-2 px-2 pb-2">
                                                <Label htmlFor="lib-equip-search-toc" className="sr-only">
                                                    Search equipment
                                                </Label>
                                                <Input
                                                    id="lib-equip-search-toc"
                                                    placeholder="Search equipment…"
                                                    value={equipmentSearch}
                                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                                <CatalogSortSelect
                                                    id="lib-equip-sort-toc"
                                                    value={equipmentSort}
                                                    onChange={setEquipmentSort}
                                                    hideLabel
                                                    className="space-y-0"
                                                />
                                            </div>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                By rarity
                                            </p>
                                            <div className="px-2 pb-1">
                                                <EquipmentRankMultiSelect
                                                    value={equipmentRankFilters}
                                                    onChange={setEquipmentRankFilters}
                                                    options={itemRankFilterOptions}
                                                    counts={equipmentRankCounts}
                                                    className="h-8 w-full text-xs"
                                                />
                                            </div>
                                            <p className="px-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                By type
                                            </p>
                                            <div className="space-y-0.5">
                                                {EQUIPMENT_TYPE_ORDER.map((type) => {
                                                    if (type === ACCESSORY_EQUIPMENT_TYPE) {
                                                        if (accessoryEquipmentRows.length === 0) return null
                                                        const accessorySectionId = `lib-equip-type-${tocSlug(type)}`
                                                        return (
                                                            <div key={type}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setAccessoriesNavExpanded((expanded) => !expanded)
                                                                        libraryScrollTo(accessorySectionId)
                                                                    }}
                                                                    className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                                >
                                                                    {accessoriesNavExpanded ? (
                                                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                                    ) : (
                                                                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                                    )}
                                                                    <span className="font-medium">
                                                                        {formatEquipmentLibraryTypeLabel(type)}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        {" "}
                                                                        ({accessoryEquipmentRows.length})
                                                                    </span>
                                                                </button>
                                                                {accessoriesNavExpanded ? (
                                                                    <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setLibraryAccessorySlotFilter("all")
                                                                                libraryScrollTo(accessorySectionId)
                                                                            }}
                                                                            className={cn(
                                                                                "w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted",
                                                                                libraryAccessorySlotFilter === "all" &&
                                                                                    "bg-muted font-semibold",
                                                                            )}
                                                                        >
                                                                            <span className="font-medium">All slots</span>
                                                                            <span className="text-muted-foreground">
                                                                                {" "}
                                                                                ({accessorySlotCounts.get("all") ?? 0})
                                                                            </span>
                                                                        </button>
                                                                        {ACCESSORY_SLOT_FILTER_OPTIONS.map(({ id, label }) => (
                                                                            <button
                                                                                key={id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setLibraryAccessorySlotFilter(id)
                                                                                    libraryScrollTo(accessorySectionId)
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full rounded-md px-2 py-1 text-left text-xs hover:bg-muted",
                                                                                    libraryAccessorySlotFilter === id &&
                                                                                        "bg-muted font-semibold",
                                                                                )}
                                                                            >
                                                                                <span className="font-medium">{label}</span>
                                                                                <span className="text-muted-foreground">
                                                                                    {" "}
                                                                                    ({accessorySlotCounts.get(id) ?? 0})
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        )
                                                    }
                                                    const section = equipmentByType.find((entry) => entry.type === type)
                                                    if (!section) return null
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() =>
                                                                libraryScrollTo(`lib-equip-type-${tocSlug(type)}`)
                                                            }
                                                            className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                        >
                                                            <span className="font-medium">
                                                                {formatEquipmentLibraryTypeLabel(type)}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {" "}
                                                                ({section.rows.length})
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                                {equipmentByType
                                                    .filter(
                                                        ({ type }) =>
                                                            !EQUIPMENT_TYPE_ORDER.includes(
                                                                type as (typeof EQUIPMENT_TYPE_ORDER)[number],
                                                            ),
                                                    )
                                                    .map(({ type, rows }) => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() =>
                                                                libraryScrollTo(`lib-equip-type-${tocSlug(type)}`)
                                                            }
                                                            className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                        >
                                                            <span className="font-medium">
                                                                {formatEquipmentLibraryTypeLabel(type)}
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {" "}
                                                                ({rows.length})
                                                            </span>
                                                        </button>
                                                    ))}
                                            </div>
                                        </>
                                    ) : null}
                                    {mainTab === "glossary" ? (
                                        <>
                                            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Sections
                                            </p>
                                            <div className="space-y-0.5">
                                                {glossarySections.map((section) => (
                                                    <button
                                                        key={section.sectionKey}
                                                        type="button"
                                                        onClick={() =>
                                                            libraryScrollTo(
                                                                `lib-glossary-${tocSlug(section.sectionKey)}`
                                                            )
                                                        }
                                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{section.label}</span>
                                                        <span className="text-muted-foreground">
                                                            {" "}
                                                            ({section.terms.length})
                                                        </span>
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
                                        <ClassLibraryGrantsSummary classData={selectedClass} />
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
                                                            <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                                                                {passive.effects.map((eff: Record<string, unknown>, i: number) => (
                                                                    <li key={i}>
                                                                        {formatTraitEffectChoiceLabel(eff as any, RULES)}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : null}
                                                        {passive.powerRoll ? (
                                                            <TraitPowerRollCollapsible
                                                                roll={passive.powerRoll as PowerRoll}
                                                                attributes={DEMO_ATTRIBUTES}
                                                                currentWeapon={previewWeapon}
                                                                offhandWeapon={null}
                                                                powerRollDisplayMode="formula"
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

                                    {Array.isArray(selectedClass.mounts) && selectedClass.mounts.length > 0 ? (
                                        <section
                                            id={classSectionIds(effectiveClassId).mounts}
                                            className="scroll-mt-36 space-y-3"
                                        >
                                            <h3 className="text-lg font-bold border-b border-border pb-1">Mounts</h3>
                                            <div className="space-y-4">
                                                {selectedClass.mounts.map((m: Record<string, any>) => (
                                                    <div
                                                        key={m.id}
                                                        className="rounded-lg border border-border p-4 space-y-2 bg-muted/10"
                                                    >
                                                        <div className="font-bold">
                                                            {m.name}{" "}
                                                            <span className="text-muted-foreground font-mono text-sm font-normal">
                                                                ({m.id})
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                            {m.description}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 text-xs">
                                                            {m.speed != null ? (
                                                                <Badge variant="outline">Speed {m.speed}</Badge>
                                                            ) : null}
                                                            {m.size != null ? (
                                                                <Badge variant="outline">Size {m.size}</Badge>
                                                            ) : null}
                                                            {m.passengers != null ? (
                                                                <Badge variant="outline">Passengers {m.passengers}</Badge>
                                                            ) : null}
                                                            {m.bonusStats?.defense != null ? (
                                                                <Badge variant="secondary">+{m.bonusStats.defense} Def (mounted)</Badge>
                                                            ) : null}
                                                            {m.bonusStats?.stability != null ? (
                                                                <Badge variant="secondary">+{m.bonusStats.stability} Stability (mounted)</Badge>
                                                            ) : null}
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
                                                            {wrapper.mountTypeId ? (
                                                                <Badge variant="default">Mount: {wrapper.mountTypeId}</Badge>
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
                                                            powerRollDisplayMode="formula"
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
                                                                powerRollDisplayMode="formula"
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

                <TabsContent value="races" className="mt-0 space-y-6">
                    <div className="space-y-1.5 max-w-md">
                        <Label htmlFor="lib-race-search">Search races</Label>
                        <Input
                            id="lib-race-search"
                            placeholder="Name, description, or trait…"
                            value={raceSearch}
                            onChange={(e) => setRaceSearch(e.target.value)}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Selectable racial traits cost points in character creation (typically 3 total); innate traits are
                        automatic.
                    </p>
                    <div className="space-y-12">
                        {filteredRaces.length === 0 ? (
                            <p className="text-muted-foreground">No races match your search.</p>
                        ) : (
                            filteredRaces.map((race) => {
                                const innate = sortedRacePassives(race.passives, "innate")
                                const selectable = sortedRacePassives(race.passives, "selectable")
                                return (
                                    <section
                                        key={race.id}
                                        id={`lib-race-${tocSlug(race.id)}`}
                                        className="scroll-mt-36 space-y-4"
                                    >
                                        <div>
                                            <h2 className="text-2xl font-black tracking-tight">{race.name ?? race.id}</h2>
                                            <Badge variant="outline" className="mt-2 font-mono text-[10px]">
                                                {race.id}
                                            </Badge>
                                            {typeof race.description === "string" && race.description.trim() ? (
                                                <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line leading-relaxed">
                                                    {race.description}
                                                </p>
                                            ) : null}
                                        </div>
                                        {innate.length > 0 ? (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-bold border-b border-border pb-1">
                                                    Innate traits
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    {innate.map(({ pid, passive }) => (
                                                        <LibraryRacePassiveCard
                                                            key={pid}
                                                            pid={pid}
                                                            passive={passive}
                                                            previewWeapon={previewWeapon}
                                                            collapseAllSignal={collapseAllSignal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                        {selectable.length > 0 ? (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-bold border-b border-border pb-1">
                                                    Selectable traits
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    {selectable.map(({ pid, passive }) => (
                                                        <LibraryRacePassiveCard
                                                            key={pid}
                                                            pid={pid}
                                                            passive={passive}
                                                            previewWeapon={previewWeapon}
                                                            collapseAllSignal={collapseAllSignal}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </section>
                                )
                            })
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
                                                    powerRollDisplayMode="formula"
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
                                                                            powerRollDisplayMode="formula"
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
                                                    powerRollDisplayMode="formula"
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
                    <div className="space-y-8">
                        {equipmentByType.map(({ type, rows }) => (
                            <section
                                key={type}
                                id={`lib-equip-type-${tocSlug(type)}`}
                                className="scroll-mt-36 space-y-3"
                            >
                                <h3 className="text-lg font-bold border-b border-border pb-1">
                                    {formatEquipmentLibraryTypeLabel(type)}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
                                    {rows.map(({ id, def }) => {
                                        const selfWeapon = itemDefToPreviewWeapon(id, def)
                                        const cardWeapon = selfWeapon ?? previewWeapon
                                        const actionIds: string[] = Array.isArray(def.actionIDs) ? def.actionIDs : []
                                        const hydratedItemCards = actionIds
                                            .map((aid) => hydrateActionCardById(aid, RULES))
                                            .filter((ac): ac is NonNullable<typeof ac> => ac != null)
                                        const itemActionCards = hydratedItemCards.filter(
                                            (ac) => !isReactionActionCardType(ac.type)
                                        )
                                        const itemReactionCards = hydratedItemCards.filter((ac) =>
                                            isReactionActionCardType(ac.type)
                                        )
                                        const itemRankClass = getItemNameClass({ rank: def.rank }, RULES)
                                        const itemRankLabel = getItemRankLabel({ rank: def.rank }, RULES)
                                        const libraryType = resolveEquipmentLibraryType(id, def)
                                        const accessoryItem = isAccessoryCatalogItem(id, def)
                                        return (
                                            <div
                                                key={id}
                                                className="rounded-lg border border-border p-4 space-y-3 bg-card/30 min-w-0"
                                            >
                                                <div className="flex flex-wrap gap-2 items-baseline">
                                                    <span className={cn("font-bold text-lg", itemRankClass)}>
                                                        {def.name ?? id}
                                                    </span>
                                                    {itemRankLabel ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn("text-[10px]", itemRankClass)}
                                                        >
                                                            {itemRankLabel}
                                                        </Badge>
                                                    ) : null}
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {id}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {formatEquipmentLibraryTypeLabel(libraryType)}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                    {def.description}
                                                </p>
                                                {Array.isArray(def.tags) && def.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {def.tags.map((t: string) => (
                                                            <EffectGlossaryTag key={t} tag={t} />
                                                        ))}
                                                    </div>
                                                ) : null}
                                                <ItemRequirementsDisplay def={def} rules={RULES} />
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-medium text-foreground">Zenny</span>{" "}
                                                    {def.value ?? "—"}
                                                </p>
                                                <LibraryItemChargePips
                                                    itemId={id}
                                                    def={def}
                                                    attributes={DEMO_ATTRIBUTES}
                                                />
                                                {accessoryItem ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        <span className="font-medium text-foreground">Slots</span>{" "}
                                                        {formatAccessoryAllowedSlotsLabel(def.allowedSlots)}
                                                    </p>
                                                ) : null}
                                                {def.type === "weapon" ? (
                                                    <div className="text-sm grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
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
                                                        <span className="sm:col-span-2">
                                                            {formatWeaponAttribLabel(def.attributes)}
                                                        </span>
                                                    </div>
                                                ) : null}
                                                {def.type === "armor" ? (
                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                        <div>
                                                            <span className="font-medium text-foreground">
                                                                Defense
                                                            </span>{" "}
                                                            {formatArmorDefenseValue(
                                                                def.defense as {
                                                                    value?: number
                                                                    attribute?: string
                                                                    attrMax?: number
                                                                },
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-foreground">
                                                                Stability
                                                            </span>{" "}
                                                            {def.stability ?? "—"}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {def.type === "shield" ? (
                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                        <div>
                                                            <span className="font-medium text-foreground">
                                                                Defense
                                                            </span>{" "}
                                                            {def.defense ?? "—"}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-foreground">
                                                                Stability
                                                            </span>{" "}
                                                            {def.stability ?? "—"}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {def.traits && def.traits.length > 0 ? (
                                                    (() => {
                                                        const traitBlocks = buildItemInventoryTraitBlocks(
                                                            { traits: def.traits } as InventoryItem,
                                                            RULES
                                                        )
                                                        if (traitBlocks.length === 0) {
                                                            return (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Trait entries could not be resolved for preview.
                                                                </p>
                                                            )
                                                        }
                                                        return (
                                                            <div className="space-y-3 border-t border-border/40 pt-2">
                                                                <span className="text-sm font-semibold">Item traits</span>
                                                                {traitBlocks.map((block) => (
                                                                    <div
                                                                        key={block.traitId}
                                                                        className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-3"
                                                                    >
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-foreground">
                                                                                {block.name}
                                                                            </p>
                                                                            {block.minLevel != null ? (
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    Min. level {block.minLevel}
                                                                                </p>
                                                                            ) : null}
                                                                            {block.description ? (
                                                                                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                                                                                    {block.description}
                                                                                </p>
                                                                            ) : null}
                                                                        </div>
                                                                        {block.effects && block.effects.length > 0 ? (
                                                                            <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                                                                                {block.effects
                                                                                    .filter(
                                                                                        (eff) =>
                                                                                            !(
                                                                                                typeof eff ===
                                                                                                    "object" &&
                                                                                                eff != null &&
                                                                                                (eff as { type?: string })
                                                                                                    .type === "GrantActionCard"
                                                                                            )
                                                                                    )
                                                                                    .map((eff, i) => (
                                                                                        <li key={i}>
                                                                                            {formatTraitEffectChoiceLabel(
                                                                                                eff as any,
                                                                                                RULES
                                                                                            )}
                                                                                        </li>
                                                                                    ))}
                                                                            </ul>
                                                                        ) : null}
                                                                        {block.grantedActionCards.length > 0 ? (
                                                                            <div className="space-y-2 pt-1">
                                                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                                                                    Granted cards
                                                                                </p>
                                                                                {block.grantedActionCards.map(
                                                                                    (action) => (
                                                                                        <ActionCardComponent
                                                                                            key={`${id}-${block.traitId}-${action.id}`}
                                                                                            action={action}
                                                                                            attributes={DEMO_ATTRIBUTES}
                                                                                            currentWeapon={cardWeapon}
                                                                                            offhandWeapon={null}
                                                                                            forceCollapsed={false}
                                                                                            powerRollDisplayMode="formula"
                                                                                            defaultPowerRollExpanded={false}
                                                                                            collapseAllSignal={
                                                                                                collapseAllSignal
                                                                                            }
                                                                                        />
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )
                                                    })()
                                                ) : null}
                                                {def.powerRoll ? (
                                                    <TraitPowerRollCollapsible
                                                        roll={def.powerRoll as PowerRoll}
                                                        attributes={DEMO_ATTRIBUTES}
                                                        currentWeapon={cardWeapon}
                                                        offhandWeapon={null}
                                                        powerRollDisplayMode="formula"
                                                        defaultExpanded={false}
                                                        collapseAllSignal={collapseAllSignal}
                                                    />
                                                ) : null}
                                                {itemActionCards.length > 0 ? (
                                                    <div className="space-y-3 pt-2 border-t border-border/60">
                                                        <span className="text-sm font-semibold">Actions from item</span>
                                                        {itemActionCards.map((ac) => {
                                                            const itemChargeCost = getActionItemChargeCost(ac)
                                                            const showItemCharges =
                                                                itemChargeCost != null &&
                                                                itemHasChargeTracking(
                                                                    def as ChargeDefinition
                                                                )
                                                            const itemChargeMax = showItemCharges
                                                                ? resolveMaxCharges(
                                                                      def as ChargeDefinition,
                                                                      DEMO_ATTRIBUTES
                                                                  )
                                                                : 0
                                                            return (
                                                                <ActionCardComponent
                                                                    key={`${id}-${ac.id}`}
                                                                    action={ac}
                                                                    attributes={DEMO_ATTRIBUTES}
                                                                    currentWeapon={cardWeapon}
                                                                    offhandWeapon={null}
                                                                    forceCollapsed={false}
                                                                    powerRollDisplayMode="formula"
                                                                    defaultPowerRollExpanded={false}
                                                                    collapseAllSignal={collapseAllSignal}
                                                                    itemChargeCost={
                                                                        showItemCharges
                                                                            ? itemChargeCost
                                                                            : undefined
                                                                    }
                                                                    itemChargeMax={
                                                                        showItemCharges
                                                                            ? itemChargeMax
                                                                            : undefined
                                                                    }
                                                                    itemChargeCurrent={
                                                                        showItemCharges
                                                                            ? itemChargeMax
                                                                            : undefined
                                                                    }
                                                                />
                                                            )
                                                        })}
                                                    </div>
                                                ) : null}
                                                {itemReactionCards.length > 0 ? (
                                                    <div className="space-y-3 pt-2 border-t border-border/60">
                                                        <span className="text-sm font-semibold">Reactions from item</span>
                                                        {itemReactionCards.map((rx) => (
                                                            <div
                                                                key={`${id}-${rx.id}`}
                                                                className="rounded-lg border border-border p-4 space-y-3 bg-card/40"
                                                            >
                                                                <div className="flex flex-wrap gap-2 items-center">
                                                                    <span className="font-semibold">{rx.name}</span>
                                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                                        {rx.id}
                                                                    </Badge>
                                                                </div>
                                                                {rx.trigger ? (
                                                                    <>
                                                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                                            Trigger
                                                                        </p>
                                                                        <p className="text-sm">{rx.trigger}</p>
                                                                    </>
                                                                ) : null}
                                                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                                    {rx.description}
                                                                </p>
                                                                <ActionCardComponent
                                                                    action={rx}
                                                                    attributes={DEMO_ATTRIBUTES}
                                                                    currentWeapon={cardWeapon}
                                                                    offhandWeapon={null}
                                                                    forceCollapsed={false}
                                                                    powerRollDisplayMode="formula"
                                                                    defaultPowerRollExpanded={false}
                                                                    collapseAllSignal={collapseAllSignal}
                                                                />
                                                            </div>
                                                        ))}
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

                <TabsContent value="glossary" className="mt-0 space-y-6">
                    <div className="space-y-1.5 max-w-md">
                        <Label htmlFor="lib-glossary-search">Search glossary</Label>
                        <Input
                            id="lib-glossary-search"
                            placeholder="Term name, key, or description…"
                            value={glossarySearch}
                            onChange={(e) => setGlossarySearch(e.target.value)}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Definitions from{" "}
                        <span className="font-mono text-xs">rules.glossary.effectDictionary</span> — the same
                        entries used when you click tags on action cards and equipment.
                    </p>
                    <div className="space-y-10">
                        {glossarySections.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No glossary terms match this search.</p>
                        ) : (
                            glossarySections.map((section) => (
                                <section
                                    key={section.sectionKey}
                                    id={`lib-glossary-${tocSlug(section.sectionKey)}`}
                                    className="scroll-mt-36 space-y-3"
                                >
                                    <h2 className="border-b border-border pb-1 text-lg font-bold">{section.label}</h2>
                                    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4">
                                        {section.terms.map((term) => (
                                            <div
                                                key={`${section.sectionKey}-${term.key}`}
                                                className="min-w-0 space-y-2 rounded-lg border border-border bg-card/40 p-4"
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-lg font-semibold">{term.name}</span>
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {term.key}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                    {term.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
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
