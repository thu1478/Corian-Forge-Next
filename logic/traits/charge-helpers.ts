import { getAttributeModifier } from "@/logic/character/stats"
import type { InventoryEntry } from "@/lib/equipment-data"
import type { ActionRef, ReactionRef, TraitRef } from "@/lib/baseRefs"
import type { ActionCard, ChargeDefinition, ChargeResetTiming } from "@/lib/rules"
import { buildReactionLibrary } from "@/logic/traits/rest-helpers"
import { resolvePassiveById } from "@/logic/traits/passive-lookup"
import { restoreInventoryItemCharges } from "@/logic/equipment/item-charges"

export type ChargeableKind = "trait" | "action" | "reaction"

export type RulesWithCharges = {
    passives?: Record<string, unknown>
    classes?: Record<string, unknown>
    races?: Record<string, unknown>
    system?: { feats?: Record<string, unknown> }
    actionCards?: Record<string, unknown>
    items?: Record<string, unknown>
}

function asChargeDef(raw: unknown): ChargeDefinition | undefined {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined
    return raw as ChargeDefinition
}

function passiveFromRules(rules: RulesWithCharges, traitId: string): ChargeDefinition | undefined {
    return asChargeDef(resolvePassiveById(traitId, rules as Parameters<typeof resolvePassiveById>[1]))
}

export function lookupChargeDefinition(
    kind: ChargeableKind,
    id: string,
    rules: RulesWithCharges
): ChargeDefinition | undefined {
    if (kind === "trait") return passiveFromRules(rules, id)
    if (kind === "action") {
        return asChargeDef(rules.actionCards?.[id])
    }
    if (kind === "reaction") {
        const lib = buildReactionLibrary(rules)
        const rule = lib.find((r: { id?: string }) => r?.id === id)
        return asChargeDef(rule)
    }
    return undefined
}

export function resolveMaxCharges(
    def: ChargeDefinition | undefined,
    attributes: Record<string, number>
): number {
    if (!def) return 0

    const fixed =
        typeof def.fixedMaxCharges === "number" && Number.isFinite(def.fixedMaxCharges)
            ? Math.max(0, Math.floor(def.fixedMaxCharges))
            : null
    if (fixed != null) return fixed

    const stat = typeof def.chargeStat === "string" ? def.chargeStat.trim() : ""
    if (!stat) return 0

    return Math.max(0, getAttributeModifier(attributes[stat] ?? 10))
}

export function hasChargeTracking(def: ChargeDefinition | undefined): boolean {
    if (!def) return false
    if (typeof def.fixedMaxCharges === "number" && def.fixedMaxCharges > 0) return true
    return Boolean(def.chargeStat?.trim())
}

/** True when max > 0 from charge rules. */
export function hasChargeTrackingForId(
    kind: ChargeableKind,
    id: string,
    rules: RulesWithCharges,
    attributes: Record<string, number>
): boolean {
    const def = lookupChargeDefinition(kind, id, rules)
    return resolveMaxCharges(def, attributes) > 0
}

export function shouldRestoreCharges(
    def: ChargeDefinition | undefined,
    timing: ChargeResetTiming
): boolean {
    if (!def?.chargeReset?.length) return false
    return def.chargeReset.includes(timing)
}

/**
 * Current pip count for UI. `saved === -1` or missing with max > 0 → treat as full (reaction panel behavior).
 */
export function resolveCurrentCharges(
    saved: number | undefined,
    maxCharges: number
): number {
    if (maxCharges <= 0) return 0
    if (saved == null || saved < 0) return maxCharges
    return Math.min(Math.max(0, saved), maxCharges)
}

export function initialChargesForNewEntry(
    def: ChargeDefinition | undefined,
    attributes: Record<string, number>
): number {
    const max = resolveMaxCharges(def, attributes)
    if (max <= 0) return -1
    return max
}

