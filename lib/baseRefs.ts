export interface ReactionRef {
    id: string
    slotIndex: number
    charges: number
}

export interface FocusFeatRef {

}

export interface ActionRef {
    id: string
}

export interface TraitRef {
    id: string
    source: string
    /** When the rule has `selectAmount`, indices into that trait's `effects` array (order preserved). */
    selectedEffectIndices?: number[]
}

/** Feat choice per level in character creator (exported as `{ id, source: "feat", ... }`). */
export interface FeatLevelPick {
    id: string
    selectedEffectIndices?: number[]
}