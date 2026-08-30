import { describe, expect, it } from "vitest"
import {
    inferNaturalWeaponKeyFromActionTags,
    parseNaturalWeaponKeyFromAction,
    resolveNaturalWeaponKeyForRoll,
} from "@/packages/combat-kit/src/natural-weapons"

describe("natural-weapons", () => {
    const weapons = {
        "Mage Slayer": { name: "Mage Slayer", damage: 2, tags: ["melee"] },
        Pistol: { name: "Pistol", damage: 3, tags: ["ranged"] },
        head: { name: "Antlers", damage: 2 },
    }

    it("parses natural: hidden tags", () => {
        expect(
            parseNaturalWeaponKeyFromAction([], ["natural:head", "other"]),
        ).toBe("head")
    })

    it("infers weapon from melee/ranged tags when unambiguous", () => {
        expect(
            inferNaturalWeaponKeyFromActionTags(["Melee", "Weapon"], weapons),
        ).toBe("Mage Slayer")
        expect(
            inferNaturalWeaponKeyFromActionTags(["Ranged", "Weapon"], weapons),
        ).toBe("Pistol")
    })

    it("resolves weapon key with priority: override > hidden > tags > active > default", () => {
        expect(
            resolveNaturalWeaponKeyForRoll({
                naturalWeapons: weapons,
                activeNaturalWeaponKey: "Pistol",
                defaultNaturalWeaponKey: "Pistol",
                actionWeaponKey: "Mage Slayer",
                actionTags: ["Ranged"],
            }),
        ).toBe("Mage Slayer")

        expect(
            resolveNaturalWeaponKeyForRoll({
                naturalWeapons: weapons,
                activeNaturalWeaponKey: "Pistol",
                defaultNaturalWeaponKey: "Pistol",
                actionTags: ["Melee", "Weapon"],
            }),
        ).toBe("Mage Slayer")

        expect(
            resolveNaturalWeaponKeyForRoll({
                naturalWeapons: weapons,
                activeNaturalWeaponKey: "Mage Slayer",
                defaultNaturalWeaponKey: "Pistol",
                actionTags: ["Spell"],
            }),
        ).toBe("Mage Slayer")
    })
})
