import rulesData from "@/lib/rules.json"
import {
  stripNumericParentheticals,
  stripTrailingParameterDigits,
} from "@/lib/action-tag-utils"

export type GlossaryTerm = { name: string; description: string }

/** Prefer action/equipment tag meanings before conditions, creature types, etc. */
const EFFECT_DICTIONARY_SECTION_ORDER = [
  "actionTags",
  "equipmentTags",
  "powerRoll",
  "environmentalEffects",
  "negativeStatusEffects",
  "creatureTags",
  "creatureTypes",
] as const

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
  const root = rulesData as {
    glossary?: { effectDictionary?: Record<string, Record<string, unknown>> }
  }
  const dict = root.glossary?.effectDictionary
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
