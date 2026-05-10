import type { ArmorItem, InventoryItem, ShieldItem, WeaponItem } from "@/lib/equipment-data"
import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"

function martialSuffix(tags: string[] | undefined): string {
  return tags && actionTagsIncludeCanonical(tags, "martial") ? " · Martial" : ""
}

function weaponHandsSuffix(tags: string[] | undefined): string {
  if (!tags) return ""
  if (actionTagsIncludeCanonical(tags, "1H")) return " · 1H"
  if (actionTagsIncludeCanonical(tags, "2H")) return " · 2H"
  return ""
}

function fmtAttrName(attr: string): string {
  if (!attr) return attr
  return attr.charAt(0).toUpperCase() + attr.slice(1)
}

/** Human-readable armor defense (base + optional attribute cap). */
export function formatArmorDefenseValue(defense: ArmorItem["defense"]): string {
  const v = defense?.value ?? 0
  if (defense?.attribute && typeof defense.attrMax === "number") {
    return `${v} + ${fmtAttrName(defense.attribute)} (max +${defense.attrMax})`
  }
  if (defense?.attribute) {
    return `${v} + ${fmtAttrName(defense.attribute)}`
  }
  return String(v)
}

export function weaponStatSummary(item: WeaponItem): string {
  const dmg = item.damage ?? 0
  const dt = typeof item.damageType === "string" && item.damageType.trim() ? item.damageType.trim() : null
  const rng = item.range ?? 0
  const m = martialSuffix(item.tags)
  const h = weaponHandsSuffix(item.tags)
  const base = dt != null ? `Damage ${dmg} (${dt}) · Range ${rng}` : `Damage ${dmg} · Range ${rng}`
  return base + m + h
}

export function armorStatSummary(item: ArmorItem): string {
  const def = formatArmorDefenseValue(item.defense)
  const stab = item.stability ?? 0
  return `Defense ${def} · Stability ${stab}${martialSuffix(item.tags)}`
}

export function shieldStatSummary(item: ShieldItem): string {
  const stab =
    "stability" in item && typeof (item as ShieldItem & { stability?: number }).stability === "number"
      ? (item as ShieldItem & { stability: number }).stability
      : null
  const def = item.defense ?? 0
  const base = stab != null ? `Defense ${def} · Stability ${stab}` : `Defense ${def}`
  return base + martialSuffix(item.tags)
}

export function equipmentStatSummaryLine(item: InventoryItem): string | null {
  if (item.type === "weapon") return weaponStatSummary(item)
  if (item.type === "armor") return armorStatSummary(item)
  if (item.type === "shield") return shieldStatSummary(item)
  if (item.type === "consumable") return "Consumable"
  if (item.type === "container") {
    const cap = item.containerCapacity
    const allowed = item.containerAllowedTypes
    const parts: string[] = []
    if (typeof cap === "number" && cap >= 0) parts.push(`Max ${cap} items`)
    if (allowed?.length) parts.push(allowed.join("/"))
    return parts.length ? `Container · ${parts.join(" · ")}` : "Container"
  }
  return null
}

function tagsFromDef(def: Record<string, unknown>): string[] | undefined {
  const raw = def.tags
  if (!Array.isArray(raw)) return undefined
  return raw.filter((x): x is string => typeof x === "string")
}

/** Catalog / raw rules object (pre-hydration shape). */
export function equipmentStatSummaryFromDef(def: Record<string, unknown>): string | null {
  const t = def.type
  const tags = tagsFromDef(def)
  if (t === "weapon") {
    const dmg = typeof def.damage === "number" ? def.damage : 0
    const rng = typeof def.range === "number" ? def.range : 0
    const rawDt = def.damageType
    const dt = typeof rawDt === "string" && rawDt.trim() ? rawDt.trim() : null
    const base = dt != null ? `Damage ${dmg} (${dt}) · Range ${rng}` : `Damage ${dmg} · Range ${rng}`
    return base + martialSuffix(tags) + weaponHandsSuffix(tags)
  }
  if (t === "armor" && def.defense != null && typeof def.defense === "object") {
    const d = def.defense as Record<string, unknown>
    const v = typeof d.value === "number" ? d.value : 0
    let defStr = String(v)
    if (typeof d.attribute === "string" && d.attribute) {
      defStr += ` + ${fmtAttrName(d.attribute)}`
      if (typeof d.attrMax === "number") defStr += ` (max +${d.attrMax})`
    }
    const stab = typeof def.stability === "number" ? def.stability : 0
    return `Defense ${defStr} · Stability ${stab}${martialSuffix(tags)}`
  }
  if (t === "shield" && typeof def.defense === "number") {
    const stab = typeof def.stability === "number" ? def.stability : null
    const base = stab != null ? `Defense ${def.defense} · Stability ${stab}` : `Defense ${def.defense}`
    return base + martialSuffix(tags)
  }
  if (t === "container") {
    const cap = def.containerCapacity
    const allowed = def.containerAllowedTypes
    const parts: string[] = []
    if (typeof cap === "number" && cap >= 0) parts.push(`Max ${cap} items`)
    if (Array.isArray(allowed) && allowed.length > 0) {
      parts.push(`Only ${allowed.join(", ")}`)
    }
    return parts.length > 0 ? parts.join(" · ") : "Container"
  }
  if (t === "consumable") {
    return "Consumable"
  }
  return null
}
