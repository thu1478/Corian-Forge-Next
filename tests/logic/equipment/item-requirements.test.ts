import { describe, expect, it } from "vitest"
import {
    formatItemRequirementLines,
    itemRequirementsMet,
    readItemRequirements,
} from "@/logic/equipment/item-requirements"

const rules = {
    classes: {
        fury: { name: "Fury" },
        weaponmaster: { name: "Weaponmaster" },
        conjurer: { name: "Conjurer" },
    },
}

describe("readItemRequirements", () => {
    it("returns null when requirements are missing", () => {
        expect(readItemRequirements({ name: "Sword" })).toBeNull()
    })

    it("reads stats and classes", () => {
        expect(
            readItemRequirements({
                requirements: {
                    stats: { might: 13 },
                    classes: { "1": ["fury", "weaponmaster"] },
                },
            }),
        ).toEqual({
            stats: { might: 13 },
            classes: { "1": ["fury", "weaponmaster"] },
        })
    })
})

describe("formatItemRequirementLines", () => {
    it("formats stats only", () => {
        const lines = formatItemRequirementLines({ stats: { might: 13, dexterity: 10 } }, rules)
        expect(lines).toEqual(["Might 13+", "Dexterity 10+"])
    })

    it("formats classes only", () => {
        const lines = formatItemRequirementLines(
            { classes: { "1": ["fury", "weaponmaster"] } },
            rules,
        )
        expect(lines).toEqual(["Class level 1+ in Fury or Weaponmaster"])
    })

    it("formats both", () => {
        const lines = formatItemRequirementLines(
            {
                stats: { might: 13 },
                classes: { "3": ["conjurer"] },
            },
            rules,
        )
        expect(lines).toEqual(["Might 13+", "Class level 3+ in Conjurer"])
    })
})

describe("itemRequirementsMet", () => {
    it("passes when no requirements", () => {
        expect(itemRequirementsMet(null, { attributes: { might: 8 }, classes: [] })).toBe(true)
    })

    it("checks stat minimums", () => {
        const req = readItemRequirements({ requirements: { stats: { might: 13 } } })
        expect(itemRequirementsMet(req, { attributes: { might: 13 }, classes: [] })).toBe(true)
        expect(itemRequirementsMet(req, { attributes: { might: 12 }, classes: [] })).toBe(false)
    })

    it("checks class level requirements", () => {
        const req = readItemRequirements({
            requirements: { classes: { "3": ["conjurer"] } },
        })
        expect(
            itemRequirementsMet(req, {
                attributes: {},
                classes: [{ id: "conjurer", level: 3, source: "class" }],
            }),
        ).toBe(true)
        expect(
            itemRequirementsMet(req, {
                attributes: {},
                classes: [{ id: "conjurer", level: 2, source: "class" }],
            }),
        ).toBe(false)
    })
})
