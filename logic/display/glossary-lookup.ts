import { getRulesGlossary } from "@/lib/rules-data"
import { getPowerRollPotencyBadgeAndDuration } from "@/logic/combat/potency-display"
import type { PotencyEffect } from "@/lib/rules"
import {
  stripNumericParentheticals,
  stripTrailingParameterDigits,
} from "@/logic/actions/tag-utils"

export type GlossaryTerm = { name: string; description: string }

/** Prefer action/equipment tag meanings before conditions, creature types, etc. */
export const EFFECT_DICTIONARY_SECTION_ORDER = [
  "actionTags",
  "equipmentTags",
  "powerRoll",
  "environmentalEffects",
  "negativeStatusEffects",
  "creatureTags",
  "creatureTypes",
] as const

export type EffectDictionarySectionKey = (typeof EFFECT_DICTIONARY_SECTION_ORDER)[number]

export const GLOSSARY_SECTION_LABELS: Record<EffectDictionarySectionKey, string> = {
  actionTags: "Action tags",
  equipmentTags: "Equipment tags",
  powerRoll: "Power roll",
  environmentalEffects: "Environmental effects",
  negativeStatusEffects: "Negative status effects",
  creatureTags: "Creature tags",
  creatureTypes: "Creature types",
}

export type GlossaryLibraryTerm = {
  key: string
  name: string
  description: string
}

export type GlossaryLibrarySection = {
  sectionKey: string
  label: string
  terms: GlossaryLibraryTerm[]
}

/** All terms from `rules.glossary.effectDictionary`, grouped for the rules library. */
export function buildGlossaryLibrarySections(): GlossaryLibrarySection[] {
  const dict = getRulesGlossary()?.effectDictionary
  if (!dict) return []

  const orderedKeys = [
    ...EFFECT_DICTIONARY_SECTION_ORDER,
    ...Object.keys(dict).filter(
      (k) => !(EFFECT_DICTIONARY_SECTION_ORDER as readonly string[]).includes(k)
    ),
  ]

  const sections: GlossaryLibrarySection[] = []
  for (const sectionKey of orderedKeys) {
    const section = dict[sectionKey]
    if (!section || typeof section !== "object") continue
    const terms: GlossaryLibraryTerm[] = []
    for (const [key, value] of Object.entries(section)) {
      if (!isGlossaryTerm(value)) continue
      const name =
        typeof value.name === "string" && value.name.trim() ? value.name : key
      terms.push({ key, name, description: value.description })
    }
    if (terms.length === 0) continue
    terms.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    const label =
      (GLOSSARY_SECTION_LABELS as Record<string, string>)[sectionKey] ??
      sectionKey.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
    sections.push({ sectionKey, label, terms })
  }
  return sections
}

function isGlossaryTerm(v: unknown): v is GlossaryTerm {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.description === "string"
}

function casingVariants(s: string): string[] {
  if (!s) return []
  const lower = s.toLowerCase()
  const camel = s.length > 0 ? s[0].toLowerCase() + s.slice(1) : lower
  return Array.from(new Set([s, lower, camel]))
}

/** Glossary keys like `multiX`, `penetrateX` — compare to tag stem without the trailing `X`. */
function glossaryParameterizedStem(key: string): string | null {
  return /^[a-zA-Z]+X$/.test(key) ? key.slice(0, -1).toLowerCase() : null
}

function tagLookupCandidates(tag: string): string[] {
  const t = tag.trim()
  if (!t) return []
  const stripped = stripTrailingParameterDigits(stripNumericParentheticals(t))
  return Array.from(new Set([...casingVariants(t), ...casingVariants(stripped)]))
}

function keyMatchesCandidate(key: string, candidate: string): boolean {
  const c = candidate.trim()
  if (!c) return false
  if (c === key || c.toLowerCase() === key.toLowerCase()) return true
  const stem = glossaryParameterizedStem(key)
  if (stem != null && c.toLowerCase() === stem) return true
  return false
}

/** Match UI labels like `First Strike` to glossary keys like `firstStrike` or names like `First Strike`. */
function normalizedTagId(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase()
}

function tagMatchesGlossaryKeyOrName(
  key: string,
  displayName: string,
  candidates: string[]
): boolean {
  const nk = normalizedTagId(key)
  const nn = normalizedTagId(displayName)
  return candidates.some((c) => {
    const nc = normalizedTagId(c.trim())
    if (!nc) return false
    return keyMatchesCandidate(key, c) || nc === nk || nc === nn
  })
}

/**
 * Resolve a UI tag string (e.g. from an action card) to a glossary term under
 * `rules.glossary.effectDictionary`, trying common casings and section priority.
 */
export function findEffectGlossaryEntry(tag: string): GlossaryTerm | null {
  const dict = getRulesGlossary()?.effectDictionary
  if (!dict) return null

  const candidates = tagLookupCandidates(tag)
  if (candidates.length === 0) return null

  for (const sectionKey of EFFECT_DICTIONARY_SECTION_ORDER) {
    const section = dict[sectionKey]
    if (!section || typeof section !== "object") continue
    for (const [key, value] of Object.entries(section)) {
      if (!isGlossaryTerm(value)) continue
      const name = typeof value.name === "string" && value.name.trim() ? value.name : key
      if (tagMatchesGlossaryKeyOrName(key, name, candidates)) {
        return { name, description: value.description }
      }
    }
  }

  return null
}

/**
 * Resolve glossary text for a power-roll potency (conditions, forced movement, special text).
 * Tries the same `effectDictionary` sections as {@link findEffectGlossaryEntry}.
 */
export function findPotencyEffectGlossaryEntry(potency: PotencyEffect): GlossaryTerm | null {
  if (potency.type === "Condition") {
    return findEffectGlossaryEntry(String(potency.effect))
  }
  if (potency.type === "ForcedMovement") {
    const raw = String(potency.effect ?? "").trim()
    if (!raw) return null
    const spaced = raw.replace(/([a-z])([A-Z])/g, "$1 $2")
    return findEffectGlossaryEntry(raw) ?? (spaced !== raw ? findEffectGlossaryEntry(spaced) : null)
  }
  if (potency.type === "Special") {
    const { badge } = getPowerRollPotencyBadgeAndDuration(potency)
    const trimmed = badge.trim()
    if (!trimmed) return null
    let e = findEffectGlossaryEntry(trimmed)
    if (e) return e
    const first = trimmed.split(/[\s,/;(]+/).find((t) => t.length > 0)
    if (first && first !== trimmed) {
      e = findEffectGlossaryEntry(first)
      if (e) return e
    }
  }
  return null
}
