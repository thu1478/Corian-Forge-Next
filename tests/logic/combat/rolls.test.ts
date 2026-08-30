import { describe, expect, it } from "vitest"
import {
    formatModifier,
    getAttributeModifier,
    pickRollStat,
    resolvePowerRollTier,
    roll2d10,
    rollActionPowerRoll,
    rollAttributeCheck,
} from "@/packages/combat-kit/src/rolls"

describe("combat-kit rolls", () => {
    const fixedRng = () => 0.45 // d1=5, d2=5 → natural 10

    it("computes attribute modifiers", () => {
        expect(getAttributeModifier(10)).toBe(0)
        expect(getAttributeModifier(14)).toBe(2)
        expect(getAttributeModifier(9)).toBe(-1)
        expect(formatModifier(2)).toBe("+2")
        expect(formatModifier(-1)).toBe("-1")
    })

    it("resolves power roll tiers", () => {
        expect(resolvePowerRollTier(11)).toBe(1)
        expect(resolvePowerRollTier(12)).toBe(2)
        expect(resolvePowerRollTier(16)).toBe(2)
        expect(resolvePowerRollTier(17)).toBe(3)
    })

    it("rolls 2d10 with injectable rng", () => {
        expect(roll2d10(fixedRng)).toEqual({ d1: 5, d2: 5, natural: 10 })
    })

    it("rolls attribute check", () => {
        const result = rollAttributeCheck({ might: 14 }, "might", fixedRng)
        expect(result.natural).toBe(10)
        expect(result.modifier).toBe(2)
        expect(result.total).toBe(12)
        expect(result.tier).toBe(2)
    })

    it("picks highest modifier stat by default", () => {
        expect(
            pickRollStat({ might: 14, dexterity: 10 }, ["might", "dexterity"]),
        ).toBe("might")
        expect(
            pickRollStat({ might: 10, dexterity: 18 }, ["might", "dexterity"]),
        ).toBe("dexterity")
        expect(
            pickRollStat({ might: 10, dexterity: 18 }, ["might", "dexterity"], "might"),
        ).toBe("might")
    })

    it("rolls action power roll with weapon bonus", () => {
        const result = rollActionPowerRoll({
            attributes: { might: 14 },
            powerRoll: {
                rollStats: ["might"],
                tier1Dmg: 4,
                tier1Wpn: true,
                tier2Dmg: 6,
                tier2Wpn: true,
                tier3Dmg: 8,
                tier3Wpn: true,
            },
            actionId: "beast/ram",
            actionName: "Ram",
            naturalWeapons: { head: { damage: 2, name: "Antlers" } },
            activeNaturalWeaponKey: "head",
            defaultNaturalWeaponKey: "head",
            rng: fixedRng,
        })
        expect(result.tier).toBe(2)
        expect(result.tierDamage).toBe(6)
        expect(result.weaponBonus).toBe(2)
        expect(result.weaponKey).toBe("head")
        expect(result.totalDamage).toBe(8)
    })
})
