import { describe, expect, it } from "vitest"
import {
    applyActionEnhancements,
    applyEnhancementsToCard,
    collectEnhanceActionEffects,
    getDisplayFocusCost,
    getDisplayPowerRoll,
    mergeEnhancementLayers,
} from "@/logic/actions/action-enhancements"
import { formatTraitEffectChoiceLabel } from "@/logic/traits/selection"
import type { ActionCard, EnhanceActionEffect, Trait } from "@/lib/rules"

function stubAction(overrides: Partial<ActionCard> = {}): ActionCard {
    return {
        id: "smite",
        name: "Smite",
        type: "action",
        description: "Base smite text.",
        tags: ["Spell"],
        source: "priest",
        focusCost: 3,
        ...overrides,
    }
}

function stubTrait(id: string, effects: EnhanceActionEffect[], name?: string): Trait {
    return {
        uid: id,
        id,
        name: name ?? id,
        source: "other",
        description: "",
        minLevel: 1,
        effects,
    }
}

describe("mergeEnhancementLayers", () => {
    it("stacks append text and sums focus delta", () => {
        const merged = mergeEnhancementLayers([
            {
                type: "EnhanceAction",
                actionId: "smite",
                appendDescription: "Bonus A.",
                focusCostDelta: -1,
                sourceLabel: "Armor A",
            },
            {
                type: "EnhanceAction",
                actionId: "smite",
                appendDescription: "Bonus B.",
                focusCostDelta: -1,
                sourceLabel: "Feat B",
            },
        ])
        expect(merged?.notes).toHaveLength(2)
        expect(merged?.focusCostDelta).toBe(-2)
    })
})

describe("applyActionEnhancements", () => {
    it("applies enhancement to matching action id", () => {
        const actions = applyActionEnhancements(
            [stubAction()],
            [
                stubTrait("radiantPlate", [
                    {
                        type: "EnhanceAction",
                        actionId: "smite",
                        appendDescription: "Undead bonus increases to 10.",
                        focusCostDelta: -1,
                    },
                ], "Radiant Plate"),
            ]
        )
        expect(actions[0].enhancements?.notes).toHaveLength(1)
        expect(actions[0].enhancements?.notes[0].sourceLabel).toBe("Radiant Plate")
        expect(getDisplayFocusCost(actions[0])).toBe(2)
    })

    it("leaves non-matching actions unchanged", () => {
        const base = stubAction({ id: "prism" })
        const [out] = applyActionEnhancements(
            [base],
            [
                stubTrait("t", [
                    { type: "EnhanceAction", actionId: "smite", appendDescription: "Nope." },
                ]),
            ]
        )
        expect(out.enhancements).toBeUndefined()
    })
})

describe("applyEnhancementsToCard", () => {
    it("applies enhancement to a single reaction card by action id", () => {
        const card = stubAction({
            id: "returnFire",
            name: "Flare Arrow",
            type: "reaction",
        })
        const enhanced = applyEnhancementsToCard("returnFire", card, [
            stubTrait("scorchingFlamesTome", [
                {
                    type: "EnhanceAction",
                    actionId: "returnFire",
                    appendDescription: "Also triggers after ally melee attacks.",
                },
            ], "Scorching Flames"),
        ])
        expect(enhanced?.enhancements?.notes).toHaveLength(1)
        expect(enhanced?.enhancements?.notes[0].appendDescription).toContain("ally melee")
    })
})

describe("getDisplayPowerRoll", () => {
    it("adds tier damage deltas", () => {
        const action = stubAction({
            powerRoll: {
                rollStats: ["willpower"],
                tier1Dmg: 2,
                tier2Dmg: 3,
                tier3Dmg: 5,
            },
            enhancements: {
                notes: [],
                powerRollDeltas: { tier1Dmg: 1, tier2Dmg: 2, tier3Dmg: 3 },
            },
        })
        const roll = getDisplayPowerRoll(action)
        expect(roll?.tier1Dmg).toBe(3)
        expect(roll?.tier2Dmg).toBe(5)
        expect(roll?.tier3Dmg).toBe(8)
    })
})

describe("collectEnhanceActionEffects", () => {
    it("collects from hydrated traits", () => {
        const layers = collectEnhanceActionEffects([
            stubTrait("armorTrait", [
                { type: "EnhanceAction", actionId: "smite", appendDescription: "Extra." },
            ]),
        ])
        expect(layers).toHaveLength(1)
        expect(layers[0].actionId).toBe("smite")
    })
})

describe("formatTraitEffectChoiceLabel", () => {
    it("labels EnhanceAction with target action id", () => {
        const label = formatTraitEffectChoiceLabel(
            { type: "EnhanceAction", actionId: "smite" },
            { actionCards: { smite: { name: "Smite" } } }
        )
        expect(label).toBe("Enhance: Smite")
    })
})
