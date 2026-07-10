import { describe, expect, it } from "vitest"
import { formatPotencySourceFormulaLabel } from "@/logic/combat/potency-display"

describe("formatPotencySourceFormulaLabel", () => {
    it("uses srcStats when present", () => {
        expect(
            formatPotencySourceFormulaLabel({
                potency: {
                    type: "Condition",
                    effect: "slowed",
                    srcStats: ["willpower"],
                    targetStats: ["willpower"],
                },
                potencySrcIsFixed: false,
                maxSrcMod: null,
                rollStats: ["dexterity"],
            }),
        ).toBe("W")
    })

    it("uses roll stats for fixedSrcVal when srcStats omitted (Pocket Sand style)", () => {
        expect(
            formatPotencySourceFormulaLabel({
                potency: {
                    type: "Condition",
                    effect: "blinded",
                    targetStats: ["dexterity"],
                    fixedSrcVal: -1,
                },
                potencySrcIsFixed: true,
                maxSrcMod: -1,
                rollStats: ["dexterity"],
            }),
        ).toBe("D")
    })

    it("falls back to numeric fixedSrcVal when no roll stats", () => {
        expect(
            formatPotencySourceFormulaLabel({
                potency: {
                    type: "Condition",
                    effect: "blinded",
                    targetStats: ["dexterity"],
                    fixedSrcVal: 2,
                },
                potencySrcIsFixed: true,
                maxSrcMod: 2,
                rollStats: [],
            }),
        ).toBe("2")
    })
})
