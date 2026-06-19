import type { TraitRef } from "@/lib/baseRefs"

/** Canonical trait ref list: `traitRefs` when present, else save `traits`. */
export function getTraitRefs(character: {
    traits?: TraitRef[]
    traitRefs?: TraitRef[]
} | null | undefined): TraitRef[] {
    if (!character) return []
    if (Array.isArray(character.traitRefs) && character.traitRefs.length > 0) {
        return character.traitRefs
    }
    return character.traits ?? []
}
