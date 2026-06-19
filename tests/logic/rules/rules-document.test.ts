import { describe, expect, it } from "vitest"
import { rulesData } from "@/lib/rules-data"
import { hasValidationErrors, validateRulesDocument, validateRulesRoot } from "@/logic/rules/validate-rules"

describe("validateRulesDocument", () => {
    it("flags legacy class statBonus", () => {
        const issues = validateRulesDocument({
            system: {},
            classes: { fighter: { statBonus: { stat: "hp", amount: 1 } } },
            races: {},
            items: {},
            actionCards: {},
            passives: {},
            bestiary: { creatures: {} },
        })
        expect(issues.some((i) => i.code === "legacy-statBonus")).toBe(true)
    })

    it("flags legacy creature traits array", () => {
        const issues = validateRulesDocument({
            system: {},
            classes: {},
            races: {},
            items: {},
            actionCards: {},
            passives: {},
            bestiary: { creatures: { wolf: { traits: ["packTactics"] } } },
        })
        expect(issues.some((i) => i.code === "legacy-creature-traits")).toBe(true)
    })
})

describe("bundled rules.json", () => {
    it("passes structural validation without alias errors", () => {
        const issues = validateRulesRoot(rulesData)
        const aliasCodes = new Set([
            "legacy-statBonus",
            "legacy-skillTraining",
            "legacy-creature-traits",
        ])
        const aliasIssues = issues.filter((i) => aliasCodes.has(i.code))
        expect(aliasIssues).toEqual([])
        expect(hasValidationErrors(issues)).toBe(false)
    })
})
