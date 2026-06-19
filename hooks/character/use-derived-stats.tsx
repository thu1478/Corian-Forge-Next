import { useMemo } from "react"
import type { RulesRoot } from "@/lib/rules-data"
import { computeDerivedStats } from "@/logic/character/derived-stats"

export { hydrateTraitRefs } from "@/logic/traits/trait-hydration"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDerivedStats(character: any, rulesData: RulesRoot) {
    return useMemo(() => computeDerivedStats(character, rulesData), [character, rulesData])
}
