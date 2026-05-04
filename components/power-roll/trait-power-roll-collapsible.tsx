"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PowerRoll } from "@/lib/rules"
import { InventoryItem } from "@/lib/equipment-data"
import {
    PowerRollTierRow,
    type PowerRollAttributes,
    type PowerRollDisplayMode,
} from "@/components/power-roll/power-roll-tier-row"
import { resolveWeaponForActionPowerRoll } from "@/lib/weapon-power-roll"

const TRAIT_BADGE = "bg-violet-200 text-violet-950 dark:bg-violet-900/80 dark:text-violet-100"

function isValidPowerRoll(roll: unknown): roll is PowerRoll {
    if (!roll || typeof roll !== "object") return false
    const r = roll as PowerRoll
    return Array.isArray(r.rollStats) && r.rollStats.length > 0
}

type TraitPowerRollCollapsibleProps = {
    roll: PowerRoll
    attributes: PowerRollAttributes
    /** Default collapsed for traits (creator + sheet). */
    defaultExpanded?: boolean
    currentWeapon?: InventoryItem | null
    offhandWeapon?: InventoryItem | null
    /** When set, melee/ranged matching uses these tags (e.g. trait mirrors a weapon attack). */
    actionTags?: string[]
    powerRollDisplayMode?: PowerRollDisplayMode
    className?: string
}

export function TraitPowerRollCollapsible({
    roll,
    attributes,
    defaultExpanded = false,
    currentWeapon = null,
    offhandWeapon = null,
    actionTags,
    powerRollDisplayMode = "simple",
    className,
}: TraitPowerRollCollapsibleProps) {
    const [open, setOpen] = useState(defaultExpanded)

    const weaponForPowerRollDamage = useMemo(
        () =>
            resolveWeaponForActionPowerRoll(
                actionTags,
                roll.rollStats,
                currentWeapon,
                offhandWeapon
            ),
        [actionTags, roll.rollStats, currentWeapon, offhandWeapon]
    )

    if (!isValidPowerRoll(roll)) return null

    return (
        <div
            className={cn(
                "mt-2 rounded-lg border border-border bg-muted/20 dark:bg-white/5 overflow-hidden",
                className
            )}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full px-3 py-2 flex items-center justify-between border-b border-border/40 hover:bg-foreground/5 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown
                        className={cn(
                            "w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200",
                            !open && "-rotate-90"
                        )}
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Power roll
                    </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {roll.rollStats.map((stat, i) => (
                        <div key={`${stat}-${i}`} className="flex items-center gap-1.5">
                            {i > 0 && <span className="font-bold text-xs text-muted-foreground">or</span>}
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground/5 border border-foreground/10 shadow-sm">
                                <span className="text-base font-black uppercase font-mono leading-none text-violet-700 dark:text-violet-300">
                                    {stat[0]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </button>

            <div className={cn("transition-all duration-200", open ? "p-2 space-y-1 block opacity-100" : "hidden opacity-0")}>
                <PowerRollTierRow
                    label="<=11"
                    roll={roll}
                    tier={1}
                    badgeStyle={TRAIT_BADGE}
                    attributes={attributes}
                    weaponForPowerRoll={weaponForPowerRollDamage}
                    powerRollDisplayMode={powerRollDisplayMode}
                />
                <PowerRollTierRow
                    label="12-16"
                    roll={roll}
                    tier={2}
                    badgeStyle={TRAIT_BADGE}
                    attributes={attributes}
                    weaponForPowerRoll={weaponForPowerRollDamage}
                    powerRollDisplayMode={powerRollDisplayMode}
                />
                <PowerRollTierRow
                    label=">=17"
                    roll={roll}
                    tier={3}
                    badgeStyle={TRAIT_BADGE}
                    attributes={attributes}
                    weaponForPowerRoll={weaponForPowerRollDamage}
                    powerRollDisplayMode={powerRollDisplayMode}
                />
            </div>
        </div>
    )
}
