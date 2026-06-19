"use client"

import { useContext } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InventoryItem } from "@/lib/equipment-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { INV_DRAG_ITEM_PREFIX } from "@/logic/equipment/inventory-helpers"
import { equipmentStatSummaryLine } from "@/logic/equipment/stats-display"
import { ProficiencyAlert } from "@/components/character-sheet/trackingPage/equipment-panel"
import { heavyMightRequirementDeficitMessage } from "@/logic/equipment/proficiency"
import { getItemNameClass } from "@/logic/equipment/item-rank-display"
import { WeaponBondBadge } from "@/components/equipment/weapon-bond-badge"
import { buildWeaponBondContext, isBondedWeapon } from "@/logic/equipment/weapon-utils"
import { InventoryItemDisplayContext } from "@/components/character-sheet/trackingPage/inventory/inventory-display-context"

export function DraggableItemRow({
    item,
    onRemove,
    onSetQuantity,
    onOpenDetails,
    capacityWarningMessage = null,
}: {
    item: InventoryItem
    onRemove: () => void
    onSetQuantity: (q: number) => void
    onOpenDetails: () => void
    capacityWarningMessage?: string | null
}) {
    const displayCtx = useContext(InventoryItemDisplayContext)
    const bondCtx = buildWeaponBondContext(displayCtx.traits, displayCtx.bondedWeaponUids)
    const bonded = isBondedWeapon(item.uid, bondCtx)
    const nameClass = getItemNameClass(item, displayCtx.rules)
    const id = `${INV_DRAG_ITEM_PREFIX}${item.uid}`
    const equipStats = equipmentStatSummaryLine(item)
    const heavyWarningMessage = heavyMightRequirementDeficitMessage(item, displayCtx.attributes?.might)
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
    const style = transform
        ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 20 : undefined }
        : undefined

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/10 p-2 pr-3",
                isDragging && "opacity-60 ring-2 ring-primary/40"
            )}
        >
            <button
                type="button"
                className="touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Drag to move"
                {...listeners}
                {...attributes}
            >
                <GripVertical className="h-4 w-4 shrink-0" />
            </button>
            <div
                className="min-w-0 flex-1 cursor-pointer rounded-md px-1 py-0.5 -mx-1 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                role="button"
                tabIndex={0}
                onClick={onOpenDetails}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onOpenDetails()
                    }
                }}
            >
                <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-sm font-medium", nameClass)}>{item.name}</span>
                    <WeaponBondBadge bonded={bonded} />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {item.type}
                    </span>
                </div>
                {item.description ? (
                    <span className="line-clamp-1 text-xs text-muted-foreground">{item.description}</span>
                ) : null}
                {equipStats ? (
                    <span className="line-clamp-2 text-[11px] font-mono tabular-nums text-muted-foreground">
                        {equipStats}
                    </span>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                {heavyWarningMessage ? <ProficiencyAlert message={heavyWarningMessage} /> : null}
                {capacityWarningMessage ? <ProficiencyAlert message={capacityWarningMessage} /> : null}
                <label className="sr-only" htmlFor={`qty-${item.uid}`}>
                    Quantity for {item.name}
                </label>
                <Input
                    id={`qty-${item.uid}`}
                    type="number"
                    min={1}
                    className="h-8 w-14 px-1 text-center text-sm tabular-nums"
                    value={item.quantity}
                    onChange={(e) => {
                        const n = parseInt(e.target.value, 10)
                        if (!Number.isNaN(n)) onSetQuantity(Math.max(1, n))
                    }}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Remove from inventory (unequips if worn)"
                    onClick={onRemove}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
