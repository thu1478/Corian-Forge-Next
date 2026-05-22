"use client"

import { cn } from "@/lib/utils"
import { Droplets, Target, Wrench } from "lucide-react"
import type { ActionCostBudget, ActionSpendResourceKind } from "@/components/character-sheet/combatPage/action-card-manager"

export function pickPositiveCost(v: unknown): number {
    const n = Math.floor(Number(v))
    return Number.isFinite(n) && n > 0 ? n : 0
}

/** Focus / MP / IP on the reaction when not already shown on an embedded action card. */
export function getReactionResourceCostsForInlineRow(
    reaction: Record<string, unknown>,
    embeddedCard: Record<string, unknown> | null
): { focus: number; mp: number; ip: number } | null {
    const fromR = {
        focus: pickPositiveCost(reaction.focusCost),
        mp: pickPositiveCost(reaction.mpCost),
        ip: pickPositiveCost(reaction.ipCost),
    }
    if (!embeddedCard) {
        const anyR = fromR.focus > 0 || fromR.mp > 0 || fromR.ip > 0
        return anyR ? fromR : null
    }
    const fromC = {
        focus: pickPositiveCost(embeddedCard.focusCost),
        mp: pickPositiveCost(embeddedCard.mpCost),
        ip: pickPositiveCost(embeddedCard.ipCost),
    }
    const cardDeclaresResourceCost = fromC.focus > 0 || fromC.mp > 0 || fromC.ip > 0
    if (cardDeclaresResourceCost) return null
    const anyR = fromR.focus > 0 || fromR.mp > 0 || fromR.ip > 0
    return anyR ? fromR : null
}

export function ReactionResourceCostBadges({
    costs,
    actionCostBudget,
    onSpendActionCost,
    className,
}: {
    costs: { focus: number; mp: number; ip: number }
    actionCostBudget?: ActionCostBudget
    onSpendActionCost?: (kind: ActionSpendResourceKind, amount: number) => void
    className?: string
}) {
    const spendInteractive = Boolean(onSpendActionCost && actionCostBudget)

    const trySpend = (kind: ActionSpendResourceKind, amount: number) => {
        if (!spendInteractive || amount <= 0) return
        onSpendActionCost?.(kind, amount)
    }

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {costs.focus > 0 ? (
                spendInteractive ? (
                    <button
                        type="button"
                        onClick={() => trySpend("focus", costs.focus)}
                        disabled={(actionCostBudget?.focus ?? 0) < costs.focus}
                        title={`Spend ${costs.focus} Focus`}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                            "bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/40",
                            "hover:bg-orange-200/80 dark:hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                        )}
                    >
                        <Target className="h-4 w-4 shrink-0 text-orange-700 dark:text-orange-400" aria-hidden />
                        <span className="text-base font-bold text-orange-700 dark:text-orange-400">
                            {costs.focus} Focus
                        </span>
                    </button>
                ) : (
                    <div
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                            "bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/40"
                        )}
                    >
                        <Target className="h-4 w-4 shrink-0 text-orange-700 dark:text-orange-400" aria-hidden />
                        <span className="text-base font-bold text-orange-700 dark:text-orange-400">
                            {costs.focus} Focus
                        </span>
                    </div>
                )
            ) : null}
            {costs.mp > 0 ? (
                spendInteractive ? (
                    <button
                        type="button"
                        onClick={() => trySpend("mp", costs.mp)}
                        disabled={(actionCostBudget?.mp ?? 0) < costs.mp}
                        title={`Spend ${costs.mp} MP`}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                            "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/40",
                            "hover:bg-blue-200/80 dark:hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                        )}
                    >
                        <Droplets className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden />
                        <span className="text-base font-bold text-blue-700 dark:text-blue-400">{costs.mp} MP</span>
                    </button>
                ) : (
                    <div
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                            "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/40"
                        )}
                    >
                        <Droplets className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden />
                        <span className="text-base font-bold text-blue-700 dark:text-blue-400">{costs.mp} MP</span>
                    </div>
                )
            ) : null}
            {costs.ip > 0 ? (
                spendInteractive ? (
                    <button
                        type="button"
                        onClick={() => trySpend("ip", costs.ip)}
                        disabled={(actionCostBudget?.ip ?? 0) < costs.ip}
                        title={`Spend ${costs.ip} IP`}
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                            "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40",
                            "hover:bg-emerald-200/80 dark:hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                        )}
                    >
                        <Wrench className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                        <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{costs.ip} IP</span>
                    </button>
                ) : (
                    <div
                        className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                            "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40"
                        )}
                    >
                        <Wrench className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
                        <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{costs.ip} IP</span>
                    </div>
                )
            ) : null}
        </div>
    )
}
