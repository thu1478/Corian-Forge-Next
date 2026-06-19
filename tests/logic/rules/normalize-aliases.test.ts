import { describe, expect, it } from "vitest"
import {
    migrateClassRuleAliases,
    migrateCreatureTemplateTraitAliases,
    normalizeClassStatBonuses,
    normalizeCreatureTraitRefs,
} from "@/logic/rules/normalize-aliases"

describe("normalizeClassStatBonuses", () => {
    it("prefers statBonuses array", () => {
        const rows = [{ stat: "hp", amount: 1 }]
        expect(normalizeClassStatBonuses({ statBonuses: rows, statBonus: { stat: "mp", amount: 2 } })).toEqual(
            rows
        )
    })

    it("falls back to statBonus object", () => {
        expect(normalizeClassStatBonuses({ statBonus: { stat: "defense", amount: 1 } })).toEqual([
            { stat: "defense", amount: 1 },
        ])
    })
})

describe("normalizeCreatureTraitRefs", () => {
    it("prefers traitRefs", () => {
        expect(normalizeCreatureTraitRefs({ traitRefs: ["a", "b"], traits: ["legacy"] })).toEqual(["a", "b"])
    })

    it("falls back to traits array", () => {
        expect(normalizeCreatureTraitRefs({ traits: ["strikerSummon", "unliving"] })).toEqual([
            "strikerSummon",
            "unliving",
        ])
    })
})

describe("migrateClassRuleAliases", () => {
    it("converts statBonus to statBonuses", () => {
        const rule: Record<string, unknown> = { statBonus: { stat: "hp", amount: 1 } }
        expect(migrateClassRuleAliases(rule)).toBe(true)
        expect(rule.statBonuses).toEqual([{ stat: "hp", amount: 1 }])
        expect(rule.statBonus).toBeUndefined()
    })
})

describe("migrateCreatureTemplateTraitAliases", () => {
    it("renames traits to traitRefs", () => {
        const creature: Record<string, unknown> = { traits: ["a", "b"] }
        expect(migrateCreatureTemplateTraitAliases(creature)).toBe(true)
        expect(creature.traitRefs).toEqual(["a", "b"])
        expect(creature.traits).toBeUndefined()
    })
})
