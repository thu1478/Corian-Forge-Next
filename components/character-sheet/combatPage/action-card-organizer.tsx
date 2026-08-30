"use client"

import { useCallback, useMemo, useState, type ReactNode } from "react"
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    defaultDropAnimationSideEffects,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DropAnimation,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ChevronRight, Folder } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActionLayout } from "@/lib/character-data"
import type { ActionCard } from "@/lib/rules"
import {
    applyContainerOrderFromSortableIds,
    breadcrumbDropId,
    createEmptyFolder,
    folderIsDescendantOf,
    ACTION_MOVE_OUT_DROP_ID,
    parseBreadcrumbDropId,
    parseLayoutSortableId,
    renameFolder,
    resolveContainerDisplayRows,
    sortActionsDefault,
    moveEntryToContainer,
    moveFolderIntoFolder,
} from "@/logic/actions/action-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ActionTile } from "@/components/character-sheet/combatPage/action-tile"
import { ActionFolderTile } from "@/components/character-sheet/combatPage/action-folder-tile"
import { isActionCardInteractiveTarget } from "@/logic/actions/action-card-interaction"

const CARD_GRID_CLASS = "grid grid-cols-1 md:grid-cols-2 gap-4"

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: "0.4" } },
    }),
}

export type ActionCardRenderOptions = {
    isEditMode: boolean
    editCollapseSignal?: number
}

export type ActionCardOrganizerProps = {
    visibleActions: ActionCard[]
    actionLayout: ActionLayout
    onLayoutChange: (layout: ActionLayout) => void
    viewMode: "grid" | "list"
    renderActionCard: (action: ActionCard, opts: ActionCardRenderOptions) => ReactNode
    maintainActive?: boolean
    onMaintainActiveChange?: (active: boolean) => void
    maintainBreakDamage?: number
}

function isInteractiveTarget(target: EventTarget | null): boolean {
    return isActionCardInteractiveTarget(target)
}

class ActionLayoutPointerSensor extends PointerSensor {
    static activators = [
        {
            eventName: "onPointerDown" as const,
            handler: ({ nativeEvent: event }: { nativeEvent: Event }) => {
                if (event instanceof MouseEvent && event.button !== 0) return false
                if (event instanceof PointerEvent && !event.isPrimary) return false
                if (isInteractiveTarget(event.target)) return false
                return true
            },
        },
    ]
}

function ViewFolderTile({
    folderId,
    name,
    actionLayout,
    visibleActions,
    onOpen,
}: {
    folderId: string
    name: string
    actionLayout: ActionLayout
    visibleActions: ActionCard[]
    onOpen: () => void
}) {
    return (
        <ActionFolderTile
            folderId={folderId}
            name={name}
            actionLayout={actionLayout}
            visibleActions={visibleActions}
            variant="card"
            onClick={onOpen}
        />
    )
}

function FolderRenameBar({
    name,
    onRename,
}: {
    name: string
    onRename: (name: string) => void
}) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
                value={name}
                onChange={(e) => onRename(e.target.value)}
                className="h-8 max-w-xs text-sm"
                aria-label={`Rename folder ${name}`}
                data-action-no-edit
            />
        </div>
    )
}

