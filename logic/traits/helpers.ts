import type { TraitRef } from "@/lib/baseRefs"
import type { InventionModuleConfig } from "@/lib/character-data"

const INVENTION_GEAR_ITEM_IDS = new Set(["arm_artificer_armor", "gear_support_backpack"])

/** Resolve equipped invention module picks to `rules.passives` ids. */
export function resolveInventionModulePassiveIds(
    itemId: string,
    moduleIds: readonly string[] | undefined | null,
    moduleConfig: InventionModuleConfig | undefined | null,
    rules: {
        classes?: Record<string, {
            specialInvention?: {
                weaponInfusionDamageTypes?: string[]
                modules?: Record<string, { passiveId?: string; passiveIdPrefix?: string }>
            }
        }>
    }
): string[] {
    if (!moduleIds?.length || !INVENTION_GEAR_ITEM_IDS.has(itemId)) return []

    const si = rules.classes?.artificer?.specialInvention
    const modules = si?.modules ?? {}
    const infusionTypes = new Set(si?.weaponInfusionDamageTypes ?? [])
    const out: string[] = []

    for (const mid of moduleIds) {
        const def = modules[mid]
        if (!def) continue
        if (def.passiveIdPrefix) {
            const dt = moduleConfig?.weaponInfusion?.damageType
            if (dt && infusionTypes.has(dt)) {
                out.push(`${def.passiveIdPrefix}${dt}`)
            }
        } else if (def.passiveId) {
            out.push(def.passiveId)
        }
    }
    return out
}

export function traitRefsIncludeId(
    traits: readonly TraitRef[] | readonly { id?: string }[] | undefined,
    passiveId: string,
): boolean {
    if (!traits?.length) return false
    return traits.some((t) => {
        const id = typeof t === "object" && t && "id" in t ? String((t as { id?: string }).id ?? "") : ""
        return id === passiveId
    })
}
