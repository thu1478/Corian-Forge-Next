import type { TraitEffect } from "./types.js"
import type { RulesRoot } from "./types.js"

type RulesLabelContext = Pick<RulesRoot, "actionCards"> & {
    skills?: Record<string, { name?: string }>
}

export function formatTraitEffectChoiceLabel(
    effect: TraitEffect,
    rules?: RulesLabelContext,
): string {
    switch (effect.type) {
        case "StatChange": {
            const base = effect.stat
                ? `${effect.stat} +${effect.value ?? "0"}`
                : `+${effect.value ?? "0"}`
            const when = effect.when?.trim()
            if (when === "dualWielding") return `${base} (while dual wielding)`
            return base
        }
        case "AttributeChange": {
            const parts = [effect.stat, effect.value].filter(
                (x) => x != null && String(x).trim() !== "",
            )
            return parts.length ? parts.map(String).join(" ") : "Attribute change"
        }
        case "Vulnerability":
            return effect.stat ? `${effect.stat} (+${effect.value ?? "0"})` : "Vulnerability"
        case "Resistance":
            return effect.stat ? `Resist ${effect.stat}` : String(effect.value ?? "")
        case "Immunity":
            return effect.stat ? `Immune: ${effect.stat}` : "Immunity"
        case "GrantSight":
            return effect.stat ? `Sight: ${effect.stat}` : "Grant sight"
        case "Language":
            return String(effect.value ?? "")
        case "GrantActionCard": {
            const id = String(effect.value ?? "")
            if (rules?.actionCards?.[id]?.name) return rules.actionCards[id].name!
            return id
        }
        case "EnhanceAction": {
            const name =
                rules?.actionCards?.[effect.actionId]?.name ?? effect.actionId
            return `Enhance: ${name}`
        }
        case "SummonSchool": {
            const v = String(effect.value ?? "").toLowerCase()
            if (v === "geomancy") return "Golemancy (Geomancy)"
            if (v === "necromancy") return "Necromancy"
            return v || "Summon school"
        }
        case "GrantSkill": {
            const sid = String(effect.skillId ?? "").trim()
            if (sid && rules?.skills?.[sid]?.name) return rules.skills[sid].name!
            if (effect.pickCount) return `Pick ${effect.pickCount} skill(s)`
            return sid || "Grant skill"
        }
        default:
            return String((effect as { type?: string }).type ?? "Effect")
    }
}
