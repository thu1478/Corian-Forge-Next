"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { InventoryItem } from "@/lib/equipment-data"
import { PotencyEffect, PowerRoll } from "@/lib/rules"
import { getAttributeModifier } from "@/lib/character-data"
import { potencyStrengthDisplayLabel, potencyStrengthToModifier } from "@/lib/potency-strength"
import { getPowerRollPotencyBadgeAndDuration } from "@/lib/potency-display"
import type { PowerRollTierAmountSuffix } from "@/lib/power-roll-combat-bonuses"
import { findPotencyEffectGlossaryEntry } from "@/lib/glossary-lookup"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    getEffectiveWeaponDamage,
    parseWeaponBaseDamage,
    type WeaponDamageContext,
} from "@/lib/weapon-utils"

export type PowerRollDisplayMode = "simple" | "formula"

export type PowerRollAttributes = {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
}

const ATTRIBUTE_ABBREVIATIONS: Record<keyof PowerRollAttributes, string> = {
    might: "M",
    dexterity: "D",
    reason: "R",
    willpower: "W",
    presence: "P",
}

function formatAttributeAbbreviationList(stats: string[] | undefined): string | null {
    if (!stats?.length) return null
    return stats.map((stat) => ATTRIBUTE_ABBREVIATIONS[stat as keyof PowerRollAttributes] ?? stat[0]?.toUpperCase() ?? stat).join(" or ")
}

