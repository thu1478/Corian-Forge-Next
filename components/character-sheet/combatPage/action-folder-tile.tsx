"use client"

import type { ButtonHTMLAttributes } from "react"
import { ChevronRight, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActionLayout } from "@/lib/character-data"
import type { ActionCard } from "@/lib/rules"
import {
    countVisibleFolderEntries,
    resolveFolderPreviewEntries,
    type FolderPreviewEntry,
} from "@/logic/actions/action-layout"
import { getActionTypeStyle } from "@/components/character-sheet/combatPage/action-tile-styles"

export type ActionFolderTileProps = {
    folderId: string
    name: string
    actionLayout: ActionLayout
    visibleActions: ActionCard[]
    isEditMode?: boolean
    isDragging?: boolean
    isNestTarget?: boolean
    isNestHint?: boolean
    /** Full-width horizontal card (grid/list). Compact square for drag overlay only. */
    variant?: "card" | "compact"
    className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">

function PreviewCell({ entry, compact }: { entry: FolderPreviewEntry; compact?: boolean }) {
    const cellClass = compact
        ? "h-5 w-5 rounded-md"
        : "h-7 w-7 rounded-md"
    const iconClass = compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"

    if (entry.kind === "folder") {
        return (
            <div
                className={cn(
                    "flex shrink-0 items-center justify-center bg-amber-200/80 dark:bg-amber-800/60",
                    cellClass
                )}
            >
                <Folder className={cn(iconClass, "text-amber-800 dark:text-amber-200")} aria-hidden />
            </div>
        )
    }
    const config = getActionTypeStyle(entry.action)
    const Icon = config.icon
    return (
        <div className={cn("flex shrink-0 items-center justify-center", cellClass, config.badge)}>
            <Icon className={cn(iconClass, config.accent)} aria-hidden />
        </div>
    )
}

export function ActionFolderTile({
    folderId,
    name,
    actionLayout,
    visibleActions,
    isEditMode = false,
    isDragging = false,
    isNestTarget = false,
    isNestHint = false,
    variant = "card",
    className,
    ...props
}: ActionFolderTileProps) {
    const preview = resolveFolderPreviewEntries(folderId, visibleActions, actionLayout, 4)
    const totalCount = countVisibleFolderEntries(folderId, visibleActions, actionLayout)
    const overflow = totalCount > 4 ? totalCount - 4 : 0
    const showNest = isNestTarget && isNestHint

    if (variant === "compact") {
        const cells: (FolderPreviewEntry | null)[] = [...preview]
        while (cells.length < 4) cells.push(null)

        return (
            <button
                type="button"
                className={cn(
                    "group flex flex-col items-center gap-1 text-center touch-manipulation",
                    className
                )}
                {...props}
            >
                <div
                    className={cn(
                        "relative h-14 w-14 rounded-2xl bg-gradient-to-b from-amber-100/90 to-amber-200/70 p-1.5 shadow-md ring-1 ring-amber-300/50 dark:from-amber-900/50 dark:to-amber-950/70 dark:ring-amber-700/40",
                        isDragging && "opacity-35"
                    )}
                >
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 rounded-xl bg-amber-50/90 p-1 dark:bg-amber-950/40">
                        {cells.map((entry, i) => (
                            <div key={i} className="min-h-0 min-w-0 overflow-hidden">
                                {entry ? <PreviewCell entry={entry} compact /> : null}
                            </div>
                        ))}
                    </div>
                    {overflow > 0 ? (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-foreground px-1 py-px text-[9px] font-bold leading-none text-background shadow">
                            +{overflow}
                        </span>
                    ) : null}
                </div>
                <span className="max-w-[76px] truncate text-[10px] font-medium leading-tight text-foreground/90">
                    {name}
                </span>
            </button>
        )
    }

    return (
        <button
            type="button"
            className={cn(
                "group w-full touch-manipulation text-left",
                isEditMode && "animate-tile-jiggle",
                className
            )}
            {...props}
        >
            <div
                className={cn(
                    "flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-all",
                    "border-amber-300/60 bg-gradient-to-r from-amber-50/90 to-amber-100/50 dark:border-amber-700/50 dark:from-amber-950/40 dark:to-amber-900/20",
                    isDragging && "opacity-35",
                    showNest && "scale-[1.01] border-amber-500 ring-2 ring-amber-500/40",
                    isEditMode && !showNest && "ring-1 ring-primary/30",
                    !isDragging && !isEditMode && "hover:border-amber-400/80 hover:shadow-md"
                )}
            >
                <div className="flex shrink-0 items-center justify-center rounded-lg bg-amber-200/80 p-2 dark:bg-amber-800/50">
                    <Folder className="h-5 w-5 text-amber-800 dark:text-amber-200" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold leading-tight text-foreground">{name}</div>
                    <div className="text-xs text-muted-foreground">
                        {totalCount} {totalCount === 1 ? "item" : "items"}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {preview.map((entry, i) => (
                        <PreviewCell key={i} entry={entry} />
                    ))}
                    {overflow > 0 ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-bold text-background">
                            +{overflow}
                        </span>
                    ) : null}
                </div>
                <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100"
                    aria-hidden
                />
            </div>
        </button>
    )
}
