import { resolveDeityBoonDisplay } from "@/logic/classes/priest-deities"

export type PassiveLookupRules = {
    passives?: Record<string, unknown>
    classes?: Record<string, { passives?: Record<string, unknown> }>
    races?: Record<string, { passives?: Record<string, unknown> }>
    system?: { feats?: Record<string, unknown> }
}

export type PassiveLookupContext = {
    character?: {
        race?: string
        classes?: Array<{ id?: string; name?: string } | string>
        priestDeity?: string | null
        inventory?: Array<{ uid?: string; traits?: unknown }>
    }
    traitRef?: {
        itemId?: string
        inlineDefinition?: Record<string, unknown>
    }
}

/** Resolve a passive/trait rule by id (registry order + optional character context). */
export function resolvePassiveById(
    traitId: string,
    rules: PassiveLookupRules,
    context?: PassiveLookupContext
): Record<string, unknown> | null {
    const global = rules.passives?.[traitId]
    if (global && typeof global === "object") return global as Record<string, unknown>

    const char = context?.character

    if (char?.classes?.length) {
        for (const charClass of char.classes) {
            const classId =
                typeof charClass === "object" ? (charClass.id || charClass.name) : charClass
            if (!classId) continue
            const classRegistry = rules.classes?.[String(classId)]
            const passive = classRegistry?.passives?.[traitId]
            if (passive && typeof passive === "object") {
                let ruleData = passive as Record<string, unknown>
                if (traitId === "deityBoon" && classId === "priest") {
                    const merged = resolveDeityBoonDisplay(rules, char.priestDeity, ruleData)
                    ruleData = { ...ruleData, name: merged.name, description: merged.description }
                }
                return ruleData
            }
        }
    } else {
        for (const cls of Object.values(rules.classes || {})) {
            const p = (cls as { passives?: Record<string, unknown> })?.passives?.[traitId]
            if (p && typeof p === "object") return p as Record<string, unknown>
        }
    }

    const raceKey = char?.race?.toLowerCase?.()
    if (raceKey) {
        const rp = rules.races?.[raceKey]?.passives?.[traitId]
        if (rp && typeof rp === "object") return rp as Record<string, unknown>
    } else {
        for (const race of Object.values(rules.races || {})) {
            const p = (race as { passives?: Record<string, unknown> })?.passives?.[traitId]
            if (p && typeof p === "object") return p as Record<string, unknown>
        }
    }

    const feat = rules.system?.feats?.[traitId]
    if (feat && typeof feat === "object") return feat as Record<string, unknown>

    const itemId = context?.traitRef?.itemId
    if (itemId && char?.inventory) {
        const sourceItem = char.inventory.find((i) => String(i.uid) === String(itemId))
        const itemTraits = sourceItem?.traits
        if (Array.isArray(itemTraits)) {
            const traitDefinition = itemTraits.find(
                (t: unknown) => typeof t === "object" && t !== null && traitId in (t as object)
            )
            if (traitDefinition && typeof traitDefinition === "object") {
                const nested = (traitDefinition as Record<string, unknown>)[traitId]
                if (nested && typeof nested === "object") return nested as Record<string, unknown>
            }
        }
    }

    const inline = context?.traitRef?.inlineDefinition
    if (inline && typeof inline === "object") return inline

    return null
}
