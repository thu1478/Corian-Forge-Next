import { PotencyDuration, type CharAttribute, type PotencyEffect } from "@/lib/rules"

const ATTRIBUTE_ABBREVIATIONS: Record<CharAttribute, string> = {
  might: "M",
  dexterity: "D",
  reason: "R",
  willpower: "W",
  presence: "P",
}

export function formatAttributeAbbreviationList(stats: string[] | undefined): string | null {
  if (!stats?.length) return null
  return stats
    .map((stat) => ATTRIBUTE_ABBREVIATIONS[stat as CharAttribute] ?? stat[0]?.toUpperCase() ?? stat)
    .join(" or ")
}

/** Formula-mode potency source label: srcStats, else roll stats when fixedSrcVal, else numeric fallback. */
export function formatPotencySourceFormulaLabel(input: {
  potency: PotencyEffect
  potencySrcIsFixed: boolean
  maxSrcMod: number | null
  rollStats: readonly string[]
}): string | null {
  if (input.potency.type === "Special") return null

  const srcStats =
    input.potency.type === "Condition" || input.potency.type === "ForcedMovement"
      ? input.potency.srcStats
      : undefined
  const fromSrcStats = formatAttributeAbbreviationList(srcStats)
  if (fromSrcStats) return fromSrcStats

  if (input.potencySrcIsFixed) {
    const fromRollStats = formatAttributeAbbreviationList([...input.rollStats])
    if (fromRollStats) return fromRollStats
    if (input.maxSrcMod != null) return String(input.maxSrcMod)
  }

  return null
}

/** Maps rules JSON / merge keys and bracket text to `PotencyDuration` labels for UI. */
export function formatPotencyDurationLabel(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === "" || s.toLowerCase() === "none") return null
  if (s === PotencyDuration.TurnEnd || s === PotencyDuration.SaveEnd || s === PotencyDuration.RoundEnd) return s
  const k = s.replace(/[\s_-]/g, "").toLowerCase()
  if (k === "turnend" || k === "turnends") return PotencyDuration.TurnEnd
  if (k === "saveend" || k === "saveends") return PotencyDuration.SaveEnd
  if (k === "roundend") return PotencyDuration.RoundEnd
  return null
}

function normalizeBracketToLabel(bracket: string): string | null {
  const inner = bracket.slice(1, -1).trim().toLowerCase()
  if (inner === "turn end" || inner === "turn ends") return PotencyDuration.TurnEnd
  if (inner === "save end" || inner === "save ends") return PotencyDuration.SaveEnd
  if (inner === "round end") return PotencyDuration.RoundEnd
  return bracket
}

/** Split trailing `[duration]` off a Special tier effect string (rules / legacy rows). */
function splitSpecialEffectBodyAndBracket(effect: string): { body: string; bracket: string | null } {
  const raw = effect.trim()
  const trailing = raw.match(/\s+(\[[^\]]+\])\s*$/i)
  if (trailing && trailing.index !== undefined) {
    return { body: raw.slice(0, trailing.index).trim(), bracket: trailing[1] }
  }
  const only = raw.match(/^(\[[^\]]+\])$/i)
  if (only) return { body: "", bracket: only[1] }
  return { body: raw, bracket: null }
}

export function getPowerRollPotencyBadgeAndDuration(potency: PotencyEffect): {
  badge: string
  duration: string | null
} {
  if (potency.type === "ForcedMovement") {
    return { badge: `${potency.effect} ${potency.distance}`, duration: null }
  }

  const durationFromField = formatPotencyDurationLabel(potency.duration)

  if (potency.type === "Special") {
    const { body, bracket } = splitSpecialEffectBodyAndBracket(potency.effect)
    const fromBracket = bracket ? normalizeBracketToLabel(bracket) : null
    return {
      badge: body,
      duration: durationFromField ?? fromBracket,
    }
  }

  return {
    badge: String(potency.effect),
    duration: durationFromField,
  }
}
