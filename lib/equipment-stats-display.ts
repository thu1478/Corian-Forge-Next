import type { ArmorItem, InventoryItem, ShieldItem, WeaponItem } from "@/lib/equipment-data"

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
  return dt != null ? `Damage ${dmg} (${dt}) · Range ${rng}` : `Damage ${dmg} · Range ${rng}`
}

export function armorStatSummary(item: ArmorItem): string {
  const def = formatArmorDefenseValue(item.defense)
  const stab = item.stability ?? 0
  return `Defense ${def} · Stability ${stab}`
}

export function shieldStatSummary(item: ShieldItem): string {
  const stab =
    "stability" in item && typeof (item as ShieldItem & { stability?: number }).stability === "number"
      ? (item as ShieldItem & { stability: number }).stability
      : null
  const def = item.defense ?? 0
  return stab != null ? `Defense ${def} · Stability ${stab}` : `Defense ${def}`
}

export function equipmentStatSummaryLine(item: InventoryItem): string | null {
  if (item.type === "weapon") return weaponStatSummary(item)
  if (item.type === "armor") return armorStatSummary(item)
  if (item.type === "shield") return shieldStatSummary(item)
  return null
}

/** Catalog / raw rules object (pre-hydration shape). */
export function equipmentStatSummaryFromDef(def: Record<string, unknown>): string | null {
  const t = def.type
  if (t === "weapon") {
    const dmg = typeof def.damage === "number" ? def.damage : 0
    const rng = typeof def.range === "number" ? def.range : 0
    const rawDt = def.damageType
    const dt = typeof rawDt === "string" && rawDt.trim() ? rawDt.trim() : null
    return dt != null ? `Damage ${dmg} (${dt}) · Range ${rng}` : `Damage ${dmg} · Range ${rng}`
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
    return `Defense ${defStr} · Stability ${stab}`
  }
  if (t === "shield" && typeof def.defense === "number") {
    const stab = typeof def.stability === "number" ? def.stability : null
    return stab != null ? `Defense ${def.defense} · Stability ${stab}` : `Defense ${def.defense}`
  }
  return null
}
