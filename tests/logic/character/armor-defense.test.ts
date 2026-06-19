import { describe, expect, it } from "vitest"
import { computeArmorDefenseValue } from "@/logic/character/stats"

describe("computeArmorDefenseValue", () => {
    it("uses attribute modifier, not raw score", () => {
        const defense = { value: 1, attribute: "dexterity", attrMax: 2 }
        expect(computeArmorDefenseValue(defense, { dexterity: 9 })).toBe(0)
        expect(computeArmorDefenseValue(defense, { dexterity: 14 })).toBe(3)
        expect(computeArmorDefenseValue(defense, { dexterity: 18 })).toBe(3)
    })

    it("silent robes: base 0 + dex modifier, floored at 0", () => {
        const defense = { value: 0, attribute: "dexterity" }
        expect(computeArmorDefenseValue(defense, { dexterity: 9 })).toBe(0)
        expect(computeArmorDefenseValue(defense, { dexterity: 14 })).toBe(2)
        expect(computeArmorDefenseValue(defense, { dexterity: 8 })).toBe(0)
    })

    it("returns base only when no attribute", () => {
        expect(computeArmorDefenseValue({ value: 2 }, {})).toBe(2)
    })
})
