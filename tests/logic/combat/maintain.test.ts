import { describe, expect, it } from "vitest"
import { maintainBreakThreshold } from "@/logic/combat/maintain"

describe("maintainBreakThreshold", () => {
    it("is half Willpower rounded up", () => {
        expect(maintainBreakThreshold(10)).toBe(5)
        expect(maintainBreakThreshold(11)).toBe(6)
        expect(maintainBreakThreshold(1)).toBe(1)
        expect(maintainBreakThreshold(0)).toBe(0)
    })
})
