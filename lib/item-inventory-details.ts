import type { ActionCard } from "@/lib/rules"
import type { InventoryItem } from "@/lib/equipment-data"
import { hydrateActionCardById } from "@/lib/action-hydrate"
import { resolveInventionModulePassiveIds } from "@/lib/trait-helpers"

export function resolvePassiveById(traitId: string, rules: any): Record<string, unknown> | null {
  const p = rules.passives?.[traitId]
  if (p && typeof p === "object") return p as Record<string, unknown>

  for (const cls of Object.values(rules.classes || {})) {
    const cl = cls as any
    if (cl?.passives?.[traitId]) return cl.passives[traitId] as Record<string, unknown>
  }

  for (const r of Object.values(rules.races || {})) {
    const race = r as any
    if (race?.passives?.[traitId]) return race.passives[traitId] as Record<string, unknown>
  }

  const feat = rules.system?.feats?.[traitId]
  if (feat && typeof feat === "object") return feat as Record<string, unknown>

  return null
}

function flattenItemTraitEntries(traits: unknown): { id: string; inline?: Record<string, unknown> }[] {
  if (!Array.isArray(traits)) return []
  const out: { id: string; inline?: Record<string, unknown> }[] = []
  for (const t of traits) {
    if (typeof t === "string") out.push({ id: t })
    else if (t && typeof t === "object") {
      const keys = Object.keys(t as object)
      if (keys.length === 1) {
        const id = keys[0]
        const inline = (t as Record<string, unknown>)[id]
        out.push({
          id,
          inline: inline && typeof inline === "object" ? (inline as Record<string, unknown>) : undefined,
        })
      }
    }
  }
  return out
}

function grantActionIdsFromEffects(effects: unknown): string[] {
  if (!Array.isArray(effects)) return []
  const ids: string[] = []
  for (const e of effects) {
    if (e && typeof e === "object" && (e as any).type === "GrantActionCard" && (e as any).value != null) {
      ids.push(String((e as any).value))
    }
  }
  return ids
}

export type ItemTraitDetailBlock = {
  traitId: string
  name: string
  description: string
  minLevel?: number
  effects?: unknown[]
  grantedActionCards: ActionCard[]
}

export function buildItemInventoryTraitBlocks(item: InventoryItem, rules: any): ItemTraitDetailBlock[] {
  const catalogTraits = flattenItemTraitEntries((item as any).traits)
  const modulePassiveIds = resolveInventionModulePassiveIds(
    item.id,
    item.inventionModules,
    item.inventionModuleConfig,
    rules
  )
  const moduleTraits = flattenItemTraitEntries(modulePassiveIds)
  const entries = [...catalogTraits, ...moduleTraits]
  const blocks: ItemTraitDetailBlock[] = []

  for (const { id: traitId, inline } of entries) {
    const base = resolvePassiveById(traitId, rules)
    const merged = {
      ...(base || {}),
      ...(inline || {}),
    } as Record<string, unknown>

    const effects = merged.effects as unknown[] | undefined
    const grantIds = [...new Set(grantActionIdsFromEffects(effects))]
    const grantedActionCards = grantIds
      .map((aid) => hydrateActionCardById(aid, rules))
      .filter((a): a is ActionCard => a != null)

    blocks.push({
      traitId,
      name: String(merged.name ?? traitId),
      description: String(merged.description ?? ""),
      minLevel: typeof merged.minLevel === "number" ? merged.minLevel : undefined,
      effects,
      grantedActionCards,
    })
  }

  return blocks
}

export function hydrateItemGrantedActionCards(item: InventoryItem, rules: any): ActionCard[] {
  const ids = [...new Set((item.actionIDs || []).filter(Boolean).map(String))]
  return ids.map((id) => hydrateActionCardById(id, rules)).filter((a): a is ActionCard => a != null)
}