export function PowerRollTierRow({
    label,
    roll,
    tier,
    badgeStyle,
    attributes,
    weaponForPowerRoll,
    powerRollDisplayMode,
    flatDamageBonus = 0,
    shieldSubstituteWeaponDamage,
    tierAmountSuffix = "DMG",
    weaponDamageContext,
}: {
    label: string
    roll: PowerRoll
    tier: number
    badgeStyle: string
    attributes: PowerRollAttributes
    /** Weapon whose damage applies for +Wpn tiers (already resolved for active/offhand + melee/ranged). */
    weaponForPowerRoll?: InventoryItem | null
    powerRollDisplayMode: PowerRollDisplayMode
    /** Added to tier total (implement / shield-attack card bonuses). */
    flatDamageBonus?: number
    /** When +Wpn and no normal weapon, Shield Master uses this value as weapon damage. */
    shieldSubstituteWeaponDamage?: number | null
    /** Suffix for the tier amount line: DMG, HP (heal), or Barrier. */
    tierAmountSuffix?: PowerRollTierAmountSuffix
    /** When set, Dueling Stance (+1) and similar weapon damage bonuses apply to +Wpn tiers. */
    weaponDamageContext?: WeaponDamageContext
}) {
    const tierDmgKey = `tier${tier}Dmg` as keyof PowerRoll
    const tierDmgRaw = roll[tierDmgKey]
    const hasExplicitNumericTierDmg =
        typeof tierDmgRaw === "number" && Number.isFinite(tierDmgRaw)
    const baseDmg = hasExplicitNumericTierDmg ? tierDmgRaw : Number(tierDmgRaw) || 0
    const hasWpn = (roll[`tier${tier}Wpn` as keyof PowerRoll] as boolean) || false
    const potency = roll[`tier${tier}Effect` as keyof PowerRoll] as PotencyEffect | undefined

    let weaponBonus = 0
    if (hasWpn && weaponForPowerRoll?.type === "weapon") {
        weaponBonus = weaponDamageContext
            ? getEffectiveWeaponDamage(weaponForPowerRoll, weaponDamageContext)
            : parseWeaponBaseDamage(weaponForPowerRoll)
    } else if (hasWpn && shieldSubstituteWeaponDamage != null && shieldSubstituteWeaponDamage > 0) {
        weaponBonus = shieldSubstituteWeaponDamage
    }

    const flat = Math.max(0, Math.floor(Number(flatDamageBonus)) || 0)
    const finalDmg = (hasWpn ? weaponBonus : 0) + baseDmg + flat

    let potencyThreshold: number | null = null
    let maxSrcMod: number | null = null
    let potencyStrMod: number | null = null
    let potencyStrengthLabel: string | null = null
    /** When set, threshold base comes from `fixedSrcVal` (e.g. item) instead of max of `srcStats` mods. */
    let potencySrcIsFixed = false

    if (potency && potency.type !== "Special") {
        const fixedRaw = potency.fixedSrcVal
        const hasFixedSrc = typeof fixedRaw === "number" && Number.isFinite(fixedRaw)
        const srcStats = potency.srcStats
        const hasSrcStats = Array.isArray(srcStats) && srcStats.length > 0

        if (hasFixedSrc) {
            potencySrcIsFixed = true
            maxSrcMod = fixedRaw
            potencyStrMod = potencyStrengthToModifier(potency.strength)
            potencyStrengthLabel = potencyStrengthDisplayLabel(potency.strength)
            potencyThreshold = maxSrcMod + (potencyStrMod ?? 0)
        } else if (hasSrcStats) {
            const modifiers = srcStats.map((stat) =>
                getAttributeModifier(attributes[stat as keyof typeof attributes])
            )
            maxSrcMod = Math.max(...modifiers)
            potencyStrMod = potencyStrengthToModifier(potency.strength)
            potencyStrengthLabel = potencyStrengthDisplayLabel(potency.strength)
            potencyThreshold = maxSrcMod + (potencyStrMod ?? 0)
        }
    }

    const showPotencyDifficulty =
        potencyThreshold !== null &&
        potency &&
        potency.type !== "Special" &&
        (potencySrcIsFixed || Boolean(potency.targetStats && potency.targetStats.length > 0))

    /** Show damage line when +Wpn, total is positive, or tier damage is explicitly set (including 0). */
    const shouldShowDmg = hasWpn || finalDmg > 0 || hasExplicitNumericTierDmg || flat > 0

    const suffixLabel = tierAmountSuffix === "Barrier" ? "Barrier" : tierAmountSuffix === "HP" ? "HP" : "DMG"

    const formulaDmgParts = (): string[] => {
        const parts: string[] = []
        if (hasExplicitNumericTierDmg || baseDmg > 0 || (hasWpn && weaponBonus > 0)) {
            parts.push(String(baseDmg))
        }
        if (hasWpn && weaponBonus > 0) {
            parts.push(String(weaponBonus))
        }
        if (flat > 0) parts.push(String(flat))
        return parts
    }

    const useFormulaBreakdown =
        powerRollDisplayMode === "formula" &&
        (hasWpn || flat > 0 || hasExplicitNumericTierDmg)

    const dmgDisplay = useFormulaBreakdown ? (
            <>
                {(() => {
                    const parts = formulaDmgParts()
                    return parts.length > 0 ? parts.join(" + ") : String(finalDmg)
                })()}{" "}
                <span className="text-[10px] opacity-40 uppercase ml-0.5">{suffixLabel}</span>
            </>
        ) : (
            <>
                {finalDmg}{" "}
                <span className="text-[10px] opacity-40 uppercase ml-0.5">{suffixLabel}</span>
            </>
        )

    const { badge: potencyBadge, duration: potencyDurationLabel } = useMemo(
        () => (potency ? getPowerRollPotencyBadgeAndDuration(potency) : { badge: "", duration: null as string | null }),
        [potency]
    )

    const potencyGlossaryEntry = useMemo(
        () => (potency ? findPotencyEffectGlossaryEntry(potency) : null),
        [potency]
    )

    const potencyPopoverTitle = potencyGlossaryEntry?.name ?? potencyBadge
    const potencyPopoverBody =
        potencyGlossaryEntry?.description?.trim() ||
        "This potency effect is not defined in rules.glossary.effectDictionary yet."
    const potencySourceFormula =
        potency && potency.type !== "Special"
            ? potencySrcIsFixed
                ? "fixed"
                : formatAttributeAbbreviationList(potency.srcStats)
            : null
    const potencyTargetFormula =
        potency && potency.type !== "Special" ? formatAttributeAbbreviationList(potency.targetStats) : null
    const showFormulaPotency = Boolean(showPotencyDifficulty && potency && powerRollDisplayMode === "formula")

    return (
        <div className="flex flex-col rounded-lg bg-muted/50 dark:bg-black/30 border border-border dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-foreground/[0.03] border-b border-border/30">
                <span className="text-xs font-black opacity-50 italic uppercase tracking-tighter">{label}</span>
                {shouldShowDmg && (
                    <span className="font-mono font-bold text-foreground text-lg leading-none">{dmgDisplay}</span>
                )}
            </div>

            {potency && (
                <div className="px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {showPotencyDifficulty && potency && !showFormulaPotency ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {potency.targetStats && potency.targetStats.length > 0 ? (
                                <span className="text-sm font-mono font-black text-muted-foreground uppercase tracking-tight">
                                    {potency.targetStats.map((s) => s[0]).join("/")}
                                </span>
                            ) : null}
                            <span className="text-base font-black text-primary flex items-center gap-1 tabular-nums">
                                <span className="text-xs opacity-50">&lt;</span>
                                {potencyThreshold}
                            </span>
                        </div>
                    ) : null}

                    {showFormulaPotency ? (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-mono font-black">
                            {potencyTargetFormula ? (
                                <span className="text-muted-foreground">{potencyTargetFormula}</span>
                            ) : null}
                            <span className="text-primary">&lt;</span>
                            {potencySourceFormula || potencyStrengthLabel ? (
                                <span className="text-primary">
                                    [{[potencySourceFormula, potencyStrengthLabel].filter(Boolean).join(" ")}]
                                </span>
                            ) : null}
                            {potencyBadge ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            className="rounded-sm text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            {potencyBadge}
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
                                                {potencyPopoverTitle}
                                            </p>
                                            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                                {potencyPopoverBody}
                                            </p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : null}
                            {potencyDurationLabel ? (
                                <span className="text-muted-foreground">{potencyDurationLabel}</span>
                            ) : null}
                        </div>
                    ) : potencyBadge ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "text-sm px-2.5 py-1 rounded font-extrabold uppercase tracking-tight leading-none shadow-sm",
                                        badgeStyle,
                                        "cursor-pointer transition-[filter,box-shadow] border border-transparent",
                                        "hover:brightness-[0.97] dark:hover:brightness-110",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    )}
                                >
                                    {potencyBadge}
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
                                        {potencyPopoverTitle}
                                    </p>
                                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                                        {potencyPopoverBody}
                                    </p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ) : null}

                    {potencyDurationLabel && !showFormulaPotency ? (
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-xs text-muted-foreground lowercase font-bold italic leading-none">
                                {potencyDurationLabel}
                            </span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
