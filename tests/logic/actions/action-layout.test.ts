import { describe, expect, it } from "vitest"
import {
    applyContainerOrderFromSortableIds,
    countVisibleFolderEntries,
    createEmptyFolder,
    createFolderFromMerge,
    dropZoneFromRects,
    emptyActionLayout,
    folderHasVisibleActions,
    moveEntryToContainer,
    moveFolderIntoFolder,
    reorderInContainer,
    resolveContainerDisplayRows,
    resolveFolderPreviewEntries,
    unplacedVisibleActions,
    actionInstanceKey,
} from "@/logic/actions/action-layout"
import type { ActionCard } from "@/lib/rules"

function card(id: string, extra: Partial<ActionCard> = {}): ActionCard {
    return {
        id,
        name: id,
        type: "action",
        description: "",
        tags: [],
        source: "global",
        ...extra,
    }
}

describe("action-layout", () => {
    it("reorders within root", () => {
        let layout = emptyActionLayout()
        layout.root = [
            { type: "action", key: "a" },
            { type: "action", key: "b" },
            { type: "action", key: "c" },
        ]
        layout = reorderInContainer(layout, null, 0, 2)
        expect(layout.root.map((e) => (e.type === "action" ? e.key : e.id))).toEqual([
            "b",
            "c",
            "a",
        ])
    })

    it("merge creates folder with both actions", () => {
        const layout = {
            root: [
                { type: "action" as const, key: "x" },
                { type: "action" as const, key: "y" },
            ],
            folders: {},
        }
        const result = createFolderFromMerge(layout, null, "x", "y", "f1")
        expect(result).not.toBeNull()
        expect(result!.layout.root).toHaveLength(1)
        expect(result!.layout.root[0].type).toBe("folder")
        expect(result!.layout.folders.f1.items.map((e) => e.type === "action" && e.key)).toEqual([
            "y",
            "x",
        ])
    })

    it("moveFolderIntoFolder nests and rejects cycles", () => {
        const cyclicLayout = {
            root: [
                { type: "folder" as const, id: "outer" },
                { type: "folder" as const, id: "inner" },
            ],
            folders: {
                outer: {
                    id: "outer",
                    name: "Outer",
                    items: [{ type: "folder" as const, id: "inner" }],
                },
                inner: { id: "inner", name: "Inner", items: [] },
            },
        }
        expect(moveFolderIntoFolder(cyclicLayout, "inner", "outer")).toBeNull()

        const flatLayout = {
            root: [
                { type: "folder" as const, id: "a" },
                { type: "folder" as const, id: "b" },
            ],
            folders: {
                a: { id: "a", name: "A", items: [] },
                b: { id: "b", name: "B", items: [] },
            },
        }
        const ok = moveFolderIntoFolder(flatLayout, "a", "b")
        expect(ok!.folders.b.items).toEqual([{ type: "folder", id: "a" }])
        expect(ok!.root.map((e) => e.type === "folder" && e.id)).toEqual(["b"])
    })

    it("hides folders with no visible actions and shows again when visible", () => {
        const layout = {
            root: [{ type: "folder" as const, id: "f1" }],
            folders: {
                f1: {
                    id: "f1",
                    name: "Melee",
                    items: [{ type: "action" as const, key: "equipment/swing" }],
                },
            },
        }
        const visible = new Set<string>()
        expect(folderHasVisibleActions("f1", visible, layout)).toBe(false)

        visible.add("equipment/swing")
        expect(folderHasVisibleActions("f1", visible, layout)).toBe(true)

        const { rows } = resolveContainerDisplayRows(
            [card("equipment/swing")],
            layout,
            null
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].kind).toBe("folder")
    })

    it("appends unplaced visible actions at root", () => {
        const layout = {
            root: [{ type: "action" as const, key: "placed" }],
            folders: {},
        }
        const actions = [card("placed"), card("newOne")]
        const unplaced = unplacedVisibleActions(actions, layout)
        expect(unplaced.map(actionInstanceKey)).toEqual(["newOne"])
    })

    it("applyContainerOrderFromSortableIds places unplaced actions into root", () => {
        const layout = {
            root: [{ type: "action" as const, key: "placed" }],
            folders: {},
        }
        const visibleKeys = new Set(["placed", "newOne"])
        const next = applyContainerOrderFromSortableIds(
            layout,
            null,
            ["action:placed", "action:newOne"],
            visibleKeys
        )
        expect(next.root).toEqual([
            { type: "action", key: "placed" },
            { type: "action", key: "newOne" },
        ])
    })

    it("moveEntryToContainer moves action into folder", () => {
        const layout = {
            root: [
                { type: "action" as const, key: "wildfire" },
                { type: "folder" as const, id: "f1" },
            ],
            folders: {
                f1: {
                    id: "f1",
                    name: "Spells",
                    items: [{ type: "action" as const, key: "infestation" }],
                },
            },
        }
        const next = moveEntryToContainer(layout, "action", "wildfire", "f1")
        expect(next).not.toBeNull()
        expect(next!.root.map((e) => (e.type === "action" ? e.key : e.id))).toEqual(["f1"])
        expect(next!.folders.f1.items.map((e) => e.type === "action" && e.key)).toEqual([
            "infestation",
            "wildfire",
        ])
    })

    it("moveEntryToContainer moves action out of folder to root", () => {
        const layout = {
            root: [{ type: "folder" as const, id: "f1" }],
            folders: {
                f1: {
                    id: "f1",
                    name: "Spells",
                    items: [
                        { type: "action" as const, key: "wildfire" },
                        { type: "action" as const, key: "infestation" },
                    ],
                },
            },
        }
        const next = moveEntryToContainer(layout, "action", "wildfire", null)
        expect(next).not.toBeNull()
        expect(next!.folders.f1.items.map((e) => e.type === "action" && e.key)).toEqual([
            "infestation",
        ])
        expect(next!.root).toEqual([
            { type: "folder", id: "f1" },
            { type: "action", key: "wildfire" },
        ])
    })

    it("createEmptyFolder adds folder ref to container", () => {
        const layout = emptyActionLayout()
        const { layout: next, folderId } = createEmptyFolder(layout, null, "Spells")
        expect(next.root).toEqual([{ type: "folder", id: folderId }])
        expect(next.folders[folderId]).toEqual({ id: folderId, name: "Spells", items: [] })
    })

    it("includeEmptyFolders shows empty folders in edit rows", () => {
        const layout = {
            root: [{ type: "folder" as const, id: "f1" }],
            folders: {
                f1: { id: "f1", name: "Empty", items: [] },
            },
        }
        const { rows: hidden } = resolveContainerDisplayRows([], layout, null)
        expect(hidden).toHaveLength(0)
        const { rows: shown } = resolveContainerDisplayRows([], layout, null, {
            includeEmptyFolders: true,
        })
        expect(shown).toHaveLength(1)
        expect(shown[0].kind).toBe("folder")
    })

    it("dropZoneFromRects splits top and bottom halves", () => {
        const overRect = { top: 100, height: 40 }
        expect(dropZoneFromRects({ top: 90, height: 20 }, overRect)).toBe("top")
        expect(dropZoneFromRects({ top: 130, height: 20 }, overRect)).toBe("bottom")
        expect(dropZoneFromRects(null, overRect)).toBeNull()
    })

    it("resolveFolderPreviewEntries returns first visible items up to limit", () => {
        const layout = {
            root: [{ type: "folder" as const, id: "f1" }],
            folders: {
                f1: {
                    id: "f1",
                    name: "Spells",
                    items: [
                        { type: "action" as const, key: "a" },
                        { type: "action" as const, key: "b" },
                        { type: "folder" as const, id: "f2" },
                        { type: "action" as const, key: "c" },
                        { type: "action" as const, key: "d" },
                    ],
                },
                f2: {
                    id: "f2",
                    name: "Nested",
                    items: [{ type: "action" as const, key: "nested" }],
                },
            },
        }
        const actions = [card("a"), card("b"), card("c"), card("d"), card("nested")]
        const preview = resolveFolderPreviewEntries("f1", actions, layout, 4)
        expect(preview).toHaveLength(4)
        expect(preview.map((e) => (e.kind === "action" ? e.key : e.id))).toEqual([
            "a",
            "b",
            "f2",
            "c",
        ])
        expect(countVisibleFolderEntries("f1", actions, layout)).toBe(5)
    })
})
