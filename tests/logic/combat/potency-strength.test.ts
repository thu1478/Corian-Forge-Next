import { describe, expect, it } from "vitest"
import { potencyStrengthLabelForTier } from "@/logic/combat/potency-strength"

describe("potencyStrengthLabelForTier", () => {
    it("maps power-roll tiers to weak / average / strong", () => {
        expect(potencyStrengthLabelForTier(1)).toBe("weak")
        expect(potencyStrengthLabelForTier(2)).toBe("average")
        expect(potencyStrengthLabelForTier(3)).toBe("strong")
    })
})
