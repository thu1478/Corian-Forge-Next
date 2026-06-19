import { describe, expect, it } from "vitest"
import {
    formatActionCardSubtitle,
    isEquipmentGrantedAction,
    resolveActionVisualCategory,
} from "@/logic/actions/action-visual-category"
import type { ActionCard } from "@/lib/rules"

function stubAction(overrides: Partial<ActionCard> = {}): ActionCard {
    return {
        id: "test",
        name: "Test",
        type: "action",
        description: "",
        tags: [],
        source: "test",
        ...overrides,
    }
}

describe("resolveActionVisualCategory", () => {
    it("classifies weapon attacks", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    tags: ["Melee", "Weapon", "1H"],
                    source: "weaponmaster",
                })
            )
        ).toBe("weapon")
    })

    it("classifies spells", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    tags: ["Ranged", "Spell"],
                    source: "priest",
                })
            )
        ).toBe("spell")
    })

    it("prefers sustain over spell when hiddenTags include sustain and barrier", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    tags: ["Ranged", "Spell", "Emanation"],
                    hiddenTags: ["sustain", "barrier"],
                    source: "priest",
                })
            )
        ).toBe("sustain")
    })

    it("classifies equipment weapon attacks as weapon", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    id: "equipment/jab",
                    source: "equipment",
                    tags: ["Melee", "Weapon", "Brawling"],
                })
            )
        ).toBe("weapon")
    })

    it("classifies runtime equipment grants with weapon tags as weapon", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    id: "jab",
                    source: "equipment",
                    grantingItemUid: "item-uid-1",
                    tags: ["Melee", "Weapon"],
                })
            )
        ).toBe("weapon")
    })

    it("uses equipment styling only when equipment grants do not match usual patterns", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    id: "wp_specialGadget",
                    source: "equipment",
                    grantingItemUid: "item-uid-2",
                    tags: ["Ranged", "Deployable"],
                })
            )
        ).toBe("equipment")
    })

    it("treats shield-only hiddenTags as weapon not sustain", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    tags: ["Melee"],
                    hiddenTags: ["shield"],
                    source: "guardian",
                })
            )
        ).toBe("weapon")
    })

    it("falls back to default when no tags match", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    tags: ["Melee"],
                    source: "guardian",
                })
            )
        ).toBe("default")
    })

    it("classifies spell reactions as spell", () => {
        expect(
            resolveActionVisualCategory(
                stubAction({
                    type: "reaction",
                    tags: ["Spell"],
                    source: "mage",
                })
            )
        ).toBe("spell")
    })
})

describe("isEquipmentGrantedAction", () => {
    it("matches equipment id prefix", () => {
        expect(isEquipmentGrantedAction(stubAction({ id: "equipment/stab", source: "x" }))).toBe(true)
    })

    it("returns false when id is missing (embedded class reaction cards)", () => {
        expect(isEquipmentGrantedAction(stubAction({ id: undefined as unknown as string, source: "sorcerer" }))).toBe(
            false
        )
    })
})

describe("formatActionCardSubtitle", () => {
    it("includes reaction timing", () => {
        expect(
            formatActionCardSubtitle(
                stubAction({
                    type: "reaction",
                    tags: ["Spell"],
                    source: "mage",
                })
            )
        ).toBe("Spell · Reaction")
    })

    it("shows sustain label for barrier abilities", () => {
        expect(
            formatActionCardSubtitle(
                stubAction({
                    tags: ["Spell"],
                    hiddenTags: ["sustain", "barrier"],
                    source: "priest",
                })
            )
        ).toBe("Sustain")
    })
})
