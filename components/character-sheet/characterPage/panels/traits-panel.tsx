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
import { rulesData } from "@/lib/rules-data"

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
    onUpdateTraitCharges?: (traitId: string, newCount: number) => void
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

export function TraitsPanel({
    traits,
    attributes,
    activeWeapon = null,
    offhandWeapon = null,
    onUpdateTraitCharges,
}: TraitsPanelProps) {
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
                {filteredTraits.map((trait) => {
                    const chargeDef = hasChargeTracking(trait)
                        ? trait
                        : lookupChargeDefinition("trait", trait.uid, rulesData as RulesWithCharges)
                    const maxCharges = resolveMaxCharges(chargeDef, attributes)
                    const currentCharges = resolveCurrentCharges(trait.charges, maxCharges)
                    const showChargePips = maxCharges > 0 && Boolean(onUpdateTraitCharges)

                    return (
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
                        {showChargePips ? (
                            <div className="mb-3">
                                <ChargePips
                                    maxCharges={maxCharges}
                                    currentCharges={currentCharges}
                                    label={
                                        chargeDef?.fixedMaxCharges != null
                                            ? "Charges"
                                            : chargeDef?.chargeStat
                                              ? `${chargeDef.chargeStat} Charges`
                                              : "Charges"
                                    }
                                    onChange={(n) => onUpdateTraitCharges?.(trait.uid, n)}
                                />
                            </div>
                        ) : null}
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
                    )
                })}

                {filteredTraits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No traits found</p>
                )}
            </div>
        </div>
    )
}
