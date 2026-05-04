"use client"

import { cn } from "@/lib/utils"
import { InventoryItem } from "@/lib/equipment-data"
import { PotencyEffect, PowerRoll } from "@/lib/rules"
import { getAttributeModifier } from "@/lib/character-data"
import { potencyStrengthDisplayLabel, potencyStrengthToModifier } from "@/lib/potency-strength"

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
    const baseDmg = (roll[`tier${tier}Dmg` as keyof PowerRoll] as number) || 0
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

    if (potency && potency.type !== "Special" && potency.srcStats && potency.srcStats.length > 0) {
        const modifiers = potency.srcStats.map((stat) =>
            getAttributeModifier(attributes[stat as keyof typeof attributes])
        )
        maxSrcMod = Math.max(...modifiers)
        potencyStrMod = potencyStrengthToModifier(potency.strength)
        potencyStrengthLabel = potencyStrengthDisplayLabel(potency.strength)
        potencyThreshold = maxSrcMod + (potencyStrMod ?? 0)
    }

    const shouldShowDmg = hasWpn || finalDmg > 0

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
                    {potencyThreshold !== null && potency.type !== "Special" && potency.targetStats && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-mono font-black text-muted-foreground uppercase tracking-tight">
                                {potency.targetStats.map((s) => s[0]).join("/")}
                            </span>
                            {powerRollDisplayMode === "simple" ? (
                                <span className="text-base font-black text-primary flex items-center gap-1 tabular-nums">
                                    <span className="text-xs opacity-50">&lt;</span>
                                    {potencyThreshold}
                                </span>
                            ) : (
                                <span className="text-base font-black text-primary flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
                                    <span className="text-xs opacity-50">&lt;</span>
                                    <span className="font-mono">
                                        {maxSrcMod} {potencyStrMod}
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

                    <span
                        className={cn(
                            "text-sm px-2.5 py-1 rounded font-extrabold uppercase tracking-tight leading-none shadow-sm",
                            badgeStyle
                        )}
                    >
                        {potency.type === "ForcedMovement"
                            ? `${potency.effect} ${potency.distance}`
                            : potency.effect}
                    </span>

                    {potency.type !== "ForcedMovement" && !!potency.duration && (
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-xs text-muted-foreground lowercase font-bold italic leading-none">
                                {potency.duration}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
