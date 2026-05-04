import type { TraitEffect } from "@/lib/rules";

/** Returns a copy of `effects` limited to the player's picks when `selectAmount` is set. */
export function resolveTraitEffectsAfterSelection(
    definition: { effects?: TraitEffect[]; selectAmount?: number },
    selectedEffectIndices?: number[]
): TraitEffect[] | undefined {
    const effects = definition.effects;
    if (!effects?.length) return effects;

    const n = definition.selectAmount;
    if (n == null || n < 1 || n > effects.length) {
        return [...effects];
    }

    const picked = selectedEffectIndices;
    const valid =
        Array.isArray(picked) &&
        picked.length === n &&
        picked.every((i) => Number.isInteger(i) && i >= 0 && i < effects.length) &&
        new Set(picked).size === picked.length;

    if (valid) {
        return picked.map((i) => effects[i]);
    }

    return effects.slice(0, n);
}

export function formatTraitEffectChoiceLabel(effect: TraitEffect): string {
    switch (effect.type) {
        case "StatChange":
            return effect.stat
                ? `${effect.stat} +${effect.value ?? "0"}`
                : `+${effect.value ?? "0"}`;
        case "Vulnerability": {
            const t = vulnerabilityDamageType(effect);
            const a = vulnerabilityAmount(effect);
            return t ? `${t} (+${a})` : "Vulnerability";
        }
        case "Resistance":
            return effect.stat ? `Resist ${effect.stat}` : String(effect.value ?? "");
        case "Immunity":
            return effect.stat ? `Immune: ${effect.stat}` : "Immunity";
        case "GrantSight":
            return effect.stat ? `Sight: ${effect.stat}` : "Grant sight";
        case "Language":
            return String(effect.value ?? "");
        case "GrantActionCard":
            return String(effect.value ?? "");
        default:
            return effect.type;
    }
}

export function vulnerabilityDamageType(effect: TraitEffect): string | null {
    const stat = effect.stat?.trim();
    const val = effect.value?.trim() ?? "";
    if (stat) return stat;
    if (val && Number.isNaN(parseInt(val, 10))) return val;
    return null;
}

/** VU amount: uses numeric `value` when `stat` is set; otherwise defaults to 2 for type-only legacy rows. */
export function vulnerabilityAmount(effect: TraitEffect): number {
    if (effect.stat?.trim()) {
        return parseInt(effect.value ?? "0", 10) || 0;
    }
    const val = effect.value?.trim() ?? "";
    if (val && !Number.isNaN(parseInt(val, 10))) {
        return parseInt(val, 10) || 0;
    }
    return 2;
}
