import type { ActionLayout, ActionLayoutEntry, ActionFolder } from "@/lib/character-data"
import type { ActionCard } from "@/lib/rules"

export function actionInstanceKey(action: Pick<ActionCard, "id" | "instanceKey">): string {
    return action.instanceKey ?? action.id
}

export function emptyActionLayout(): ActionLayout {
    return { root: [], folders: {} }
}

export function makeActionFolderId(): string {
    return `af_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function cloneLayout(layout: ActionLayout): ActionLayout {
    return {
        root: layout.root.map((e) => ({ ...e })),
        folders: Object.fromEntries(
            Object.entries(layout.folders).map(([id, f]) => [
                id,
                { ...f, items: f.items.map((e) => ({ ...e })) },
            ])
        ),
    }
}

function isFolderEntry(e: ActionLayoutEntry): e is { type: "folder"; id: string } {
    return e.type === "folder"
}

function isActionEntry(e: ActionLayoutEntry): e is { type: "action"; key: string } {
    return e.type === "action"
}

/** `null` = root container. */
export function getContainerItems(
    layout: ActionLayout,
    containerFolderId: string | null
): ActionLayoutEntry[] {
    if (containerFolderId == null) return layout.root
    return layout.folders[containerFolderId]?.items ?? []
}

function setContainerItems(
    layout: ActionLayout,
    containerFolderId: string | null,
    items: ActionLayoutEntry[]
): ActionLayout {
    if (containerFolderId == null) {
        return { ...layout, root: items }
    }
    const folder = layout.folders[containerFolderId]
    if (!folder) return layout
    return {
        ...layout,
        folders: {
            ...layout.folders,
            [containerFolderId]: { ...folder, items },
        },
    }
}

export function findEntryContainer(
    layout: ActionLayout,
    entryId: string,
    entryKind: "action" | "folder"
): string | null | undefined {
    const matches = (items: ActionLayoutEntry[]) =>
        items.some((e) =>
            entryKind === "action"
                ? e.type === "action" && e.key === entryId
                : e.type === "folder" && e.id === entryId
        )

    if (matches(layout.root)) return null

    for (const [folderId, folder] of Object.entries(layout.folders)) {
        if (matches(folder.items)) return folderId
    }
    return undefined
}

export function folderIsDescendantOf(
    layout: ActionLayout,
    ancestorId: string,
    candidateId: string
): boolean {
    if (ancestorId === candidateId) return true
    const folder = layout.folders[ancestorId]
    if (!folder) return false

    for (const entry of folder.items) {
        if (!isFolderEntry(entry)) continue
        if (entry.id === candidateId) return true
        if (folderIsDescendantOf(layout, entry.id, candidateId)) return true
    }
    return false
}

export function collectPlacedActionKeys(layout: ActionLayout): Set<string> {
    const keys = new Set<string>()

    function walk(items: ActionLayoutEntry[]) {
        for (const entry of items) {
            if (isActionEntry(entry)) keys.add(entry.key)
            else if (isFolderEntry(entry)) {
                const folder = layout.folders[entry.id]
                if (folder) walk(folder.items)
            }
        }
    }

    walk(layout.root)
    return keys
}

export function folderHasVisibleActions(
    folderId: string,
    visibleKeys: ReadonlySet<string>,
    layout: ActionLayout
): boolean {
    const folder = layout.folders[folderId]
    if (!folder) return false

    function walk(items: ActionLayoutEntry[]): boolean {
        for (const entry of items) {
            if (isActionEntry(entry)) {
                if (visibleKeys.has(entry.key)) return true
            } else if (isFolderEntry(entry)) {
                if (folderHasVisibleActions(entry.id, visibleKeys, layout)) return true
            }
        }
        return false
    }

    return walk(folder.items)
}

export function folderIsDisplayable(
    folderId: string,
    visibleKeys: ReadonlySet<string>,
    layout: ActionLayout
): boolean {
    return folderHasVisibleActions(folderId, visibleKeys, layout)
}

export function reorderInContainer(
    layout: ActionLayout,
    containerFolderId: string | null,
    fromIndex: number,
    toIndex: number
): ActionLayout {
    const next = cloneLayout(layout)
    const items = [...getContainerItems(next, containerFolderId)]
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
        return layout
    }
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    return setContainerItems(next, containerFolderId, items)
}

function removeFolderRefFromTree(layout: ActionLayout, folderId: string): ActionLayout {
    const next = cloneLayout(layout)

    function filterItems(items: ActionLayoutEntry[]): ActionLayoutEntry[] {
        return items.filter((e) => !(isFolderEntry(e) && e.id === folderId))
    }

    next.root = filterItems(next.root)
    for (const id of Object.keys(next.folders)) {
        next.folders[id] = {
            ...next.folders[id],
            items: filterItems(next.folders[id].items),
        }
    }
    return next
}

export function createFolderFromMerge(
    layout: ActionLayout,
    containerFolderId: string | null,
    sourceKey: string,
    targetKey: string,
    newFolderId: string = makeActionFolderId()
): { layout: ActionLayout; folderId: string } | null {
    if (sourceKey === targetKey) return null

    let next = cloneLayout(layout)
    const items = [...getContainerItems(next, containerFolderId)]
    const targetIdx = items.findIndex((e) => isActionEntry(e) && e.key === targetKey)
    const sourceIdx = items.findIndex((e) => isActionEntry(e) && e.key === sourceKey)
    if (targetIdx < 0 || sourceIdx < 0) return null

    const filtered = items.filter(
        (e) => !(isActionEntry(e) && (e.key === sourceKey || e.key === targetKey))
    )
    const insertAt = items
        .slice(0, targetIdx)
        .filter((e) => !(isActionEntry(e) && (e.key === sourceKey || e.key === targetKey))).length

    const folder: ActionFolder = {
        id: newFolderId,
        name: "New folder",
        items: [
            { type: "action", key: targetKey },
            { type: "action", key: sourceKey },
        ],
    }

    filtered.splice(insertAt, 0, { type: "folder", id: newFolderId })
    next = setContainerItems(next, containerFolderId, filtered)
    next.folders = { ...next.folders, [newFolderId]: folder }

    return { layout: next, folderId: newFolderId }
}

export function createEmptyFolder(
    layout: ActionLayout,
    containerFolderId: string | null,
    name = "New folder",
    newFolderId: string = makeActionFolderId()
): { layout: ActionLayout; folderId: string } {
    let next = cloneLayout(layout)
    const items = [...getContainerItems(next, containerFolderId)]
    const folder: ActionFolder = {
        id: newFolderId,
        name,
        items: [],
    }
    items.push({ type: "folder", id: newFolderId })
    next = setContainerItems(next, containerFolderId, items)
    next.folders = { ...next.folders, [newFolderId]: folder }
    return { layout: next, folderId: newFolderId }
}

export function moveFolderIntoFolder(
    layout: ActionLayout,
    sourceFolderId: string,
    targetFolderId: string
): ActionLayout | null {
    if (sourceFolderId === targetFolderId) return null
    if (!layout.folders[sourceFolderId] || !layout.folders[targetFolderId]) return null
    if (folderIsDescendantOf(layout, sourceFolderId, targetFolderId)) return null
    if (folderIsDescendantOf(layout, targetFolderId, sourceFolderId)) return null

    let next = removeFolderRefFromTree(cloneLayout(layout), sourceFolderId)
    const targetItems = [...getContainerItems(next, targetFolderId)]
    targetItems.push({ type: "folder", id: sourceFolderId })
    next = setContainerItems(next, targetFolderId, targetItems)
    return next
}

export function renameFolder(
    layout: ActionLayout,
    folderId: string,
    name: string
): ActionLayout {
    const folder = layout.folders[folderId]
    if (!folder) return layout
    const trimmed = name.trim() || folder.name
    return {
        ...layout,
        folders: {
            ...layout.folders,
            [folderId]: { ...folder, name: trimmed },
        },
    }
}

export function moveEntryToContainer(
    layout: ActionLayout,
    entryKind: "action" | "folder",
    entryId: string,
    targetContainerFolderId: string | null,
    insertIndex?: number
): ActionLayout | null {
    const sourceContainer = findEntryContainer(layout, entryId, entryKind)
    if (sourceContainer === undefined) return null
    if (entryKind === "folder" && targetContainerFolderId != null) {
        if (
            entryId === targetContainerFolderId ||
            folderIsDescendantOf(layout, entryId, targetContainerFolderId)
        ) {
            return null
        }
    }

    let next = cloneLayout(layout)
    let removed: ActionLayoutEntry | null = null

    const pullFrom = (items: ActionLayoutEntry[]) => {
        const idx = items.findIndex((e) =>
            entryKind === "action"
                ? isActionEntry(e) && e.key === entryId
                : isFolderEntry(e) && e.id === entryId
        )
        if (idx < 0) return items
        removed = items[idx]
        const copy = [...items]
        copy.splice(idx, 1)
        return copy
    }

    if (sourceContainer == null) {
        next.root = pullFrom(next.root)
    } else {
        const f = next.folders[sourceContainer]
        if (f) {
            next.folders[sourceContainer] = { ...f, items: pullFrom(f.items) }
        }
    }

    if (!removed) return null

    const targetItems = [...getContainerItems(next, targetContainerFolderId)]
    const at =
        insertIndex != null && insertIndex >= 0 && insertIndex <= targetItems.length
            ? insertIndex
            : targetItems.length
    targetItems.splice(at, 0, removed)
    next = setContainerItems(next, targetContainerFolderId, targetItems)
    return next
}

export function unplacedVisibleActions(
    visibleActions: ActionCard[],
    layout: ActionLayout
): ActionCard[] {
    const placed = collectPlacedActionKeys(layout)
    return visibleActions.filter((a) => !placed.has(actionInstanceKey(a)))
}

export type ResolvedLayoutRow =
    | { kind: "action"; key: string; action: ActionCard }
    | { kind: "folder"; id: string; folder: ActionFolder }

export type FolderPreviewEntry =
    | { kind: "action"; key: string; action: ActionCard }
    | { kind: "folder"; id: string; folder: ActionFolder }

/** Visible direct children of a folder for Android-style preview tiles. */
export function resolveFolderPreviewEntries(
    folderId: string,
    visibleActions: ActionCard[],
    layout: ActionLayout,
    limit = 4
): FolderPreviewEntry[] {
    const visibleByKey = new Map(visibleActions.map((a) => [actionInstanceKey(a), a]))
    const visibleKeys = new Set(visibleByKey.keys())
    const folder = layout.folders[folderId]
    if (!folder) return []

    const out: FolderPreviewEntry[] = []
    for (const entry of folder.items) {
        if (out.length >= limit) break
        if (isActionEntry(entry)) {
            const action = visibleByKey.get(entry.key)
            if (action) out.push({ kind: "action", key: entry.key, action })
        } else if (isFolderEntry(entry)) {
            const nested = layout.folders[entry.id]
            if (nested && folderIsDisplayable(entry.id, visibleKeys, layout)) {
                out.push({ kind: "folder", id: entry.id, folder: nested })
            }
        }
    }
    return out
}

export function countVisibleFolderEntries(
    folderId: string,
    visibleActions: ActionCard[],
    layout: ActionLayout
): number {
    const visibleByKey = new Map(visibleActions.map((a) => [actionInstanceKey(a), a]))
    const visibleKeys = new Set(visibleByKey.keys())
    const folder = layout.folders[folderId]
    if (!folder) return 0

    let count = 0
    for (const entry of folder.items) {
        if (isActionEntry(entry)) {
            if (visibleByKey.has(entry.key)) count++
        } else if (isFolderEntry(entry)) {
            if (folderIsDisplayable(entry.id, visibleKeys, layout)) count++
        }
    }
    return count
}

export type ResolveContainerDisplayOptions = {
    /** Include folder entries even when empty (edit layout). */
    includeEmptyFolders?: boolean
}

export function resolveContainerDisplayRows(
    visibleActions: ActionCard[],
    layout: ActionLayout,
    containerFolderId: string | null,
    options?: ResolveContainerDisplayOptions
): { rows: ResolvedLayoutRow[]; unplacedAtRoot: ActionCard[] } {
    const visibleByKey = new Map(visibleActions.map((a) => [actionInstanceKey(a), a]))
    const visibleKeys = new Set(visibleByKey.keys())
    const items = getContainerItems(layout, containerFolderId)
    const rows: ResolvedLayoutRow[] = []

    for (const entry of items) {
        if (isActionEntry(entry)) {
            const action = visibleByKey.get(entry.key)
            if (action) rows.push({ kind: "action", key: entry.key, action })
        } else if (isFolderEntry(entry)) {
            const folder = layout.folders[entry.id]
            if (
                folder &&
                (options?.includeEmptyFolders ||
                    folderIsDisplayable(entry.id, visibleKeys, layout))
            ) {
                rows.push({ kind: "folder", id: entry.id, folder })
            }
        }
    }

    const unplacedAtRoot =
        containerFolderId == null ? unplacedVisibleActions(visibleActions, layout) : []

    return { rows, unplacedAtRoot }
}

export function sanitizeActionLayout(raw: unknown): ActionLayout {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return emptyActionLayout()
    }
    const o = raw as Record<string, unknown>
    const foldersRaw = o.folders
    const folders: Record<string, ActionFolder> = {}

    if (foldersRaw && typeof foldersRaw === "object" && !Array.isArray(foldersRaw)) {
        for (const [id, val] of Object.entries(foldersRaw)) {
            if (!val || typeof val !== "object" || Array.isArray(val)) continue
            const f = val as Record<string, unknown>
            const fid = typeof f.id === "string" && f.id.trim() ? f.id.trim() : id
            const name = typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Folder"
            const items = sanitizeEntryList(f.items, new Set([fid]))
            folders[fid] = { id: fid, name, items }
        }
    }

    const knownFolderIds = new Set(Object.keys(folders))
    for (const folder of Object.values(folders)) {
        folder.items = sanitizeEntryList(folder.items, knownFolderIds)
    }
    const root = sanitizeEntryList(o.root, knownFolderIds)

    return { root, folders }
}

function sanitizeEntryList(raw: unknown, knownFolderIds: Set<string>): ActionLayoutEntry[] {
    if (!Array.isArray(raw)) return []
    const out: ActionLayoutEntry[] = []
    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue
        const e = entry as Record<string, unknown>
        if (e.type === "action" && typeof e.key === "string" && e.key.trim()) {
            out.push({ type: "action", key: e.key.trim() })
        } else if (e.type === "folder" && typeof e.id === "string" && knownFolderIds.has(e.id)) {
            out.push({ type: "folder", id: e.id })
        }
    }
    return out
}

export function sortActionsDefault(actions: ActionCard[]): ActionCard[] {
    return [...actions].sort((a, b) => {
        const fa = a.focusCost ?? 0
        const fb = b.focusCost ?? 0
        if (fa !== fb) return fa - fb
        return (a.apCost ?? 0) - (b.apCost ?? 0)
    })
}

export function layoutSortableId(entry: ActionLayoutEntry): string {
    return entry.type === "action" ? `action:${entry.key}` : `folder:${entry.id}`
}

export function parseLayoutSortableId(
    id: string
): { kind: "action"; key: string } | { kind: "folder"; id: string } | null {
    if (id.startsWith("action:")) return { kind: "action", key: id.slice(7) }
    if (id.startsWith("folder:")) return { kind: "folder", id: id.slice(7) }
    return null
}

export const ACTION_BREADCRUMB_ROOT_ID = "breadcrumb:root"
/** Drop target to move item up one folder level (edit mode). */
export const ACTION_MOVE_OUT_DROP_ID = "move-out:parent"

export function parseBreadcrumbDropId(id: string): string | null | undefined {
    if (id === ACTION_BREADCRUMB_ROOT_ID) return null
    if (id.startsWith("breadcrumb:")) return id.slice(11)
    return undefined
}

export function breadcrumbDropId(folderId: string | null): string {
    return folderId == null ? ACTION_BREADCRUMB_ROOT_ID : `breadcrumb:${folderId}`
}

export function entriesFromSortableIds(ids: string[]): ActionLayoutEntry[] {
    const out: ActionLayoutEntry[] = []
    for (const id of ids) {
        const parsed = parseLayoutSortableId(id)
        if (!parsed) continue
        if (parsed.kind === "action") out.push({ type: "action", key: parsed.key })
        else out.push({ type: "folder", id: parsed.id })
    }
    return out
}

/** Which half of the drop target the dragged item's center is over. */
export function dropZoneFromRects(
    activeTranslated: { top: number; height: number } | null | undefined,
    overRect: { top: number; height: number } | null | undefined
): "top" | "bottom" | null {
    if (!activeTranslated || !overRect || overRect.height <= 0) return null
    const pointerY = activeTranslated.top + activeTranslated.height / 2
    const mid = overRect.top + overRect.height / 2
    return pointerY > mid ? "bottom" : "top"
}

/** Apply drag reorder; preserves container entries not present in orderedIds (hidden actions / folders). */
export function applyContainerOrderFromSortableIds(
    layout: ActionLayout,
    containerFolderId: string | null,
    orderedIds: string[],
    visibleKeys: ReadonlySet<string>
): ActionLayout {
    const current = getContainerItems(layout, containerFolderId)
    const orderedSet = new Set(orderedIds)
    const hidden = current.filter((e) => {
        const sid = layoutSortableId(e)
        if (orderedSet.has(sid)) return false
        if (isActionEntry(e) && !visibleKeys.has(e.key)) return true
        if (isFolderEntry(e) && !folderIsDisplayable(e.id, visibleKeys, layout)) return true
        return false
    })
    const ordered = entriesFromSortableIds(orderedIds)
    return setContainerItems(layout, containerFolderId, [...ordered, ...hidden])
}
