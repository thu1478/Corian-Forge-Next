import type { InventoryItem } from "@/lib/equipment-data";

/** Inventory / catalog filter tabs (more categories can be added later). */
export type InventoryKindFilter = "all" | "weapons" | "armor_shield" | "other";

export function itemMatchesKindFilter(item: Pick<InventoryItem, "type">, filter: InventoryKindFilter): boolean {
    if (filter === "all") return true;
    const t = item.type;
    if (filter === "weapons") return t === "weapon";
    if (filter === "armor_shield") return t === "armor" || t === "shield";
    return t === "misc" || t === "consumable" || t === "container";
}

export function itemMatchesSearch(
    item: { name?: string; description?: string; tags?: string[] },
    search: string
): boolean {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = (item.name ?? "").toLowerCase();
    const desc = (item.description ?? "").toLowerCase();
    if (name.includes(q) || desc.includes(q)) return true;
    const tags = item.tags ?? [];
    return tags.some((t) => t.toLowerCase().includes(q));
}

/** New unique instance id for raw inventory `{ id, uid }` entries. */
export function makeInventoryUid(itemId: string): string {
    const rand = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `${itemId}-${Date.now().toString(36)}-${rand}`;
}

export function makeContainerId(): string {
    const rand = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `cnt-${Date.now().toString(36)}-${rand}`;
}
