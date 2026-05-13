"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  AlertTriangle,
  Backpack,
  BookMarked,
  Box,
  ChevronDown,
  Coins,
  GripVertical,
  Minus,
  PanelRightOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type {
  ArmorItem,
  ContainerItem,
  InventoryContainer,
  InventoryItem,
  ShieldItem,
  WeaponItem,
} from "@/lib/equipment-data"
import {
  allValidContainerZoneIds,
  checkContainerDrop,
  containerItemIsOverCapacity,
  getContainerItemByZoneUid,
  itemStackQuantity,
  sumDirectChildQuantities,
} from "@/lib/inventory-container-rules"
import {
  buildItemInventoryTraitBlocks,
  hydrateItemGrantedActionCards,
} from "@/lib/item-inventory-details"
import type { TraitEffect } from "@/lib/rules"
import { formatTraitEffectChoiceLabel } from "@/lib/trait-selection"
import {
  ActionCardComponent,
} from "@/components/character-sheet/combatPage/action-card-manager"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import {
  INV_CONTAINER_PREFIX,
  INV_DRAG_ITEM_PREFIX,
  INV_DROP_ROOT,
  invDropZoneId,
} from "@/lib/inventory-helpers"
import {
  type InventoryKindFilter,
  itemMatchesKindFilter,
  itemMatchesSearch,
} from "@/lib/inventory-filters"
import {
  equipmentStatSummaryFromDef,
  equipmentStatSummaryLine,
} from "@/lib/equipment-stats-display"
import { ProficiencyAlert } from "@/components/character-sheet/trackingPage/equipment-panel"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface InventoryPanelProps {
  inventory: InventoryItem[]
  containers: InventoryContainer[]
  money: number
  ip: number
  maxIp: number
  onAdjustMoney: (delta: number) => void
  onAdjustIp: (delta: number) => void
  itemCatalog: Record<string, Record<string, unknown>>
  /** Full rules (action cards, passives, classes) for item detail sheet. */
  rules: Record<string, unknown>
  attributes: {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
  }
  onAddInventoryItem: (itemId: string) => void
  onMoveItemToContainer: (uid: string, containerId: string | null) => void
  onAddContainer: (name: string) => void
  onRenameContainer: (id: string, name: string) => void
  onRemoveContainer: (id: string) => void
  onReorderContainers: (next: InventoryContainer[]) => void
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
  /** Local display name only; omit or empty string clears override. */
  onSetInventoryItemCustomName: (uid: string, customName: string) => void
  /** Turn a nested `container` item into a new named bag (same as adding a new container). */
  onUnpackItemContainer: (itemUid: string) => void
}

const FILTER_TABS: { id: InventoryKindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapons", label: "Weapons" },
  { id: "armor_shield", label: "Armor & shields" },
  { id: "other", label: "Other" },
]

function catalogDefType(def: Record<string, unknown>): InventoryItem["type"] | "misc" {
  const t = def.type
  if (
    t === "weapon" ||
    t === "shield" ||
    t === "armor" ||
    t === "misc" ||
    t === "consumable" ||
    t === "container"
  ) {
    return t
  }
  return "misc"
}

/** Synthetic uid for catalog preview rows — never used in saved inventory. */
const CATALOG_PREVIEW_UID = "__cf_catalog_preview__"

/** Same merge shape as `ItemLoader` hydration, for rules-only preview (not on the character). */
function previewInventoryItemFromCatalog(
  id: string,
  def: Record<string, unknown> | undefined
): InventoryItem | null {
  if (!def || typeof def !== "object") return null
  const ruleName = String(def.name ?? id)
  const tags = Array.isArray(def.tags) ? def.tags : []
  const qtyRaw = def.quantity
  const quantity = typeof qtyRaw === "number" && Number.isFinite(qtyRaw) ? qtyRaw : 1
  return {
    ...def,
    uid: CATALOG_PREVIEW_UID,
    id,
    customName: undefined,
    quantity,
    containerId: null,
    name: ruleName,
    description: String(def.description ?? ""),
    tags: tags as string[],
  } as InventoryItem
}

/** Where the item belongs in the UI (invalid ids → root). */
function resolveItemZone(item: InventoryItem, validIds: Set<string>): string | null {
  const c = item.containerId
  if (!c || !validIds.has(c)) return null
  return c
}

function parseAdjustAmount(raw: string): number {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return 1
  return Math.min(n, 999_999)
}

function filterItems(
  items: InventoryItem[],
  invFilter: InventoryKindFilter,
  inventorySearch: string
) {
  return items.filter((item) => {
    if (!item) return false
    if (!itemMatchesKindFilter(item, invFilter)) return false
    return itemMatchesSearch(item, inventorySearch)
  })
}

function formatTraitEffectLine(effect: unknown, rules?: Record<string, unknown>): string {
  if (effect == null) return ""
  if (typeof effect !== "object") return String(effect)
  const typed = effect as { type?: string }
  if (!typed.type || typeof typed.type !== "string") {
    try {
      return JSON.stringify(effect)
    } catch {
      return "effect"
    }
  }
  return formatTraitEffectChoiceLabel(effect as TraitEffect, rules as any)
}

