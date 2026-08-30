import { describe, expect, it } from "vitest"
import {
    buildPowerRollTierPreviews,
    formatPotencyEffectPreview,
    formatTierDamageLine,
} from "@/packages/combat-kit/src/power-roll-display"

describe("power-roll-display", () => {
    const ramPowerRoll = {
        rollStats: ["might", "dexterity"] as const,
        tier1Dmg: 4,
        tier1Wpn: true,
        tier1Effect: {
            type: "ForcedMovement" as const,
            effect: "push" as const,
            distance: 1,
        },
        tier2Dmg: 6,
        tier2Wpn: true,
        tier2Effect: {
            type: "ForcedMovement" as const,
            effect: "push" as const,
            distance: 2,
        },
        tier3Dmg: 8,
        tier3Wpn: true,
        tier3Effect: {
            type: "Condition" as const,
            srcStats: ["might"] as const,
            targetStats: ["might"] as const,
            effect: "prone",
            strength: "strong" as const,
        },
    }

    it("formats forced movement effects", () => {
        const preview = formatPotencyEffectPreview(ramPowerRoll.tier1Effect!, { might: 14 })
        expect(preview.summary).toBe("push 1")
        expect(preview.duration).toBeNull()
    })

    it("formats condition potency threshold", () => {
        const preview = formatPotencyEffectPreview(ramPowerRoll.tier3Effect!, { might: 14 })
        expect(preview.summary).toBe("prone")
        expect(preview.potencyThreshold).toBe(2)
        expect(preview.potencyTargetStats).toBe("M")
    })

    it("builds tier previews with natural weapon damage", () => {
        const tiers = buildPowerRollTierPreviews({
            powerRoll: ramPowerRoll,
            attributes: { might: 14, dexterity: 9 },
            naturalWeapons: { legs: { damage: 2 } },
            activeNaturalWeaponKey: "legs",
            defaultNaturalWeaponKey: "legs",
        })
        expect(tiers).toHaveLength(3)
        expect(tiers[0]!.totalDamage).toBe(6)
        expect(formatTierDamageLine(tiers[0]!)).toBe("4 + 2 Wpn = 6 DMG")
        expect(tiers[0]!.effect?.summary).toBe("push 1")
        expect(tiers[1]!.effect?.summary).toBe("push 2")
        expect(tiers[2]!.effect?.summary).toBe("prone")
    })
})
