import type { InventoryItem } from "@/lib/equipment-data"

export type ItemRankDefinition = {
    label?: string
    nameClass: string
}

export type RulesWithItemRanks = {
    system?: {
        itemRanks?: Record<string, ItemRankDefinition>
    }
}

const DEFAULT_RANK = "common"
const DEFAULT_NAME_CLASS = "text-foreground"

export function getItemRankPalette(rules: RulesWithItemRanks | null | undefined): Record<string, ItemRankDefinition> {
    const raw = rules?.system?.itemRanks
    if (!raw || typeof raw !== "object") return {}
    const out: Record<string, ItemRankDefinition> = {}
    for (const [key, value] of Object.entries(raw)) {
        if (!value || typeof value !== "object") continue
        const nameClass =
            typeof (value as ItemRankDefinition).nameClass === "string" &&
            (value as ItemRankDefinition).nameClass.trim()
                ? (value as ItemRankDefinition).nameClass.trim()
                : DEFAULT_NAME_CLASS
        const label =
            typeof (value as ItemRankDefinition).label === "string"
                ? (value as ItemRankDefinition).label
                : undefined
        out[key] = { nameClass, ...(label ? { label } : {}) }
    }
    return out
}

export function resolveItemRank(
    item: { rank?: string | null } | null | undefined,
    rules?: RulesWithItemRanks | null
): string {
    const raw = item?.rank?.trim()
    if (raw) {
        const palette = getItemRankPalette(rules)
        if (palette[raw]) return raw
    }
    return DEFAULT_RANK
}

export function getItemNameClass(
    item: Pick<InventoryItem, "rank"> | { rank?: string | null } | null | undefined,
    rules?: RulesWithItemRanks | null
): string {
    const rankId = resolveItemRank(item, rules)
    const palette = getItemRankPalette(rules)
    return palette[rankId]?.nameClass ?? palette[DEFAULT_RANK]?.nameClass ?? DEFAULT_NAME_CLASS
}

export function getItemRankLabel(
    item: { rank?: string | null } | null | undefined,
    rules?: RulesWithItemRanks | null
): string | null {
    const rankId = resolveItemRank(item, rules)
    const palette = getItemRankPalette(rules)
    return palette[rankId]?.label ?? null
}
