"use client"

import { cn } from "@/lib/utils"

export function WeaponBondBadge({
    bonded,
    className,
}: {
    bonded: boolean
    className?: string
}) {
    if (!bonded) return null
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                "border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-400",
                className
            )}
        >
            Bonded
        </span>
    )
}
