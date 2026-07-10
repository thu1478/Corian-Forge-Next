import { describe, expect, it } from "vitest"
import {
    formatPowerRollHeaderSimple,
    getWeaponConstrainedRollStats,
    resolvePowerRollHeaderModifier,
} from "@/logic/combat/power-roll-stat-display"

describe("power-roll-stat-display", () => {
    const attrs = { might: 8, dexterity: 16, reason: 14 }

    it("intersects roll stats with weapon attributes", () => {
        expect(getWeaponConstrainedRollStats(["might", "dexterity"], ["might"])).toEqual(["might"])
        expect(getWeaponConstrainedRollStats(["might", "dexterity"], ["dexterity"])).toEqual(["dexterity"])
        expect(getWeaponConstrainedRollStats(["might", "dexterity"], [])).toEqual(["might", "dexterity"])
        expect(getWeaponConstrainedRollStats(["reason"], ["might"])).toEqual(["reason"])
    })

    it("uses Might mod when weapon is M-only even if Dex is higher", () => {
        expect(
            resolvePowerRollHeaderModifier(["might", "dexterity"], attrs, ["might"]),
        ).toBe(-1)
    })

    it("uses Dex mod when weapon is D-only", () => {
        expect(
            resolvePowerRollHeaderModifier(["might", "dexterity"], attrs, ["dexterity"]),
        ).toBe(3)
    })

    it("picks highest mod when weapon allows any stat", () => {
        expect(
            resolvePowerRollHeaderModifier(["might", "dexterity"], attrs, []),
        ).toBe(3)
    })

    it("uses Reason mod for reason-only spell regardless of equipped weapon", () => {
        expect(
            resolvePowerRollHeaderModifier(["reason"], attrs, ["might"]),
        ).toBe(2)
    })

    it("formats simple header with sign", () => {
        expect(formatPowerRollHeaderSimple(["might", "dexterity"], attrs, { attributes: ["might"] })).toBe("-1")
        expect(formatPowerRollHeaderSimple(["might", "dexterity"], attrs, { attributes: ["dexterity"] })).toBe("+3")
        expect(formatPowerRollHeaderSimple(["reason"], attrs, { attributes: ["might"] })).toBe("+2")
    })
})