function DraggableItemRow({
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
  /** Shown like equipment proficiency warnings (e.g. container over max). */
  capacityWarningMessage?: string | null
}) {
  const id = `${INV_DRAG_ITEM_PREFIX}${item.uid}`
  const equipStats = equipmentStatSummaryLine(item)
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
          <span className="text-sm font-medium text-foreground">{item.name}</span>
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

const inventoryCollision: CollisionDetection = (args) => {
  const inside = pointerWithin(args)
  if (inside.length) return inside
  return rectIntersection(args)
}

/** While dragging a `container` item, ignore other item-containers' inner drop zones so legacy bags / root win. */
function filterCollisionsForDraggingContainerItem(
  inventory: InventoryItem[],
  collisions: ReturnType<typeof pointerWithin>
) {
  return collisions.filter((c) => {
    const id = String(c.id)
    if (id === INV_DROP_ROOT) return true
    if (!id.startsWith("inv-zone:")) return true
    const zone = id.slice("inv-zone:".length)
    return getContainerItemByZoneUid(inventory, zone) === undefined
  })
}

function makeInventoryPackCollisionDetection(inventory: InventoryItem[]): CollisionDetection {
  return (args) => {
    if (String(args.active.id).startsWith(INV_CONTAINER_PREFIX)) {
      return closestCorners(args)
    }
    const activeId = String(args.active.id)
    if (activeId.startsWith(INV_DRAG_ITEM_PREFIX)) {
      const uid = activeId.slice(INV_DRAG_ITEM_PREFIX.length)
      const dragged = inventory.find((i) => i.uid === uid)
      if (dragged?.type === "container") {
        const fromPointer = filterCollisionsForDraggingContainerItem(inventory, pointerWithin(args))
        if (fromPointer.length) return fromPointer
        return filterCollisionsForDraggingContainerItem(inventory, rectIntersection(args))
      }
    }
    return inventoryCollision(args)
  }
}

function DroppableZone({
  id,
  label,
  labelAccessory,
  children,
  className,
}: {
  id: string
  label: ReactNode
  labelAccessory?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      data-inventory-drop={id}
      className={cn(
        "rounded-xl border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-border/60 bg-muted/5",
        className
      )}
    >
      {labelAccessory != null ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          {labelAccessory}
        </div>
      ) : (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ContainerItemDropSection({
  parent,
  storedQty,
  childItems,
  overCapacity,
  onRemoveInventoryItem,
  onSetItemQuantity,
  onOpenItemDetails,
}: {
  parent: ContainerItem
  /** Sum of stack quantities stored (unfiltered); used for capacity label. */
  storedQty: number
  childItems: InventoryItem[]
  overCapacity: boolean
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
  onOpenItemDetails: (uid: string) => void
}) {
  const cap = parent.containerCapacity
  const allowed = parent.containerAllowedTypes
  const labelParts: string[] = []
  if (typeof cap === "number" && cap >= 0) {
    labelParts.push(`${storedQty} / ${cap} items`)
  } else {
    labelParts.push("Contents")
  }
  if (allowed && allowed.length > 0) {
    labelParts.push(`only ${allowed.join(", ")}`)
  }
  const overCapMessage =
    overCapacity && typeof cap === "number" && cap >= 0
      ? `This bag holds ${storedQty} items but its max is ${cap}. Remove items or split stacks.`
      : null
  return (
    <div className="ml-3 space-y-2 border-l-2 border-primary/25 pl-3">
      <DroppableZone
        id={invDropZoneId(parent.uid)}
        label={labelParts.join(" · ")}
        labelAccessory={overCapMessage ? <ProficiencyAlert message={overCapMessage} /> : undefined}
        className={cn("bg-muted/15", overCapacity && "border-amber-500/45 bg-amber-500/[0.06]")}
      >
        {childItems.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Drop allowed items here.
          </p>
        ) : (
          childItems.map((item) => (
            <DraggableItemRow
              key={item.uid}
              item={item}
              onRemove={() => onRemoveInventoryItem(item.uid)}
              onSetQuantity={(q) => onSetItemQuantity(item.uid, q)}
              onOpenDetails={() => onOpenItemDetails(item.uid)}
            />
          ))
        )}
      </DroppableZone>
    </div>
  )
}

function BagContentsList({
  inBox,
  fullInventory,
  allFiltered,
  getContainerCapacityWarning,
  onRemoveInventoryItem,
  onSetItemQuantity,
  onOpenItemDetails,
  emptyMessage,
}: {
  inBox: InventoryItem[]
  fullInventory: InventoryItem[]
  allFiltered: InventoryItem[]
  getContainerCapacityWarning: (uid: string) => string | null
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
  onOpenItemDetails: (uid: string) => void
  emptyMessage: string
}) {
  if (inBox.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{emptyMessage}</p>
  }
  return (
    <>
      {inBox.map((item) => (
        <div key={item.uid} className="space-y-2">
          <DraggableItemRow
            item={item}
            capacityWarningMessage={getContainerCapacityWarning(item.uid)}
            onRemove={() => onRemoveInventoryItem(item.uid)}
            onSetQuantity={(q) => onSetItemQuantity(item.uid, q)}
            onOpenDetails={() => onOpenItemDetails(item.uid)}
          />
          {item.type === "container" ? (
            <ContainerItemDropSection
              parent={item}
              storedQty={sumDirectChildQuantities(fullInventory, item.uid)}
              childItems={allFiltered.filter((i) => i.containerId === item.uid)}
              overCapacity={containerItemIsOverCapacity(item, fullInventory)}
              onRemoveInventoryItem={onRemoveInventoryItem}
              onSetItemQuantity={onSetItemQuantity}
              onOpenItemDetails={onOpenItemDetails}
            />
          ) : null}
        </div>
      ))}
    </>
  )
}

function RulesRootContainerBagBlock({
  parent,
  inBox,
  fullInventory,
  allFiltered,
  getContainerCapacityWarning,
  onRemoveInventoryItem,
  onSetItemQuantity,
  onOpenItemDetails,
}: {
  parent: ContainerItem
  inBox: InventoryItem[]
  fullInventory: InventoryItem[]
  allFiltered: InventoryItem[]
  getContainerCapacityWarning: (uid: string) => string | null
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
  onOpenItemDetails: (uid: string) => void
}) {
  const storedQty = sumDirectChildQuantities(fullInventory, parent.uid)
  const overCapacity = containerItemIsOverCapacity(parent, fullInventory)
  const cap = parent.containerCapacity
  const allowed = parent.containerAllowedTypes
  const labelParts: string[] = []
  if (typeof cap === "number" && cap >= 0) {
    labelParts.push(`${storedQty} / ${cap} items`)
  } else {
    labelParts.push("Contents")
  }
  if (allowed && allowed.length > 0) {
    labelParts.push(`only ${allowed.join(", ")}`)
  }
  const overCapMessage =
    overCapacity && typeof cap === "number" && cap >= 0
      ? `This bag holds ${storedQty} items but its max is ${cap}. Remove items or split stacks.`
      : null

  return (
    <div className="rounded-xl border border-border/80 bg-card/50">
      <Collapsible defaultOpen>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 p-3 pb-2">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground data-[state=open]:bg-muted/50 data-[state=open]:[&>svg]:rotate-180"
              aria-label={
                storedQty
                  ? `Collapse or expand ${parent.name}, ${storedQty} items`
                  : `Collapse or expand ${parent.name}`
              }
            >
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </Button>
          </CollapsibleTrigger>
          <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 max-w-[200px] truncate text-sm font-semibold text-foreground sm:max-w-none">
            {parent.name}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {storedQty} item{storedQty !== 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onOpenItemDetails(parent.uid)}>
              Details
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              onClick={() => onRemoveInventoryItem(parent.uid)}
            >
              Remove
            </Button>
          </div>
        </div>
        <CollapsibleContent className="px-3 pb-3 outline-none">
          <DroppableZone
            id={invDropZoneId(parent.uid)}
            label={labelParts.join(" · ")}
            labelAccessory={overCapMessage ? <ProficiencyAlert message={overCapMessage} /> : undefined}
            className={cn(
              "bg-muted/15",
              overCapacity && "border-amber-500/45 bg-amber-500/[0.06]"
            )}
          >
            <BagContentsList
              inBox={inBox}
              fullInventory={fullInventory}
              allFiltered={allFiltered}
              getContainerCapacityWarning={getContainerCapacityWarning}
              onRemoveInventoryItem={onRemoveInventoryItem}
              onSetItemQuantity={onSetItemQuantity}
              onOpenItemDetails={onOpenItemDetails}
              emptyMessage={
                storedQty > 0
                  ? "No items match your filters in this container."
                  : "Empty — drag items from carried gear or other bags."
              }
            />
          </DroppableZone>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function LooseCarriedSection({
  looseItems,
  looseStackQty,
  noMatches,
  getContainerCapacityWarning,
  onRemoveInventoryItem,
  onSetItemQuantity,
  onOpenItemDetails,
}: {
  looseItems: InventoryItem[]
  looseStackQty: number
  noMatches: boolean
  getContainerCapacityWarning: (uid: string) => string | null
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
  onOpenItemDetails: (uid: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: INV_DROP_ROOT })
  return (
    <div
      ref={setNodeRef}
      data-inventory-drop={INV_DROP_ROOT}
      className={cn(
        "rounded-lg border border-border/60 bg-card/30 p-3 transition-colors",
        isOver && "border-primary/50 bg-primary/[0.04] ring-2 ring-primary/20"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Carried loose</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {looseStackQty} item{looseStackQty !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Not in a bag — drop here to take items out of containers
      </p>
      <div className="space-y-2">
        {looseItems.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            {noMatches
              ? "No matching items here."
              : "Nothing carried loose. Use the catalog or drag items out of a bag."}
          </p>
        ) : (
          looseItems.map((item) => (
            <DraggableItemRow
              key={item.uid}
              item={item}
              capacityWarningMessage={getContainerCapacityWarning(item.uid)}
              onRemove={() => onRemoveInventoryItem(item.uid)}
              onSetQuantity={(q) => onSetItemQuantity(item.uid, q)}
              onOpenDetails={() => onOpenItemDetails(item.uid)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function SortableContainerBlock({
  container: c,
  count,
  inBox,
  fullInventory,
  allFiltered,
  getContainerCapacityWarning,
  onRenameContainer,
  onRemoveContainer,
  onRemoveInventoryItem,
  onSetItemQuantity,
  onOpenItemDetails,
}: {
  container: InventoryContainer
  count: number
  inBox: InventoryItem[]
  fullInventory: InventoryItem[]
  allFiltered: InventoryItem[]
  getContainerCapacityWarning: (uid: string) => string | null
  onRenameContainer: (id: string, name: string) => void
  onRemoveContainer: (id: string) => void
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
  onOpenItemDetails: (uid: string) => void
}) {
  const sortId = `${INV_CONTAINER_PREFIX}${c.id}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-border/80 bg-card/50",
        isDragging && "z-20 shadow-lg ring-2 ring-primary/30"
      )}
    >
      <Collapsible defaultOpen>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 p-3 pb-2">
          <button
            type="button"
            className="touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Drag to reorder ${c.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 shrink-0" />
          </button>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground data-[state=open]:bg-muted/50 data-[state=open]:[&>svg]:rotate-180"
              aria-label={
                count ? `Collapse or expand ${c.name}, ${count} items` : `Collapse or expand ${c.name}`
              }
            >
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
            </Button>
          </CollapsibleTrigger>
          <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            className="h-8 max-w-[220px] text-sm font-semibold"
            value={c.name}
            onChange={(e) => onRenameContainer(c.id, e.target.value)}
            aria-label={`Rename ${c.name}`}
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {count} item{count !== 1 ? "s" : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-8 text-destructive hover:text-destructive"
            onClick={() => onRemoveContainer(c.id)}
          >
            Delete container
          </Button>
        </div>
        <CollapsibleContent className="px-3 pb-3 outline-none">
          <DroppableZone id={invDropZoneId(c.id)} label="Contents — drop items here" className="mt-2">
            <BagContentsList
              inBox={inBox}
              fullInventory={fullInventory}
              allFiltered={allFiltered}
              getContainerCapacityWarning={getContainerCapacityWarning}
              onRemoveInventoryItem={onRemoveInventoryItem}
              onSetItemQuantity={onSetItemQuantity}
              onOpenItemDetails={onOpenItemDetails}
              emptyMessage={
                count > 0
                  ? "No items match your filters in this container."
                  : "Empty — drag items from carried gear or other bags."
              }
            />
          </DroppableZone>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function InventoryItemDetailSheet({
  item,
  open,
  onOpenChange,
  rules,
  itemCatalog,
  attributes,
  fullInventory,
  onSetCustomName,
  onUnpackItemContainer,
  isCatalogPreview = false,
}: {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  rules: Record<string, unknown>
  itemCatalog: Record<string, Record<string, unknown>>
  attributes: InventoryPanelProps["attributes"]
  /** Live inventory for capacity checks on container items. */
  fullInventory: InventoryItem[]
  onSetCustomName: (uid: string, name: string) => void
  onUnpackItemContainer?: (uid: string) => void
  /** Rules catalog preview: hide character-only controls (e.g. rename). */
  isCatalogPreview?: boolean
}) {
  const traitBlocks = useMemo(
    () => (item ? buildItemInventoryTraitBlocks(item, rules) : []),
    [item, rules]
  )
  const directActions = useMemo(
    () => (item ? hydrateItemGrantedActionCards(item, rules) : []),
    [item, rules]
  )

  const rulesName = item ? String(itemCatalog[item.id]?.name ?? item.id) : ""
  const customNameDraft = item?.customName ?? ""

  const containerStorageOverCap = useMemo(() => {
    if (!item || item.type !== "container" || item.uid === CATALOG_PREVIEW_UID) return false
    return containerItemIsOverCapacity(item as ContainerItem, fullInventory)
  }, [item, fullInventory])
  const containerStoredQty =
    item?.type === "container" && item.uid !== CATALOG_PREVIEW_UID
      ? sumDirectChildQuantities(fullInventory, item.uid)
      : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l p-0 sm:max-w-xl"
      >
        {item ? (
          <>
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <SheetTitle className="pr-8 text-xl leading-snug">{item.name}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {isCatalogPreview ? (
              <>Catalog preview — add from the item catalog to put a copy in inventory.</>
            ) : (
              <>
                Catalog: {rulesName}
                {item.customName ? " · renamed locally" : ""}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-5">
            {!isCatalogPreview && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Display name
              </p>
              <p className="text-xs text-muted-foreground">
                Saved on this character only; rules and catalog stay the same.
              </p>
              <Input
                aria-label="Custom display name"
                placeholder={rulesName}
                value={customNameDraft}
                onChange={(e) => onSetCustomName(item.uid, e.target.value)}
              />
            </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Cost
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
                {item.value != null && Number.isFinite(Number(item.value)) ? (
                  <p>
                    <span className="font-medium text-foreground">Value: </span>
                    <span className="tabular-nums">{item.value}</span> gold
                  </p>
                ) : (
                  <p className="text-muted-foreground">No listed gold value.</p>
                )}
                {item.charges != null && (
                  <p className="mt-2">
                    <span className="font-medium text-foreground">Charges: </span>
                    <span className="tabular-nums">
                      {item.charges.current} / {item.charges.max}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {item.type === "weapon" && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Combat
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm space-y-2">
                  <p>
                    <span className="font-medium text-foreground">Damage: </span>
                    <span className="tabular-nums font-mono">{(item as WeaponItem).damage}</span>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Damage type: </span>
                    <span className="capitalize">{(item as WeaponItem).damageType || "—"}</span>
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Range: </span>
                    <span className="tabular-nums">{(item as WeaponItem).range}</span>
                  </p>
                  {(item as WeaponItem).attributes?.length ? (
                    <p>
                      <span className="font-medium text-foreground">Attributes: </span>
                      <span className="text-muted-foreground">
                        {(item as WeaponItem).attributes.join(", ")}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {item.type === "container" && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Storage
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm space-y-2">
                  {containerStorageOverCap ? (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-950 dark:text-amber-100"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Contents exceed max:{" "}
                        <span className="tabular-nums font-medium">
                          {containerStoredQty} / {(item as ContainerItem).containerCapacity}
                        </span>{" "}
                        items. Remove gear or split stacks to match the limit.
                      </span>
                    </div>
                  ) : null}
                  {typeof (item as ContainerItem).containerCapacity === "number" ? (
                    <p>
                      <span className="font-medium text-foreground">Max item quantity: </span>
                      <span className="tabular-nums">{(item as ContainerItem).containerCapacity}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No capacity limit.</p>
                  )}
                  {(item as ContainerItem).containerAllowedTypes &&
                  (item as ContainerItem).containerAllowedTypes!.length > 0 ? (
                    <p>
                      <span className="font-medium text-foreground">Item types: </span>
                      <span className="text-muted-foreground">
                        {(item as ContainerItem).containerAllowedTypes!.join(", ")}
                      </span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Any item type (except nested containers).</p>
                  )}
                  {!isCatalogPreview && onUnpackItemContainer && item.uid !== CATALOG_PREVIEW_UID ? (
                    <div className="mt-2 space-y-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          onUnpackItemContainer(item.uid)
                          onOpenChange(false)
                        }}
                      >
                        Unpack to new bag
                      </Button>
                      <p className="text-xs text-muted-foreground leading-snug">
                        Contents move into a new top-level bag (like adding a container); this container item is
                        removed from inventory.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {(item.type === "armor" || item.type === "shield") && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Protection
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm space-y-2">
                  {item.type === "shield" ? (
                    <>
                      <p>
                        <span className="font-medium text-foreground">Defense: </span>
                        <span className="tabular-nums">{(item as ShieldItem).defense}</span>
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Stability: </span>
                        <span className="tabular-nums text-muted-foreground">
                          {"stability" in item
                            ? (item as ShieldItem & { stability: number }).stability
                            : "—"}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <span className="font-medium text-foreground">Defense: </span>
                        <span className="tabular-nums">{(item as ArmorItem).defense.value}</span>
                        {(item as ArmorItem).defense.attribute != null && (
                          <span className="text-muted-foreground">
                            {" "}
                            (max{" "}
                            <span className="tabular-nums">
                              {(item as ArmorItem).defense.attrMax ?? "—"}
                            </span>{" "}
                            {(item as ArmorItem).defense.attribute})
                          </span>
                        )}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Stability: </span>
                        <span className="tabular-nums">{(item as ArmorItem).stability}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {item.description || "—"}
              </p>
            </div>

            {item.powerRoll &&
              Array.isArray(item.powerRoll.rollStats) &&
              item.powerRoll.rollStats.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Power roll
                  </p>
                  <TraitPowerRollCollapsible roll={item.powerRoll} attributes={attributes} />
                </div>
              )}

            {directActions.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Action cards (from item)
                </p>
                <div className="space-y-4">
                  {directActions.map((action) => (
                    <ActionCardComponent
                      key={`${item.uid}-${action.id}`}
                      action={action}
                      attributes={attributes}
                      forceCollapsed={false}
                      defaultPowerRollExpanded={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {traitBlocks.length > 0 && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Traits &amp; granted actions
                </p>
                {traitBlocks.map((block) => (
                  <div
                    key={block.traitId}
                    className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-4"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{block.name}</p>
                      {block.minLevel != null && (
                        <p className="text-xs text-muted-foreground">Min. level {block.minLevel}</p>
                      )}
                      {block.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                          {block.description}
                        </p>
                      ) : null}
                    </div>
                    {block.effects && block.effects.length > 0 && (
                      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                        {block.effects
                          .filter(
                            (eff) =>
                              !(
                                typeof eff === "object" &&
                                eff != null &&
                                (eff as { type?: string }).type === "GrantActionCard"
                              )
                          )
                          .map((eff, i) => (
                            <li key={i}>{formatTraitEffectLine(eff, rules)}</li>
                          ))}
                      </ul>
                    )}
                    {block.grantedActionCards.length > 0 && (
                      <div className="space-y-3 pt-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          Granted cards
                        </p>
                        {block.grantedActionCards.map((action) => (
                          <ActionCardComponent
                            key={`${item.uid}-${block.traitId}-${action.id}`}
                            action={action}
                            attributes={attributes}
                            forceCollapsed={false}
                            defaultPowerRollExpanded={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function InventoryPanel({
  inventory,
  containers,
  money,
  ip,
  maxIp,
  onAdjustMoney,
  onAdjustIp,
  itemCatalog,
  rules,
  attributes,
  onAddInventoryItem,
  onMoveItemToContainer,
  onAddContainer,
  onRenameContainer,
  onRemoveContainer,
  onReorderContainers,
  onRemoveInventoryItem,
  onSetItemQuantity,
  onSetInventoryItemCustomName,
  onUnpackItemContainer,
}: InventoryPanelProps) {
  const [detailUid, setDetailUid] = useState<string | null>(null)
  const [catalogDetailId, setCatalogDetailId] = useState<string | null>(null)
  const [inventorySearch, setInventorySearch] = useState("")
  const [invFilter, setInvFilter] = useState<InventoryKindFilter>("all")
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogFilter, setCatalogFilter] = useState<InventoryKindFilter>("all")
  const [catalogNotice, setCatalogNotice] = useState<{ text: string } | null>(null)
  const [packNotice, setPackNotice] = useState<string | null>(null)
  const [newContainerName, setNewContainerName] = useState("")
  const [newContainerPopoverOpen, setNewContainerPopoverOpen] = useState(false)
  const [goldAdjustInput, setGoldAdjustInput] = useState("1")
  const [ipAdjustInput, setIpAdjustInput] = useState("1")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (!catalogNotice) return
    const t = window.setTimeout(() => setCatalogNotice(null), 3500)
    return () => window.clearTimeout(t)
  }, [catalogNotice])

  useEffect(() => {
    if (!packNotice) return
    const t = window.setTimeout(() => setPackNotice(null), 4000)
    return () => window.clearTimeout(t)
  }, [packNotice])

  useEffect(() => {
    if (detailUid != null && !inventory.some((i) => i.uid === detailUid)) {
      setDetailUid(null)
    }
  }, [inventory, detailUid])

  useEffect(() => {
    if (catalogDetailId != null && itemCatalog[catalogDetailId] == null) {
      setCatalogDetailId(null)
    }
  }, [catalogDetailId, itemCatalog])

  const openPackItemDetails = (uid: string) => {
    setCatalogDetailId(null)
    setDetailUid(uid)
  }

  const validIds = useMemo(
    () => allValidContainerZoneIds(containers, inventory),
    [containers, inventory]
  )

  const containerCapacityWarnLines = useMemo(() => {
    const lines: string[] = []
    for (const it of inventory) {
      if (it.type !== "container") continue
      if (!containerItemIsOverCapacity(it, inventory)) continue
      const cap = it.containerCapacity!
      const q = sumDirectChildQuantities(inventory, it.uid)
      lines.push(`${it.name} exceeds max item quantity (${q}/${cap}).`)
    }
    return lines
  }, [inventory])

  const getContainerCapacityWarning = useCallback(
    (uid: string) => {
      const it = inventory.find((i) => i.uid === uid)
      if (!it || it.type !== "container") return null
      if (!containerItemIsOverCapacity(it, inventory)) return null
      const cap = it.containerCapacity!
      const q = sumDirectChildQuantities(inventory, uid)
      return `Over max item quantity (${q}/${cap}).`
    },
    [inventory]
  )

  const packCollisionDetection = useMemo(
    () => makeInventoryPackCollisionDetection(inventory),
    [inventory]
  )

  const containerSortIds = useMemo(
    () => containers.map((c) => `${INV_CONTAINER_PREFIX}${c.id}`),
    [containers]
  )

  const filteredAll = useMemo(
    () => filterItems(inventory, invFilter, inventorySearch),
    [inventory, invFilter, inventorySearch]
  )

  const rootItems = useMemo(
    () => filteredAll.filter((i) => resolveItemZone(i, validIds) === null),
    [filteredAll, validIds]
  )

  const rootLooseItems = useMemo(
    () => rootItems.filter((i) => i.type !== "container"),
    [rootItems]
  )

  const rootContainerItems = useMemo(
    () => rootItems.filter((i): i is ContainerItem => i.type === "container"),
    [rootItems]
  )

  const looseCarriedQty = useMemo(
    () => rootLooseItems.reduce((acc, i) => acc + itemStackQuantity(i), 0),
    [rootLooseItems]
  )

  const catalogEntries = useMemo(() => {
    return Object.entries(itemCatalog)
      .map(([id, def]) => ({ id, def }))
      .filter(({ def }) => {
        const pseudo: Pick<InventoryItem, "type"> = { type: catalogDefType(def) }
        if (!itemMatchesKindFilter(pseudo, catalogFilter)) return false
        return itemMatchesSearch(
          {
            name: def.name as string | undefined,
            description: def.description as string | undefined,
            tags: def.tags as string[] | undefined,
          },
          catalogSearch
        )
      })
      .sort((a, b) =>
        String(a.def.name ?? a.id).localeCompare(String(b.def.name ?? b.id))
      )
  }, [itemCatalog, catalogFilter, catalogSearch])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const aid = String(active.id)

    if (aid.startsWith(INV_CONTAINER_PREFIX)) {
      if (!over) return
      const oid = String(over.id)
      if (!oid.startsWith(INV_CONTAINER_PREFIX)) return
      if (aid === oid) return
      const oldIndex = containers.findIndex((c) => `${INV_CONTAINER_PREFIX}${c.id}` === aid)
      const newIndex = containers.findIndex((c) => `${INV_CONTAINER_PREFIX}${c.id}` === oid)
      if (oldIndex < 0 || newIndex < 0) return
      onReorderContainers(arrayMove(containers, oldIndex, newIndex))
      return
    }

    if (!aid.startsWith(INV_DRAG_ITEM_PREFIX)) return
    if (!over) return
    const activeUid = aid.replace(INV_DRAG_ITEM_PREFIX, "")
    const overId = String(over.id)
    let target: string | null = null
    if (overId === INV_DROP_ROOT) target = null
    else if (overId.startsWith("inv-zone:")) {
      const cid = overId.slice("inv-zone:".length)
      if (validIds.has(cid)) target = cid
      else return
    } else return

    const item = inventory.find((i) => i.uid === activeUid)
    if (!item) return
    const current = resolveItemZone(item, validIds)
    if (current === target) return

    const dropCheck = checkContainerDrop(inventory, activeUid, target)
    if (!dropCheck.ok) {
      setPackNotice(dropCheck.reason)
      return
    }

    onMoveItemToContainer(activeUid, target)
  }

  const noMatches =
    filteredAll.length === 0 && (!!inventorySearch.trim() || invFilter !== "all")

  const catalogPreviewItem = useMemo(() => {
    if (catalogDetailId == null) return null
    return previewInventoryItemFromCatalog(catalogDetailId, itemCatalog[catalogDetailId])
  }, [catalogDetailId, itemCatalog])

  const detailItemForSheet =
    catalogPreviewItem ?? (detailUid != null ? inventory.find((i) => i.uid === detailUid) ?? null : null)

  const detailSheetOpen = detailItemForSheet != null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold uppercase tracking-wider text-primary">
          <Coins className="h-5 w-5" />
          Currency
        </h3>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/[0.07] p-4 dark:bg-yellow-500/10">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-yellow-500/50 bg-yellow-500/20">
                <span className="text-xl font-bold tabular-nums text-yellow-600 dark:text-yellow-400">{money}</span>
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-yellow-700 dark:text-yellow-500/90">
                Gold
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="gold-adjust-amount">
                  Amount to add or spend
                </label>
                <Input
                  id="gold-adjust-amount"
                  type="number"
                  min={1}
                  className="h-9 w-24 tabular-nums"
                  value={goldAdjustInput}
                  onChange={(e) => setGoldAdjustInput(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 gap-1"
                  onClick={() => onAdjustMoney(-parseAdjustAmount(goldAdjustInput))}
                >
                  <Minus className="h-3.5 w-3.5" />
                  Spend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1 bg-yellow-600 text-white hover:bg-yellow-600/90 dark:bg-yellow-700 dark:hover:bg-yellow-700/90"
                  onClick={() => onAdjustMoney(parseAdjustAmount(goldAdjustInput))}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quick add
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 25, 50, 100].map((n) => (
                    <Button
                      key={`g+${n}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 min-w-[2.75rem] px-2 text-xs tabular-nums"
                      onClick={() => onAdjustMoney(n)}
                    >
                      +{n}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quick spend
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 5, 10, 25, 50].map((n) => (
                    <Button
                      key={`g-${n}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 min-w-[2.75rem] px-2 text-xs tabular-nums"
                      onClick={() => onAdjustMoney(-n)}
                    >
                      −{n}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.07] p-4 dark:bg-violet-500/10">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-500/50 bg-violet-500/20">
                <span className="text-xl font-bold tabular-nums text-violet-600 dark:text-violet-400">{ip}</span>
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-violet-700 dark:text-violet-500/90">
                IP
              </span>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">Max {maxIp}</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="ip-adjust-amount">
                  IP to spend or gain
                </label>
                <Input
                  id="ip-adjust-amount"
                  type="number"
                  min={1}
                  className="h-9 w-24 tabular-nums"
                  value={ipAdjustInput}
                  onChange={(e) => setIpAdjustInput(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 gap-1"
                  onClick={() => onAdjustIp(-parseAdjustAmount(ipAdjustInput))}
                >
                  <Minus className="h-3.5 w-3.5" />
                  Spend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1 bg-violet-600 text-white hover:bg-violet-600/90 dark:bg-violet-700 dark:hover:bg-violet-700/90"
                  onClick={() => onAdjustIp(parseAdjustAmount(ipAdjustInput))}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Gain
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1"
                  onClick={() => onAdjustIp(-1)}
                  disabled={ip <= 0}
                >
                  <Minus className="h-3.5 w-3.5" />
                  −1 IP
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1"
                  onClick={() => onAdjustIp(1)}
                  disabled={ip >= maxIp}
                >
                  <Plus className="h-3.5 w-3.5" />
                  +1 IP
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold uppercase tracking-wider text-primary">
            <Backpack className="h-5 w-5" />
            Inventory
            <span className="text-sm font-normal text-muted-foreground">({inventory.length})</span>
            {containerCapacityWarnLines.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="-m-1 p-1 rounded text-amber-500 hover:bg-amber-500/15 shrink-0"
                    aria-label="Container capacity warnings"
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[min(92vw,320px)] text-xs leading-snug space-y-1.5"
                >
                  <p className="font-semibold text-background">Over container capacity</p>
                  {containerCapacityWarnLines.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </h3>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Popover open={newContainerPopoverOpen} onOpenChange={setNewContainerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2">
                  <Box className="h-4 w-4" />
                  New container
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end" sideOffset={6}>
                <p className="text-sm font-medium text-foreground">Create a container</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Named bags hold items separately from anything left carried loose. Drag the grip on a bag to reorder
                  it.
                </p>
                <label className="sr-only" htmlFor="popover-new-container-name">
                  Container name
                </label>
                <Input
                  id="popover-new-container-name"
                  className="mt-3"
                  placeholder="Container name…"
                  value={newContainerName}
                  onChange={(e) => setNewContainerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newContainerName.trim()) {
                      onAddContainer(newContainerName.trim())
                      setNewContainerName("")
                      setNewContainerPopoverOpen(false)
                    }
                  }}
                />
                <Button
                  type="button"
                  className="mt-3 w-full"
                  disabled={!newContainerName.trim()}
                  onClick={() => {
                    onAddContainer(newContainerName.trim())
                    setNewContainerName("")
                    setNewContainerPopoverOpen(false)
                  }}
                >
                  Add container
                </Button>
              </PopoverContent>
            </Popover>

            <Dialog
              open={catalogOpen}
              onOpenChange={(open) => {
                setCatalogOpen(open)
                if (!open) setCatalogNotice(null)
              }}
            >
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2">
                <BookMarked className="h-4 w-4" />
                Item catalog
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
              <DialogHeader className="shrink-0 space-y-1 p-6 pb-3 text-left">
                <DialogTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-primary" />
                  Add item to inventory
                </DialogTitle>
                <p className="text-sm font-normal text-muted-foreground">
                  Search the rules catalog and add a new instance to this character&apos;s inventory.
                </p>
              </DialogHeader>
              <div className="shrink-0 border-b border-border px-6 pb-4">
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search catalog…"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="h-10 border-border bg-muted/20 pl-10 text-base"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FILTER_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCatalogFilter(tab.id)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          catalogFilter === tab.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {catalogNotice && (
                <div
                  role="status"
                  className="shrink-0 border-b border-emerald-500/30 bg-emerald-500/10 px-6 py-2.5 text-sm text-emerald-900 dark:text-emerald-100"
                >
                  {catalogNotice.text}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                <div className="space-y-2 pr-1">
                  {catalogEntries.map(({ id, def }) => {
                    const t = catalogDefType(def)
                    const statLine = equipmentStatSummaryFromDef(def)
                    return (
                      <div
                        key={id}
                        className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {String(def.name ?? id)}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                              {t}
                            </span>
                          </div>
                          <p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                            {String(def.description ?? "")}
                          </p>
                          {statLine ? (
                            <p className="mt-1.5 text-[11px] font-mono tabular-nums text-muted-foreground/90">
                              {statLine}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            title="Full details (traits, actions, stats)"
                            onClick={() => {
                              setDetailUid(null)
                              setCatalogDetailId(id)
                            }}
                          >
                            <PanelRightOpen className="h-3.5 w-3.5" />
                            Details
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() => {
                              onAddInventoryItem(id)
                              setCatalogNotice({
                                text: `Added "${String(def.name ?? id)}" to your inventory.`,
                              })
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {catalogEntries.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No catalog entries match your filters.
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInvFilter(tab.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                invFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search inventory…"
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            className="h-10 border-border bg-muted/20 pl-10 text-base"
          />
        </div>

        <DndContext sensors={sensors} collisionDetection={packCollisionDetection} onDragEnd={handleDragEnd}>
          {packNotice && (
            <div
              role="status"
              className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
            >
              {packNotice}
            </div>
          )}
          <div className="max-h-[min(520px,55vh)] space-y-4 overflow-y-auto pr-1">
            <LooseCarriedSection
              looseItems={rootLooseItems}
              looseStackQty={looseCarriedQty}
              noMatches={noMatches}
              getContainerCapacityWarning={getContainerCapacityWarning}
              onRemoveInventoryItem={onRemoveInventoryItem}
              onSetItemQuantity={onSetItemQuantity}
              onOpenItemDetails={openPackItemDetails}
            />

            <SortableContext items={containerSortIds} strategy={verticalListSortingStrategy}>
              {containers.map((c) => {
                const inBox = filteredAll.filter((i) => resolveItemZone(i, validIds) === c.id)
                const count = inventory
                  .filter((i) => resolveItemZone(i, validIds) === c.id)
                  .reduce((acc, i) => acc + itemStackQuantity(i), 0)
                return (
                  <SortableContainerBlock
                    key={c.id}
                    container={c}
                    count={count}
                    inBox={inBox}
                    fullInventory={inventory}
                    allFiltered={filteredAll}
                    getContainerCapacityWarning={getContainerCapacityWarning}
                    onRenameContainer={onRenameContainer}
                    onRemoveContainer={onRemoveContainer}
                    onRemoveInventoryItem={onRemoveInventoryItem}
                    onSetItemQuantity={onSetItemQuantity}
                    onOpenItemDetails={openPackItemDetails}
                  />
                )
              })}
            </SortableContext>

            {rootContainerItems.map((bag) => (
              <RulesRootContainerBagBlock
                key={bag.uid}
                parent={bag}
                inBox={filteredAll.filter((i) => i.containerId === bag.uid)}
                fullInventory={inventory}
                allFiltered={filteredAll}
                getContainerCapacityWarning={getContainerCapacityWarning}
                onRemoveInventoryItem={onRemoveInventoryItem}
                onSetItemQuantity={onSetItemQuantity}
                onOpenItemDetails={openPackItemDetails}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <InventoryItemDetailSheet
        item={detailItemForSheet}
        open={detailSheetOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDetailUid(null)
            setCatalogDetailId(null)
          }
        }}
        rules={rules}
        itemCatalog={itemCatalog}
        attributes={attributes}
        fullInventory={inventory}
        onSetCustomName={onSetInventoryItemCustomName}
        onUnpackItemContainer={onUnpackItemContainer}
        isCatalogPreview={catalogDetailId != null}
      />
    </div>
  )
}