function restoreRefCharges<T extends { id: string; charges?: number }>(
    refs: T[],
    kind: ChargeableKind,
    timing: ChargeResetTiming,
    attributes: Record<string, number>,
    rules: RulesWithCharges
): T[] {
    return refs.map((ref) => {
        if (ref.charges === -1) return ref
        const def = lookupChargeDefinition(kind, ref.id, rules)
        if (!shouldRestoreCharges(def, timing)) return ref
        const max = resolveMaxCharges(def, attributes)
        if (max <= 0) return ref
        return { ...ref, charges: max }
    })
}

export function restoreTraitCharges<T extends TraitRef>(
    traits: T[],
    timing: ChargeResetTiming,
    attributes: Record<string, number>,
    rules: RulesWithCharges
): T[] {
    return restoreRefCharges(traits, "trait", timing, attributes, rules)
}

export function restoreActionCharges<T extends ActionRef>(
    actions: T[],
    timing: ChargeResetTiming,
    attributes: Record<string, number>,
    rules: RulesWithCharges
): T[] {
    return restoreRefCharges(actions, "action", timing, attributes, rules)
}

export function restoreReactionCharges<T extends ReactionRef>(
    reactions: T[],
    timing: ChargeResetTiming,
    attributes: Record<string, number>,
    rules: RulesWithCharges
): T[] {
    return restoreRefCharges(reactions, "reaction", timing, attributes, rules)
}

export function applyRestChargeEffects<
    T extends {
        traits?: TraitRef[]
        actions?: ActionRef[]
        reactions?: ReactionRef[]
        inventory?: InventoryEntry[]
    },
>(
    prev: T,
    timings: ChargeResetTiming | ChargeResetTiming[],
    attributes: Record<string, number>,
    rules: RulesWithCharges
): T {
    const list = Array.isArray(timings) ? timings : [timings]
    let traits = prev.traits ?? []
    let actions = prev.actions ?? []
    let reactions = prev.reactions ?? []
    let inventory = prev.inventory ?? []

    for (const timing of list) {
        traits = restoreTraitCharges(traits, timing, attributes, rules)
        actions = restoreActionCharges(actions, timing, attributes, rules)
        reactions = restoreReactionCharges(reactions, timing, attributes, rules)
        if (inventory.length > 0 && rules.items) {
            inventory = restoreInventoryItemCharges(inventory, timing, attributes, rules)
        }
    }

    return { ...prev, traits, actions, reactions, inventory }
}

/** Merge save refs and rules charge defs onto hydrated action cards for the combat UI. */
export function mergeActionChargeState(
    actions: ActionCard[],
    actionRefs: readonly (ActionRef | string)[],
    attributes: Record<string, number>,
    rules: RulesWithCharges
): ActionCard[] {
    const refById = new Map<string, ActionRef>()
    for (const ref of actionRefs) {
        if (typeof ref === "string") refById.set(ref, { id: ref })
        else if (ref?.id) refById.set(ref.id, ref)
    }

    return actions.map((action) => {
        if (action.grantingItemUid) {
            return action
        }
        const def = lookupChargeDefinition("action", action.id, rules)
        const saved = refById.get(action.id)?.charges
        return {
            ...action,
            ...(def?.chargeStat ? { chargeStat: def.chargeStat } : {}),
            ...(def?.fixedMaxCharges != null ? { fixedMaxCharges: def.fixedMaxCharges } : {}),
            ...(def?.chargeReset ? { chargeReset: def.chargeReset } : {}),
            ...(saved !== undefined ? { charges: saved } : {}),
        }
    })
}

export function isChargesDepleted(
    kind: ChargeableKind,
    id: string,
    savedCharges: number | undefined,
    attributes: Record<string, number>,
    rules: RulesWithCharges
): boolean {
    const def = lookupChargeDefinition(kind, id, rules)
    const max = resolveMaxCharges(def, attributes)
    if (max <= 0) return false
    const current = resolveCurrentCharges(savedCharges, max)
    return current <= 0
}
