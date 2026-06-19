import { useMemo } from "react"
import type { CharacterSaveData } from "@/lib/character-data"
import type { HydratedCharacter } from "@/lib/HydratedChar"
import { hydrateCharacterItems } from "@/logic/equipment/hydrate-items"

export function hydrateItemData(rawCharacter: CharacterSaveData | null, rules: any) {
    const hydratedCharacter = useMemo((): HydratedCharacter | null => {
        if (!rawCharacter || !rules) return null
        return hydrateCharacterItems(rawCharacter, rules)
    }, [rawCharacter, rules])

    return { character: hydratedCharacter }
}
