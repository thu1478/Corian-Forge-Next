"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { InventoryItem } from "@/lib/equipment-data"
import { PotencyEffect, PowerRoll } from "@/lib/rules"
import { getAttributeModifier } from "@/lib/character-data"
import { potencyStrengthDisplayLabel, potencyStrengthToModifier } from "@/lib/potency-strength"
import { getPowerRollPotencyBadgeAndDuration } from "@/lib/potency-display"

export type PowerRollDisplayMode = "simple" | "formula"

export type PowerRollAttributes = {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
}

export function PowerRollTierRow({
    label,
    roll,
    tier,
    badgeStyle,
    attributes,
    weaponForPowerRoll,
    powerRollDisplayMode,
}: {
    label: string
    roll: PowerRoll
    tier: number
    badgeStyle: string
    attributes: PowerRollAttributes
    /** Weapon whose damage applies for +Wpn tiers (already resolved for active/offhand + melee/ranged). */
    weaponForPowerRoll?: InventoryItem | null
    powerRollDisplayMode: PowerRollDisplayMode
}) {
    const tierDmgKey = `tier${tier}Dmg` as keyof PowerRoll
    const tierDmgRaw = roll[tierDmgKey]
    const hasExplicitNumericTierDmg =
        typeof tierDmgRaw === "number" && Number.isFinite(tierDmgRaw)
    const baseDmg = hasExplicitNumericTierDmg ? tierDmgRaw : Number(tierDmgRaw) || 0
    const hasWpn = (roll[`tier${tier}Wpn` as keyof PowerRoll] as boolean) || false
    const potency = roll[`tier${tier}Effect` as keyof PowerRoll] as PotencyEffect | undefined

    let weaponBonus = 0
    if (hasWpn && weaponForPowerRoll && weaponForPowerRoll.type === "weapon") {
        const raw = weaponForPowerRoll.damage as number | string | undefined
        weaponBonus = typeof raw === "number" && Number.isFinite(raw) ? raw : Number(raw) || 0
    }

    const finalDmg = (hasWpn ? weaponBonus : 0) + baseDmg

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
    const shouldShowDmg = hasWpn || finalDmg > 0 || hasExplicitNumericTierDmg

    const dmgDisplay =
        powerRollDisplayMode === "formula" && hasWpn ? (
            <>
                {baseDmg} + {weaponBonus}{" "}
                <span className="text-[10px] opacity-40 uppercase ml-0.5">DMG</span>
            </>
        ) : (
            <>
                {finalDmg}{" "}
                <span className="text-[10px] opacity-40 uppercase ml-0.5">DMG</span>
            </>
        )

    const { badge: potencyBadge, duration: potencyDurationLabel } = useMemo(
        () => (potency ? getPowerRollPotencyBadgeAndDuration(potency) : { badge: "", duration: null as string | null }),
        [potency]
    )

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
                    {showPotencyDifficulty && potency && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {potency.targetStats && potency.targetStats.length > 0 ? (
                                <span className="text-sm font-mono font-black text-muted-foreground uppercase tracking-tight">
                                    {potency.targetStats.map((s) => s[0]).join("/")}
                                </span>
                            ) : null}
                            {powerRollDisplayMode === "simple" ? (
                                <span className="text-base font-black text-primary flex items-center gap-1 tabular-nums">
                                    <span className="text-xs opacity-50">&lt;</span>
                                    {potencyThreshold}
                                </span>
                            ) : (
                                <span className="text-base font-black text-primary flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
                                    <span className="text-xs opacity-50">&lt;</span>
                                    <span className="font-mono">
                                        {maxSrcMod}
                                        {potencySrcIsFixed ? (
                                            <span className="text-[10px] font-bold uppercase opacity-60 not-italic">
                                                {" "}
                                                fixed
                                            </span>
                                        ) : null}{" "}
                                        {potencyStrMod}
                                    </span>
                                    {potencyStrengthLabel ? (
                                        <span className="text-[10px] font-bold uppercase opacity-60">
                                            [{potencyStrengthLabel}]
                                        </span>
                                    ) : null}
                                </span>
                            )}
                        </div>
                    )}

                    {potencyBadge ? (
                        <span
                            className={cn(
                                "text-sm px-2.5 py-1 rounded font-extrabold uppercase tracking-tight leading-none shadow-sm",
                                badgeStyle
                            )}
                        >
                            {potencyBadge}
                        </span>
                    ) : null}

                    {potencyDurationLabel ? (
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
