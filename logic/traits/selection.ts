import type { TraitEffect } from "@/lib/rules";
import { resolveEnhanceActionTargetName } from "@/logic/actions/action-enhancements";

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

export function formatTraitEffectChoiceLabel(
    effect: TraitEffect,
    rules?: { actionCards?: Record<string, { name?: string }> }
): string {
    switch (effect.type) {
        case "StatChange": {
            const base = effect.stat
                ? `${effect.stat} +${effect.value ?? "0"}`
                : `+${effect.value ?? "0"}`
            const when = (effect as { when?: string }).when?.trim()
            if (when === "dualWielding") return `${base} (while dual wielding)`
            return base
        }
        case "AttributeChange": {
            const parts = [effect.stat, effect.value].filter(
                (x) => x != null && String(x).trim() !== ""
            )
            return parts.length ? parts.map(String).join(" ") : "Attribute change"
        }
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
        case "GrantActionCard": {
            const id = String(effect.value ?? "");
            if (rules?.actionCards?.[id]?.name) return rules.actionCards[id].name!
            return id;
        }
        case "EnhanceAction": {
            const name = resolveEnhanceActionTargetName(effect.actionId, rules);
            return `Enhance: ${name}`;
        }
        case "SummonSchool": {
            const v = String(effect.value ?? "").toLowerCase();
            if (v === "geomancy") return "Golemancy (Geomancy)";
            if (v === "necromancy") return "Necromancy";
            return v || "Summon school";
        }
        case "GrantSkill": {
            const sid = String(effect.skillId ?? "").trim()
            const rAny = rules as { skills?: Record<string, { name?: string }>; system?: { skills?: Record<string, { name?: string }> } } | undefined
            const cat = rAny?.skills ?? rAny?.system?.skills
            if (sid) {
                const nm = cat?.[sid]?.name?.trim()
                return nm ? `Skill: ${nm}` : `Skill: ${sid}`
            }
            const n = Math.max(0, Math.floor(Number(effect.pickCount) || 0))
            const buckets = effect.skillBuckets?.filter(Boolean).join(", ")
            if (n > 0 && buckets) return `Choose ${n} skill${n !== 1 ? "s" : ""} (${buckets})`
            if (n > 0) return `Choose ${n} skill${n !== 1 ? "s" : ""}`
            return "Grant skill"
        }
        default:
            return (effect as { type?: string }).type ?? "effect";
    }
}

export function vulnerabilityDamageType(effect: TraitEffect): string | null {
    if (effect.type === "GrantSkill" || effect.type === "EnhanceAction") return null;
    const stat = effect.stat?.trim();
    const val = effect.value?.trim() ?? "";
    if (stat) return stat;
    if (val && Number.isNaN(parseInt(val, 10))) return val;
    return null;
}

/** Damage type for Resistance effects (`stat` or type-only `value`, e.g. racial fire/earth picks). */
export function resistanceDamageType(effect: TraitEffect): string | null {
    if (effect.type !== "Resistance") return null;
    return vulnerabilityDamageType(effect);
}

/** VU amount: uses numeric `value` when `stat` is set; otherwise defaults to 2 for type-only legacy rows. */
export function vulnerabilityAmount(effect: TraitEffect): number {
    if (effect.type === "GrantSkill" || effect.type === "EnhanceAction") return 0;
    if (effect.stat?.trim()) {
        return parseInt(effect.value ?? "0", 10) || 0;
    }
    const val = effect.value?.trim() ?? "";
    if (val && !Number.isNaN(parseInt(val, 10))) {
        return parseInt(val, 10) || 0;
    }
    return 2;
}
