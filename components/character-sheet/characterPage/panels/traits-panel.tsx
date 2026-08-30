"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Filter, Sparkles } from "lucide-react"
import type { Trait } from "@/lib/rules"
import type { InventoryItem } from "@/lib/equipment-data"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import { ChargePips } from "@/components/character-sheet/charge-pips"
import {
    hasChargeTracking,
    lookupChargeDefinition,
    resolveCurrentCharges,
    resolveMaxCharges,
    type RulesWithCharges,
} from "@/logic/traits/charge-helpers"
import {
    itemChargeRulesFromCatalog,
    itemHasChargeTracking,
    type ItemChargeRules,
} from "@/logic/equipment/item-charges"
import { rulesData } from "@/lib/rules-data"

type TraitWithItem = Trait & { itemId?: string }

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
    /** Hydrated inventory — used for equipment-trait charge state. */
    inventory?: InventoryItem[]
    onUpdateTraitCharges?: (traitId: string, newCount: number) => void
    /** Prefer this for equipment-sourced traits (charges live on the item). */
    onUpdateItemCharges?: (itemUid: string, newCount: number) => void
}

type TraitSource = "all" | "racial" | "feat" | "class" | "background" | "equipment" | "other"

const sourceColors: Record<string, string> = {
    racial: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50",
    feat: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
    class: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50",
    background: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50",
    equipment: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700/50",
    other: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/50",
}

const sourceFilterColors: Record<string, string> = {
    all: "bg-primary text-primary-foreground",
    racial: "bg-emerald-600 text-white",
    feat: "bg-amber-600 text-white",
    class: "bg-blue-600 text-white",
    background: "bg-violet-600 text-white",
    equipment: "bg-orange-600 text-white",
    other: "bg-slate-600 text-white",
}

function resolveTraitChargeState(
    trait: TraitWithItem,
    inventory: InventoryItem[] | undefined,
    attributes: TraitsPanelProps["attributes"],
) {
    const item =
        trait.itemId && inventory?.length
            ? inventory.find((inv) => inv.uid === trait.itemId)
            : undefined
    const catalogDef = item
        ? itemChargeRulesFromCatalog(item.id, rulesData as RulesWithCharges)
        : undefined
    const itemDef: ItemChargeRules | undefined =
        catalogDef ??
        (item && itemHasChargeTracking(item as ItemChargeRules)
            ? (item as ItemChargeRules)
            : undefined)

    const traitDef = hasChargeTracking(trait)
        ? trait
        : lookupChargeDefinition("trait", trait.uid || trait.id, rulesData as RulesWithCharges)

    const useItem = Boolean(item && trait.itemId && (itemDef || traitDef))
    const chargeDef = useItem ? itemDef ?? traitDef : traitDef
    const maxCharges = resolveMaxCharges(chargeDef, attributes)

    let currentCharges = resolveCurrentCharges(trait.charges, maxCharges)
    if (useItem && item) {
        if (item.charges && typeof item.charges === "object") {
            currentCharges = resolveCurrentCharges(item.charges.current, maxCharges)
        } else if (typeof (item as { charges?: number }).charges === "number") {
            currentCharges = resolveCurrentCharges(
                (item as { charges?: number }).charges,
                maxCharges,
            )
        }
    }

    return {
        maxCharges,
        currentCharges,
        itemUid: useItem ? item?.uid : undefined,
        chargeDef,
    }
}

export function TraitsPanel({
    traits,
    attributes,
    activeWeapon = null,
    offhandWeapon = null,
    inventory,
    onUpdateTraitCharges,
    onUpdateItemCharges,
}: TraitsPanelProps) {
    const [filter, setFilter] = useState<TraitSource>("all")

    const availableSources = ["all", ...Array.from(new Set(traits.map((t) => t.source)))] as TraitSource[]

    const filteredTraits = filter === "all" ? traits : traits.filter((t) => t.source === filter)

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Traits
                <span className="text-sm text-muted-foreground font-normal">({traits.length})</span>
            </h3>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                {availableSources.map((source) => (
                    <button
                        key={source}
                        type="button"
                        onClick={() => setFilter(source)}
                        className={cn(
                            "text-xs px-2.5 py-1 rounded-md font-medium capitalize transition-colors",
                            filter === source
                                ? (sourceFilterColors[source] ?? sourceFilterColors.other)
                                : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                    >
                        {source}
                    </button>
                ))}
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {filteredTraits.map((trait) => {
                    const traitWithItem = trait as TraitWithItem
                    const { maxCharges, currentCharges, itemUid, chargeDef } = resolveTraitChargeState(
                        traitWithItem,
                        inventory,
                        attributes,
                    )
                    const canEditItem = Boolean(itemUid && onUpdateItemCharges)
                    const canEditTrait = Boolean(!itemUid && onUpdateTraitCharges)
                    const showChargePips = maxCharges > 0
                    const canEditCharges = canEditItem || canEditTrait

                    return (
                        <div
                            key={trait.uid}
                            className="p-3 rounded-lg bg-muted/10 border border-border/50"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-foreground text-base">
                                    {trait.name}
                                </span>
                                <span
                                    className={cn(
                                        "text-xs px-2 py-0.5 rounded border uppercase font-medium",
                                        sourceColors[trait.source] ?? sourceColors.other,
                                    )}
                                >
                                    {trait.source}
                                </span>
                            </div>
                            {showChargePips ? (
                                <div className="mb-3">
                                    <ChargePips
                                        maxCharges={maxCharges}
                                        currentCharges={currentCharges}
                                        isReadOnly={!canEditCharges}
                                        label={
                                            chargeDef?.fixedMaxCharges != null
                                                ? "Charges"
                                                : chargeDef?.chargeStat
                                                  ? `${chargeDef.chargeStat} Charges`
                                                  : "Charges"
                                        }
                                        onChange={(n) => {
                                            if (itemUid && onUpdateItemCharges) {
                                                onUpdateItemCharges(itemUid, n)
                                                return
                                            }
                                            onUpdateTraitCharges?.(trait.uid, n)
                                        }}
                                    />
                                </div>
                            ) : null}
                            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                                {trait.description}
                            </p>
                            {trait.powerRoll && (
                                <TraitPowerRollCollapsible
                                    roll={trait.powerRoll}
                                    attributes={attributes}
                                    currentWeapon={activeWeapon}
                                    offhandWeapon={offhandWeapon}
                                />
                            )}
                        </div>
                    )
                })}

                {filteredTraits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No traits found</p>
                )}
            </div>
        </div>
    )
}
