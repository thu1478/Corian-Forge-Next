import type {
    ActionCard,
    ActionEnhancements,
    EnhanceActionEffect,
    PowerRoll,
    Trait,
    TraitEffect,
} from "@/lib/rules"
import { hydrateActionCardById } from "@/logic/actions/hydrate"

export type EnhanceActionLayer = EnhanceActionEffect & {
    sourceLabel: string
}

export function isEnhanceActionEffect(effect: TraitEffect): effect is EnhanceActionEffect {
    return effect.type === "EnhanceAction" && typeof effect.actionId === "string" && effect.actionId.length > 0
}

export function collectEnhanceActionEffects(traits: Trait[]): EnhanceActionLayer[] {
    const layers: EnhanceActionLayer[] = []
    for (const trait of traits) {
        const sourceLabel = trait.name?.trim() || trait.id
        for (const effect of trait.effects ?? []) {
            if (!isEnhanceActionEffect(effect)) continue
            layers.push({
                ...effect,
                sourceLabel,
            })
        }
    }
    return layers
}

export function mergeEnhancementLayers(layers: EnhanceActionLayer[]): ActionEnhancements | undefined {
    if (layers.length === 0) return undefined

    const notes: ActionEnhancements["notes"] = []
    let apCostDelta = 0
    let focusCostDelta = 0
    let mpCostDelta = 0
    let ipCostDelta = 0
    let tier1Dmg = 0
    let tier2Dmg = 0
    let tier3Dmg = 0

    for (const layer of layers) {
        const text = layer.appendDescription?.trim()
        if (text) {
            notes.push({
                sourceLabel: layer.sourceLabel,
                appendDescription: text,
            })
        }
        if (typeof layer.apCostDelta === "number" && Number.isFinite(layer.apCostDelta)) {
            apCostDelta += layer.apCostDelta
        }
        if (typeof layer.focusCostDelta === "number" && Number.isFinite(layer.focusCostDelta)) {
            focusCostDelta += layer.focusCostDelta
        }
        if (typeof layer.mpCostDelta === "number" && Number.isFinite(layer.mpCostDelta)) {
            mpCostDelta += layer.mpCostDelta
        }
        if (typeof layer.ipCostDelta === "number" && Number.isFinite(layer.ipCostDelta)) {
            ipCostDelta += layer.ipCostDelta
        }
        if (typeof layer.tier1DmgDelta === "number" && Number.isFinite(layer.tier1DmgDelta)) {
            tier1Dmg += layer.tier1DmgDelta
        }
        if (typeof layer.tier2DmgDelta === "number" && Number.isFinite(layer.tier2DmgDelta)) {
            tier2Dmg += layer.tier2DmgDelta
        }
        if (typeof layer.tier3DmgDelta === "number" && Number.isFinite(layer.tier3DmgDelta)) {
            tier3Dmg += layer.tier3DmgDelta
        }
    }

    const powerRollDeltas =
        tier1Dmg !== 0 || tier2Dmg !== 0 || tier3Dmg !== 0
            ? {
                  ...(tier1Dmg !== 0 ? { tier1Dmg } : {}),
                  ...(tier2Dmg !== 0 ? { tier2Dmg } : {}),
                  ...(tier3Dmg !== 0 ? { tier3Dmg } : {}),
              }
            : undefined

    return {
        notes,
        ...(apCostDelta !== 0 ? { apCostDelta } : {}),
        ...(focusCostDelta !== 0 ? { focusCostDelta } : {}),
        ...(mpCostDelta !== 0 ? { mpCostDelta } : {}),
        ...(ipCostDelta !== 0 ? { ipCostDelta } : {}),
        ...(powerRollDeltas ? { powerRollDeltas } : {}),
    }
}

function applyCostDelta(base: number | undefined, delta: number | undefined): number {
    const total = (base ?? 0) + (delta ?? 0)
    return Math.max(0, total)
}

export function getDisplayApCost(action: ActionCard): number {
    return applyCostDelta(action.apCost, action.enhancements?.apCostDelta)
}

export function getDisplayMpCost(action: ActionCard): number {
    return applyCostDelta(action.mpCost, action.enhancements?.mpCostDelta)
}

export function getDisplayFocusCost(action: ActionCard): number {
    return applyCostDelta(action.focusCost, action.enhancements?.focusCostDelta)
}

export function getDisplayIpCost(action: ActionCard): number {
    return applyCostDelta(action.ipCost, action.enhancements?.ipCostDelta)
}

export function getDisplayPowerRoll(action: ActionCard): PowerRoll | undefined {
    const base = action.powerRoll
    const deltas = action.enhancements?.powerRollDeltas
    if (!base) return undefined
    if (!deltas) return base

    const next: PowerRoll = { ...base }
    for (const tier of [1, 2, 3] as const) {
        const key = `tier${tier}Dmg` as const
        const delta = deltas[key]
        if (delta == null || !Number.isFinite(delta)) continue
        const current = next[key]
        if (typeof current === "number" && Number.isFinite(current)) {
            next[key] = Math.max(0, current + delta)
        }
    }
    return next
}

export function actionHasEnhancements(action: ActionCard): boolean {
    const e = action.enhancements
    if (!e) return false
    if (e.notes.length > 0) return true
    return (
        (e.apCostDelta ?? 0) !== 0 ||
        (e.focusCostDelta ?? 0) !== 0 ||
        (e.mpCostDelta ?? 0) !== 0 ||
        (e.ipCostDelta ?? 0) !== 0 ||
        Boolean(e.powerRollDeltas)
    )
}

function enhancementsForActionId(
    actionId: string,
    layers: EnhanceActionLayer[]
): ActionEnhancements | undefined {
    const matching = layers.filter((layer) => layer.actionId === actionId)
    if (matching.length === 0) return undefined
    const enhancements = mergeEnhancementLayers(matching)
    if (!enhancements) return undefined
    if (!actionHasEnhancements({ id: actionId, enhancements } as ActionCard)) {
        return undefined
    }
    return enhancements
}

/** Apply active trait enhancements to a single action/reaction card (e.g. embedded class reaction cards). */
export function applyEnhancementsToCard(
    actionId: string,
    card: ActionCard | null,
    traits: Trait[]
): ActionCard | null {
    if (!card) return null
    const layers = collectEnhanceActionEffects(traits)
    if (layers.length === 0) return card
    const enhancements = enhancementsForActionId(actionId, layers)
    if (!enhancements) return card
    return { ...card, enhancements }
}

export function applyActionEnhancements(
    actions: ActionCard[],
    traits: Trait[],
    rules?: { actionCards?: Record<string, unknown>; classes?: Record<string, unknown> }
): ActionCard[] {
    const layers = collectEnhanceActionEffects(traits)
    if (layers.length === 0) return actions

    const byActionId = new Map<string, EnhanceActionLayer[]>()
    for (const layer of layers) {
        const list = byActionId.get(layer.actionId) ?? []
        list.push(layer)
        byActionId.set(layer.actionId, list)
    }

    return actions.map((action) => {
        const matching = byActionId.get(action.id)
        if (!matching?.length) return action
        const enhancements = mergeEnhancementLayers(matching)
        if (!enhancements || !actionHasEnhancements({ ...action, enhancements })) {
            return action
        }
        return { ...action, enhancements }
    })
}

export function resolveEnhanceActionTargetName(
    actionId: string,
    rules?: { actionCards?: Record<string, { name?: string }>; classes?: Record<string, unknown> }
): string {
    const card = rules ? hydrateActionCardById(actionId, rules as Parameters<typeof hydrateActionCardById>[1]) : null
    return card?.name?.trim() || actionId
}
