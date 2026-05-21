export interface ReactionRef {
    id: string
    slotIndex: number
    charges: number
}

export interface FocusFeatRef {

}

export interface ActionRef {
    id: string
    /** Current charge count; `-1` = not tracked (no charge UI). */
    charges?: number
}

export interface TraitRef {
    id: string
    source: string
    /** When the rule has `selectAmount`, indices into that trait's `effects` array (order preserved). */
    selectedEffectIndices?: number[]
    /** Current charge count; `-1` = not tracked (no charge UI). */
    charges?: number
}

/** Feat choice per level in character creator (exported as `{ id, source: "feat", ... }`). */
export interface FeatLevelPick {
    id: string
    selectedEffectIndices?: number[]
}