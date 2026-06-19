"use client"

import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import type { ActionCard } from "@/lib/rules"
import { getActionTypeStyle } from "@/components/character-sheet/combatPage/action-tile-styles"

export type ActionTileProps = {
    action: ActionCard
    size?: "md" | "sm" | "micro"
    isEditMode?: boolean
    isDragging?: boolean
    className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">

const sizeClasses = {
    md: {
        tile: "h-[72px] w-[72px] rounded-2xl border-2",
        icon: "h-6 w-6",
        badge: "p-1.5 rounded-lg",
    },
    sm: {
        tile: "h-14 w-14 rounded-xl border",
        icon: "h-5 w-5",
        badge: "p-1 rounded-md",
    },
    micro: {
        tile: "h-full w-full rounded-[3px] border-0",
        icon: "h-2 w-2",
        badge: "p-0 rounded-[2px]",
    },
}

export function ActionTile({
    action,
    size = "md",
    isEditMode = false,
    isDragging = false,
    className,
    ...props
}: ActionTileProps) {
    const config = getActionTypeStyle(action)
    const TypeIcon = config.icon
    const sizes = sizeClasses[size]

    return (
        <button
            type="button"
            className={cn(
                "group flex flex-col items-center gap-1 text-center touch-manipulation",
                isEditMode && "animate-tile-jiggle",
                className
            )}
            {...props}
        >
            <div
                className={cn(
                    "flex items-center justify-center shadow-sm transition-transform",
                    sizes.tile,
                    config.bg,
                    config.border,
                    isDragging && "opacity-35",
                    !isDragging && !isEditMode && "group-hover:scale-105",
                    isEditMode && "ring-1 ring-primary/30"
                )}
            >
                <div className={cn(sizes.badge, config.badge)}>
                    <TypeIcon className={cn(sizes.icon, config.accent)} aria-hidden />
                </div>
            </div>
            {size !== "micro" ? (
                <span className="max-w-[76px] truncate text-[10px] font-medium leading-tight text-foreground/90">
                    {action.name}
                </span>
            ) : null}
        </button>
    )
}