function ViewBreadcrumbNav({
    trail,
    onNavigate,
}: {
    trail: { id: string | null; label: string }[]
    onNavigate: (index: number) => void
}) {
    if (trail.length <= 1) return null
    return (
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Action folder path">
            {trail.map((crumb, i) => (
                <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                    {i > 0 ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : null}
                    <button
                        type="button"
                        onClick={() => onNavigate(i)}
                        className={cn(
                            "rounded px-2 py-0.5 text-sm",
                            i === trail.length - 1
                                ? "font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {crumb.label}
                    </button>
                </span>
            ))}
        </nav>
    )
}

function BreadcrumbNav({
    trail,
    onNavigate,
    dropHighlightId,
}: {
    trail: { id: string | null; label: string }[]
    onNavigate: (index: number) => void
    dropHighlightId?: string | null
}) {
    return (
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Action folder path">
            {trail.map((crumb, i) => (
                <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                    {i > 0 ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : null}
                    <BreadcrumbDrop
                        id={breadcrumbDropId(crumb.id)}
                        label={crumb.label}
                        isActive={i === trail.length - 1}
                        isDropHighlight={dropHighlightId === breadcrumbDropId(crumb.id)}
                        onNavigate={() => onNavigate(i)}
                    />
                </span>
            ))}
        </nav>
    )
}

function BreadcrumbDrop({
    id,
    label,
    isActive,
    isDropHighlight,
    onNavigate,
}: {
    id: string
    label: string
    isActive: boolean
    isDropHighlight?: boolean
    onNavigate: () => void
}) {
    const { setNodeRef, isOver } = useDroppable({ id })
    return (
        <button
            ref={setNodeRef}
            type="button"
            onClick={onNavigate}
            className={cn(
                "rounded px-2 py-0.5 text-sm transition-colors",
                isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                (isOver || isDropHighlight) && "bg-primary/15 ring-1 ring-primary/40"
            )}
        >
            {label}
        </button>
    )
}

function MoveOutDropZone({
    label,
    isDropHighlight,
}: {
    label: string
    isDropHighlight: boolean
}) {
    const { setNodeRef, isOver } = useDroppable({ id: ACTION_MOVE_OUT_DROP_ID })
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "rounded-lg border-2 border-dashed px-3 py-2 text-center text-xs font-medium transition-colors",
                isOver || isDropHighlight
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
            )}
        >
            Drop here to move to {label}
        </div>
    )
}

function EditListActionSlot({
    sortId,
    render,
}: {
    sortId: string
    render: (opts: ActionCardRenderOptions) => ReactNode
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: sortId,
    })
    const style = {
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative rounded-xl ring-1 ring-primary/30"
        >
            <div
                {...attributes}
                {...listeners}
                className="touch-none cursor-grab active:cursor-grabbing"
            >
                {render({ isEditMode: true })}
            </div>
        </div>
    )
}

function EditListFolderRow({
    folderId,
    name,
    actionLayout,
    visibleActions,
    onOpen,
    isNestTarget,
    onNestHint,
}: {
    folderId: string
    name: string
    actionLayout: ActionLayout
    visibleActions: ActionCard[]
    onOpen: () => void
    isNestTarget: boolean
    onNestHint: boolean
}) {
    const sortId = `folder:${folderId}`
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: sortId,
    })
    const { setNodeRef: dropRef, isOver } = useDroppable({ id: sortId })

    const style = {
        transform: isDragging ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
    }

    return (
        <div
            ref={(node) => {
                setNodeRef(node)
                dropRef(node)
            }}
            style={style}
            className="relative w-full min-w-0"
        >
            <div {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
                <ActionFolderTile
                    folderId={folderId}
                    name={name}
                    actionLayout={actionLayout}
                    visibleActions={visibleActions}
                    variant="card"
                    isEditMode
                    isDragging={isDragging}
                    isNestTarget={isNestTarget}
                    isNestHint={onNestHint || isOver}
                    onClick={onOpen}
                    tabIndex={-1}
                />
            </div>
        </div>
    )
}

