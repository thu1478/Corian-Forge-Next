import { CircleDot, Shield, Swords, Wrench, Zap, type LucideIcon } from "lucide-react"
import type { ActionCard } from "@/lib/rules"
import {
    resolveActionVisualCategory,
    type ActionVisualCategory,
} from "@/logic/actions/action-visual-category"

export type ActionTypeStyle = {
    icon: LucideIcon
    bg: string
    border: string
    accent: string
    badge: string
}

export const actionVisualCategoryConfig: Record<ActionVisualCategory, ActionTypeStyle> = {
    weapon: {
        icon: Swords,
        bg: "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-950/50 dark:to-red-900/30",
        border: "border-red-300 dark:border-red-800/60",
        accent: "text-red-700 dark:text-red-400",
        badge: "bg-red-200 text-red-800 dark:bg-red-900/80 dark:text-red-200",
    },
    spell: {
        icon: Zap,
        bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950/50 dark:to-violet-900/30",
        border: "border-violet-300 dark:border-violet-800/60",
        accent: "text-violet-700 dark:text-violet-400",
        badge: "bg-violet-200 text-violet-800 dark:bg-violet-900/80 dark:text-violet-200",
    },
    sustain: {
        icon: Shield,
        bg: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/50 dark:to-sky-900/30",
        border: "border-sky-300 dark:border-sky-800/60",
        accent: "text-sky-700 dark:text-sky-400",
        badge: "bg-sky-200 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200",
    },
    equipment: {
        icon: Wrench,
        bg: "bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900/50 dark:to-zinc-800/30",
        border: "border-zinc-300 dark:border-zinc-700/60",
        accent: "text-zinc-700 dark:text-zinc-300",
        badge: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200",
    },
    default: {
        icon: CircleDot,
        bg: "bg-gradient-to-br from-amber-50 to-stone-100 dark:from-amber-950/30 dark:to-stone-900/40",
        border: "border-amber-200/90 dark:border-amber-900/55",
        accent: "text-amber-950 dark:text-amber-100/90",
        badge: "bg-amber-100 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100",
    },
}

/** @deprecated Use actionVisualCategoryConfig via getActionTypeStyle */
export const actionTypeConfig = actionVisualCategoryConfig

export function getActionTypeStyle(
    action: Pick<ActionCard, "id" | "source" | "tags" | "hiddenTags" | "grantingItemUid" | "type">
): ActionTypeStyle {
    const category = resolveActionVisualCategory(action)
    return actionVisualCategoryConfig[category]
}
