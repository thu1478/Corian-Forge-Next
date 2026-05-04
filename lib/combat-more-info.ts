import type { Trait, TraitEffect } from "@/lib/rules"

function slugToWords(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

function immunityDisplayLabel(effect: TraitEffect): string | null {
  if (effect.type !== "Immunity") return null
  const raw = effect.stat?.trim()
  if (!raw) return null
  return slugToWords(raw)
}

/** Rules keys for `GrantSight.stat` → combat sheet line. */
const GRANT_SIGHT_LABELS: Record<string, string> = {
  metaphysical: "Metaphysical sight",
  "low-light": "Low-light vision",
  mana: "Manasight",
}

function grantSightDisplayLabel(effect: TraitEffect): string | null {
  if (effect.type !== "GrantSight") return null
  const raw = effect.stat?.trim()
  if (!raw) return null
  const key = raw.toLowerCase()
  if (GRANT_SIGHT_LABELS[key]) return GRANT_SIGHT_LABELS[key]
  return slugToWords(raw)
}

function pushUnique(out: string[], seen: Set<string>, label: string | null) {
  if (!label || seen.has(label)) return
  seen.add(label)
  out.push(label)
}

/** Condition immunities from resolved `Immunity` trait effects (rules-driven). */
export function collectConditionImmunitiesFromTraits(traits: Trait[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of traits) {
    for (const e of t.effects ?? []) {
      if (e.type !== "Immunity") continue
      pushUnique(out, seen, immunityDisplayLabel(e))
    }
  }
  return out
}

/** Special sight lines from resolved `GrantSight` trait effects. */
export function collectSpecialSightFromTraits(traits: Trait[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of traits) {
    for (const e of t.effects ?? []) {
      if (e.type !== "GrantSight") continue
      pushUnique(out, seen, grantSightDisplayLabel(e))
    }
  }
  return out
}