export function ActionCardOrganizer({
    visibleActions,
    actionLayout,
    onLayoutChange,
    viewMode,
    renderActionCard,
    maintainActive = false,
    onMaintainActiveChange,
    maintainBreakDamage = 0,
}: ActionCardOrganizerProps) {
    const isGrid = viewMode === "grid"

    const [listFolderStack, setListFolderStack] = useState<string[]>([])
    const [gridFolderStack, setGridFolderStack] = useState<string[]>([])
    const [isEditMode, setIsEditMode] = useState(false)
    const [editCollapseSignal, setEditCollapseSignal] = useState(0)
    const [folderNestTargetId, setFolderNestTargetId] = useState<string | null>(null)
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const [activeDragAction, setActiveDragAction] = useState<ActionCard | null>(null)
    const [activeDragFolderId, setActiveDragFolderId] = useState<string | null>(null)
    const [dropHighlightId, setDropHighlightId] = useState<string | null>(null)

    const activeFolderStack = isGrid ? gridFolderStack : listFolderStack
    const editContainerId = activeFolderStack.at(-1) ?? null
    const listContainerId = listFolderStack.at(-1) ?? null
    const gridContainerId = gridFolderStack.at(-1) ?? null

    const visibleKeys = useMemo(
        () => new Set(visibleActions.map((a) => a.instanceKey ?? a.id)),
        [visibleActions]
    )

    const actionByKey = useMemo(() => {
        const map = new Map<string, ActionCard>()
        for (const action of visibleActions) {
            map.set(action.instanceKey ?? action.id, action)
        }
        return map
    }, [visibleActions])

    const editRows = useMemo(
        () =>
            resolveContainerDisplayRows(visibleActions, actionLayout, editContainerId, {
                includeEmptyFolders: true,
            }).rows,
        [visibleActions, actionLayout, editContainerId]
    )
    const editUnplaced = useMemo(
        () =>
            editContainerId == null
                ? resolveContainerDisplayRows(visibleActions, actionLayout, null).unplacedAtRoot
                : [],
        [visibleActions, actionLayout, editContainerId]
    )

    const listRows = useMemo(
        () => resolveContainerDisplayRows(visibleActions, actionLayout, listContainerId).rows,
        [visibleActions, actionLayout, listContainerId]
    )
    const listUnplaced = useMemo(
        () =>
            listContainerId == null
                ? resolveContainerDisplayRows(visibleActions, actionLayout, null).unplacedAtRoot
                : [],
        [visibleActions, actionLayout, listContainerId]
    )

    const gridRows = useMemo(
        () => resolveContainerDisplayRows(visibleActions, actionLayout, gridContainerId).rows,
        [visibleActions, actionLayout, gridContainerId]
    )
    const gridUnplaced = useMemo(
        () =>
            gridContainerId == null
                ? resolveContainerDisplayRows(visibleActions, actionLayout, null).unplacedAtRoot
                : [],
        [visibleActions, actionLayout, gridContainerId]
    )

    const sortableIds = useMemo(() => {
        const ids: string[] = []
        for (const row of editRows) {
            ids.push(row.kind === "folder" ? `folder:${row.id}` : `action:${row.key}`)
        }
        if (editContainerId == null) {
            for (const a of sortActionsDefault(editUnplaced)) {
                ids.push(`action:${a.instanceKey ?? a.id}`)
            }
        }
        return ids
    }, [editRows, editUnplaced, editContainerId])

    const sensors = useSensors(
        useSensor(ActionLayoutPointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const folderStackForView = isGrid ? gridFolderStack : listFolderStack

    const viewBreadcrumbTrail = useMemo(() => {
        const trail: { id: string | null; label: string }[] = [{ id: null, label: "Actions" }]
        for (const fid of folderStackForView) {
            trail.push({
                id: fid,
                label: actionLayout.folders[fid]?.name ?? "Folder",
            })
        }
        return trail
    }, [folderStackForView, actionLayout.folders])

    const editBreadcrumbTrail = useMemo(() => {
        const trail: { id: string | null; label: string }[] = [{ id: null, label: "Actions" }]
        for (const fid of activeFolderStack) {
            trail.push({
                id: fid,
                label: actionLayout.folders[fid]?.name ?? "Folder",
            })
        }
        return trail
    }, [activeFolderStack, actionLayout.folders])

    const moveOutTargetLabel =
        editContainerId != null
            ? activeFolderStack.length > 1
                ? (actionLayout.folders[activeFolderStack[activeFolderStack.length - 2]!]?.name ??
                  "parent folder")
                : "Actions"
            : "Actions"

    const enterEditMode = useCallback(() => {
        setEditCollapseSignal((s) => s + 1)
        setIsEditMode(true)
    }, [])

    const exitEditMode = useCallback(() => setIsEditMode(false), [])

    const navigateViewCrumb = useCallback(
        (index: number) => {
            const next = folderStackForView.slice(0, index)
            if (isGrid) setGridFolderStack(next)
            else setListFolderStack(next)
        },
        [folderStackForView, isGrid]
    )

    const navigateEditCrumb = useCallback(
        (index: number) => {
            const next = activeFolderStack.slice(0, index)
            if (isGrid) setGridFolderStack(next)
            else setListFolderStack(next)
        },
        [activeFolderStack, isGrid]
    )

    const cardOpts = useCallback(
        (extra: Partial<ActionCardRenderOptions> = {}): ActionCardRenderOptions => ({
            isEditMode,
            editCollapseSignal: isEditMode ? editCollapseSignal : undefined,
            ...extra,
        }),
        [isEditMode, editCollapseSignal]
    )

    const handleCreateFolder = useCallback(() => {
        const { layout, folderId } = createEmptyFolder(actionLayout, editContainerId)
        onLayoutChange(layout)
        if (isGrid) {
            setGridFolderStack((s) => [...s, folderId])
        } else {
            setListFolderStack((s) => [...s, folderId])
        }
    }, [actionLayout, editContainerId, isGrid, onLayoutChange])

    const updateDragOverHighlights = useCallback(
        (event: DragOverEvent) => {
            setFolderNestTargetId(null)
            setDropHighlightId(null)

            const activeId = event.active?.id ? String(event.active.id) : null
            const overId = event.over?.id ? String(event.over.id) : null
            if (!activeId || !overId) return

            if (parseBreadcrumbDropId(overId) !== undefined) {
                setDropHighlightId(overId)
                return
            }
            if (overId === ACTION_MOVE_OUT_DROP_ID) {
                setDropHighlightId(overId)
                return
            }

            const active = parseLayoutSortableId(activeId)
            const over = parseLayoutSortableId(overId)
            if (!active || !over) return

            if (over.kind === "folder") {
                if (active.kind === "action") {
                    setFolderNestTargetId(over.id)
                    return
                }
                if (
                    active.kind === "folder" &&
                    active.id !== over.id &&
                    !folderIsDescendantOf(actionLayout, active.id, over.id)
                ) {
                    setFolderNestTargetId(over.id)
                    return
                }
            }
        },
        [actionLayout]
    )

    const handleDragEnd = useCallback(
        (event: DragEndEvent, containerFolderId: string | null, folderStack: string[]) => {
            const { active, over } = event
            const activeId = String(active.id)
            setActiveDragId(null)
            setActiveDragAction(null)
            setActiveDragFolderId(null)
            setFolderNestTargetId(null)
            setDropHighlightId(null)

            if (!over) return

            const overId = String(over.id)
            const activeParsed = parseLayoutSortableId(activeId)
            const overParsed = parseLayoutSortableId(overId)

            if (overId === ACTION_MOVE_OUT_DROP_ID && containerFolderId != null) {
                if (!activeParsed) return
                const targetContainer =
                    folderStack.length > 1 ? folderStack[folderStack.length - 2]! : null
                const next =
                    activeParsed.kind === "action"
                        ? moveEntryToContainer(
                              actionLayout,
                              "action",
                              activeParsed.key,
                              targetContainer
                          )
                        : moveEntryToContainer(
                              actionLayout,
                              "folder",
                              activeParsed.id,
                              targetContainer
                          )
                if (next) onLayoutChange(next)
                return
            }

            const breadcrumbTarget = parseBreadcrumbDropId(overId)
            if (breadcrumbTarget !== undefined) {
                const parsed = parseLayoutSortableId(activeId)
                if (!parsed) return
                const next =
                    parsed.kind === "action"
                        ? moveEntryToContainer(
                              actionLayout,
                              "action",
                              parsed.key,
                              breadcrumbTarget
                          )
                        : moveEntryToContainer(
                              actionLayout,
                              "folder",
                              parsed.id,
                              breadcrumbTarget
                          )
                if (next) onLayoutChange(next)
                return
            }

            if (overParsed?.kind === "folder" && activeParsed) {
                if (activeParsed.kind === "action") {
                    const layoutBase = applyContainerOrderFromSortableIds(
                        actionLayout,
                        containerFolderId,
                        sortableIds,
                        visibleKeys
                    )
                    const next = moveEntryToContainer(
                        layoutBase,
                        "action",
                        activeParsed.key,
                        overParsed.id
                    )
                    if (next) {
                        onLayoutChange(next)
                        return
                    }
                } else if (
                    activeParsed.kind === "folder" &&
                    activeParsed.id !== overParsed.id
                ) {
                    const next = moveFolderIntoFolder(
                        actionLayout,
                        activeParsed.id,
                        overParsed.id
                    )
                    if (next) {
                        onLayoutChange(next)
                        return
                    }
                }
                return
            }

            const oldIndex = sortableIds.indexOf(activeId)
            const newIndex = sortableIds.indexOf(overId)
            if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
                const newOrder = arrayMove(sortableIds, oldIndex, newIndex)
                onLayoutChange(
                    applyContainerOrderFromSortableIds(
                        actionLayout,
                        containerFolderId,
                        newOrder,
                        visibleKeys
                    )
                )
            }
        },
        [actionLayout, onLayoutChange, sortableIds, visibleKeys, isGrid]
    )

    const renderMaintainToggle = () => (
        <div
            className={cn(
                "flex h-8 items-center gap-2 rounded-full border px-2.5 transition-colors",
                maintainActive
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-muted/30",
            )}
            title={`Ends if you take ${maintainBreakDamage} or more damage in one turn (half Willpower, round up)`}
        >
            <Label
                htmlFor="combat-maintain-toggle"
                className={cn(
                    "cursor-pointer text-[10px] font-black uppercase tracking-widest whitespace-nowrap",
                    maintainActive ? "text-primary" : "text-muted-foreground",
                )}
            >
                Maintain
            </Label>
            <Switch
                id="combat-maintain-toggle"
                checked={maintainActive}
                onCheckedChange={(checked) => onMaintainActiveChange?.(checked)}
                className={cn(
                    // Changes the thumb color: slate-900 in light mode when checked, white in dark mode
                    "[&>span]:bg-slate-900 dark:[&>span]:bg-white",
                    // Optional: change thumb color when inactive/off
                    !maintainActive && "[&>span]:bg-slate-700 dark:[&>span]:bg-slate-200"
                )}
                aria-label={
                    maintainActive
                        ? `Maintain on. Ends if you take ${maintainBreakDamage} or more damage in one turn`
                        : `Maintain off. Breaks at ${maintainBreakDamage} damage in one turn`
                }
            />
            <span
                className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums leading-none",
                    maintainActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                )}
            >
                {maintainBreakDamage} HP
            </span>
        </div>
    )

    const renderViewToolbar = () => (
        <div className="flex items-center justify-between gap-2">
            {renderMaintainToggle()}
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={enterEditMode}>
                Edit layout
            </Button>
        </div>
    )

    const renderEditChrome = (containerFolderId: string | null) => (
        <>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                    Edit layout — drag to reorder; drop on a folder to move in
                </span>
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={handleCreateFolder}
                    >
                        <Folder className="h-3.5 w-3.5" aria-hidden />
                        New folder
                    </Button>
                    <Button type="button" variant="secondary" size="sm" className="h-8" onClick={exitEditMode}>
                        Done
                    </Button>
                </div>
            </div>
            {containerFolderId != null ? (
                <>
                    <FolderRenameBar
                        name={actionLayout.folders[containerFolderId]?.name ?? "Folder"}
                        onRename={(name) =>
                            onLayoutChange(renameFolder(actionLayout, containerFolderId, name))
                        }
                    />
                    <BreadcrumbNav
                        trail={editBreadcrumbTrail}
                        onNavigate={navigateEditCrumb}
                        dropHighlightId={dropHighlightId}
                    />
                    <MoveOutDropZone
                        label={moveOutTargetLabel}
                        isDropHighlight={dropHighlightId === ACTION_MOVE_OUT_DROP_ID}
                    />
                </>
            ) : null}
        </>
    )

    const renderDndOverlay = () => (
        <DragOverlay dropAnimation={dropAnimation}>
            {activeDragAction ? (
                <ActionTile action={activeDragAction} size="sm" />
            ) : activeDragFolderId ? (
                <ActionFolderTile
                    folderId={activeDragFolderId}
                    name={actionLayout.folders[activeDragFolderId]?.name ?? "Folder"}
                    actionLayout={actionLayout}
                    visibleActions={visibleActions}
                    variant="compact"
                />
            ) : null}
        </DragOverlay>
    )

    const onDragStart = (id: string) => {
        setActiveDragId(id)
        const parsed = parseLayoutSortableId(id)
        if (parsed?.kind === "action") {
            setActiveDragAction(actionByKey.get(parsed.key) ?? null)
            setActiveDragFolderId(null)
        } else if (parsed?.kind === "folder") {
            setActiveDragFolderId(parsed.id)
            setActiveDragAction(null)
        }
    }

    const renderEditFolderRow = (
        row: { kind: "folder"; id: string; folder: { name: string } },
        onFolderOpen: (id: string) => void
    ) => (
        <EditListFolderRow
            key={`folder:${row.id}`}
            folderId={row.id}
            name={row.folder.name}
            actionLayout={actionLayout}
            visibleActions={visibleActions}
            onOpen={() => onFolderOpen(row.id)}
            isNestTarget={
                activeDragId != null &&
                activeDragId !== `folder:${row.id}` &&
                (parseLayoutSortableId(activeDragId)?.kind === "action" ||
                    parseLayoutSortableId(activeDragId)?.kind === "folder")
            }
            onNestHint={folderNestTargetId === row.id}
        />
    )

    const renderEditActionSlot = (action: ActionCard) => {
        const sortId = `action:${action.instanceKey ?? action.id}`
        return (
            <EditListActionSlot
                key={sortId}
                sortId={sortId}
                render={(opts) =>
                    renderActionCard(action, {
                        ...opts,
                        editCollapseSignal,
                    })
                }
            />
        )
    }

    const renderListEditGrid = () => (
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
                {editRows.map((row) =>
                    row.kind === "folder"
                        ? renderEditFolderRow(row, (id) => setListFolderStack((s) => [...s, id]))
                        : renderEditActionSlot(row.action)
                )}
                {editContainerId == null
                    ? sortActionsDefault(editUnplaced).map((action) => renderEditActionSlot(action))
                    : null}
            </div>
        </SortableContext>
    )

    const renderGridEditGrid = () => (
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            <div className={CARD_GRID_CLASS}>
                {editRows.map((row) =>
                    row.kind === "folder"
                        ? renderEditFolderRow(row, (id) =>
                              setGridFolderStack((s) => [...s, id])
                          )
                        : renderEditActionSlot(row.action)
                )}
                {editContainerId == null
                    ? sortActionsDefault(editUnplaced).map((action) => renderEditActionSlot(action))
                    : null}
            </div>
        </SortableContext>
    )

    const renderViewFolderTile = (
        folderId: string,
        name: string,
        onOpen: () => void
    ) => (
        <ViewFolderTile
            key={`folder:${folderId}`}
            folderId={folderId}
            name={name}
            actionLayout={actionLayout}
            visibleActions={visibleActions}
            onOpen={onOpen}
        />
    )

    const renderGridView = () => (
        <>
            {renderViewToolbar()}
            <ViewBreadcrumbNav trail={viewBreadcrumbTrail} onNavigate={navigateViewCrumb} />
            <div className={CARD_GRID_CLASS}>
                {gridRows.map((row) => {
                    if (row.kind === "folder") {
                        return renderViewFolderTile(row.id, row.folder.name, () =>
                            setGridFolderStack((s) => [...s, row.id]))
                    }
                    return (
                        <div key={`action:${row.key}`} className="w-full min-w-0">
                            {renderActionCard(row.action, cardOpts())}
                        </div>
                    )
                })}
                {gridContainerId == null
                    ? sortActionsDefault(gridUnplaced).map((action) => (
                          <div
                              key={`action:${action.instanceKey ?? action.id}`}
                              className="w-full min-w-0"
                          >
                              {renderActionCard(action, cardOpts())}
                          </div>
                      ))
                    : null}
            </div>
        </>
    )

    const renderListView = () => (
        <>
            {renderViewToolbar()}
            <ViewBreadcrumbNav trail={viewBreadcrumbTrail} onNavigate={navigateViewCrumb} />
            <div className="space-y-4">
                {listRows.map((row) => {
                    if (row.kind === "folder") {
                        return renderViewFolderTile(row.id, row.folder.name, () =>
                            setListFolderStack((s) => [...s, row.id]))
                    }
                    return (
                        <div key={`action:${row.key}`} className="w-full min-w-0">
                            {renderActionCard(row.action, cardOpts())}
                        </div>
                    )
                })}
                {listContainerId == null
                    ? sortActionsDefault(listUnplaced).map((action) => (
                          <div
                              key={`action:${action.instanceKey ?? action.id}`}
                              className="w-full min-w-0"
                          >
                              {renderActionCard(action, cardOpts())}
                          </div>
                      ))
                    : null}
            </div>
        </>
    )

    return (
        <div className="space-y-3">
            {isEditMode ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={(e) => onDragStart(String(e.active.id))}
                    onDragOver={updateDragOverHighlights}
                    onDragEnd={(e) => handleDragEnd(e, editContainerId, activeFolderStack)}
                    onDragCancel={() => {
                        setActiveDragId(null)
                        setActiveDragAction(null)
                        setActiveDragFolderId(null)
                        setFolderNestTargetId(null)
                        setDropHighlightId(null)
                    }}
                >
                    {renderEditChrome(editContainerId)}
                    {isGrid ? renderGridEditGrid() : renderListEditGrid()}
                    {renderDndOverlay()}
                </DndContext>
            ) : isGrid ? (
                renderGridView()
            ) : (
                renderListView()
            )}
        </div>
    )
}
