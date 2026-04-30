"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
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
  Backpack,
  BookMarked,
  Box,
  ChevronDown,
  Coins,
  GripVertical,
  Minus,
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
import { cn } from "@/lib/utils"
import type { InventoryContainer, InventoryItem } from "@/lib/equipment-data"
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

interface InventoryPanelProps {
  inventory: InventoryItem[]
  containers: InventoryContainer[]
  money: number
  ip: number
  maxIp: number
  onAdjustMoney: (delta: number) => void
  onAdjustIp: (delta: number) => void
  itemCatalog: Record<string, Record<string, unknown>>
  onAddInventoryItem: (itemId: string) => void
  onMoveItemToContainer: (uid: string, containerId: string | null) => void
  onAddContainer: (name: string) => void
  onRenameContainer: (id: string, name: string) => void
  onRemoveContainer: (id: string) => void
  onReorderContainers: (next: InventoryContainer[]) => void
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
}

const FILTER_TABS: { id: InventoryKindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapons", label: "Weapons" },
  { id: "armor_shield", label: "Armor & shields" },
  { id: "other", label: "Other" },
]

function catalogDefType(def: Record<string, unknown>): InventoryItem["type"] | "misc" {
  const t = def.type
  if (t === "weapon" || t === "shield" || t === "armor" || t === "misc") return t
  return "misc"
}

function validContainerIdSet(containers: InventoryContainer[]) {
  return new Set(containers.map((c) => c.id))
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

function DraggableItemRow({
  item,
  onRemove,
  onSetQuantity,
}: {
  item: InventoryItem
  onRemove: () => void
  onSetQuantity: (q: number) => void
}) {
  const id = `${INV_DRAG_ITEM_PREFIX}${item.uid}`
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
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{item.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            {item.type}
          </span>
        </div>
        <span className="line-clamp-1 text-xs text-muted-foreground">{item.description}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
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

function DroppableZone({
  id,
  label,
  children,
  className,
}: {
  id: string
  label: string
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
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

const mixedCollision: CollisionDetection = (args) => {
  if (String(args.active.id).startsWith(INV_CONTAINER_PREFIX)) {
    return closestCorners(args)
  }
  return inventoryCollision(args)
}

function SortableContainerBlock({
  container: c,
  count,
  inBox,
  onRenameContainer,
  onRemoveContainer,
  onRemoveInventoryItem,
  onSetItemQuantity,
}: {
  container: InventoryContainer
  count: number
  inBox: InventoryItem[]
  onRenameContainer: (id: string, name: string) => void
  onRemoveContainer: (id: string) => void
  onRemoveInventoryItem: (uid: string) => void
  onSetItemQuantity: (uid: string, quantity: number) => void
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
            {inBox.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {count > 0
                  ? "No items match your filters in this container."
                  : "Empty — drag items from your pack or other containers."}
              </p>
            ) : (
              inBox.map((item) => (
                <DraggableItemRow
                  key={item.uid}
                  item={item}
                  onRemove={() => onRemoveInventoryItem(item.uid)}
                  onSetQuantity={(q) => onSetItemQuantity(item.uid, q)}
                />
              ))
            )}
          </DroppableZone>
        </CollapsibleContent>
      </Collapsible>
    </div>
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
  onAddInventoryItem,
  onMoveItemToContainer,
  onAddContainer,
  onRenameContainer,
  onRemoveContainer,
  onReorderContainers,
  onRemoveInventoryItem,
  onSetItemQuantity,
}: InventoryPanelProps) {
  const [inventorySearch, setInventorySearch] = useState("")
  const [invFilter, setInvFilter] = useState<InventoryKindFilter>("all")
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [catalogFilter, setCatalogFilter] = useState<InventoryKindFilter>("all")
  const [catalogNotice, setCatalogNotice] = useState<{ text: string } | null>(null)
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

  const validIds = useMemo(() => validContainerIdSet(containers), [containers])

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
    onMoveItemToContainer(activeUid, target)
  }

  const noMatches =
    filteredAll.length === 0 && (!!inventorySearch.trim() || invFilter !== "all")

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
          <h3 className="flex items-center gap-2 text-base font-semibold uppercase tracking-wider text-primary">
            <Backpack className="h-5 w-5" />
            Inventory
            <span className="text-sm font-normal text-muted-foreground">({inventory.length})</span>
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
                  Named bags organize your pack. Drag the grip on a bag to reorder it.
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
                  Search the rules catalog and add a new instance to your pack.
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
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {String(def.description ?? "")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="shrink-0 gap-1"
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

        <DndContext sensors={sensors} collisionDetection={mixedCollision} onDragEnd={handleDragEnd}>
          <div className="max-h-[min(520px,55vh)] space-y-4 overflow-y-auto pr-1">
            <DroppableZone id={INV_DROP_ROOT} label="Pack (unpacked)">
              {rootItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {noMatches ? "No matching items here." : "Drop items here or leave new gear unpacked."}
                </p>
              ) : (
                rootItems.map((item) => (
                  <DraggableItemRow
                    key={item.uid}
                    item={item}
                    onRemove={() => onRemoveInventoryItem(item.uid)}
                    onSetQuantity={(q) => onSetItemQuantity(item.uid, q)}
                  />
                ))
              )}
            </DroppableZone>

            <SortableContext items={containerSortIds} strategy={verticalListSortingStrategy}>
              {containers.map((c) => {
                const inBox = filteredAll.filter((i) => resolveItemZone(i, validIds) === c.id)
                const count = inventory.filter((i) => resolveItemZone(i, validIds) === c.id).length
                return (
                  <SortableContainerBlock
                    key={c.id}
                    container={c}
                    count={count}
                    inBox={inBox}
                    onRenameContainer={onRenameContainer}
                    onRemoveContainer={onRemoveContainer}
                    onRemoveInventoryItem={onRemoveInventoryItem}
                    onSetItemQuantity={onSetItemQuantity}
                  />
                )
              })}
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </div>
  )
}
