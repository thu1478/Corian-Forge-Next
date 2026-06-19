import { describe, expect, it } from "vitest"
import {
    formatAccessoryAllowedSlotsLabel,
    formatEquipmentLibraryTypeLabel,
    isAccessoryCatalogItem,
    resolveEquipmentLibraryType,
    accessoryItemMatchesSlotFilter,
    countAccessoryItemsBySlotFilter,
} from "@/logic/equipment/accessory-catalog"
import { rulesData } from "@/lib/rules-data"

describe("accessory catalog", () => {
    it("detects misc/container items with accessory allowedSlots", () => {
        expect(isAccessoryCatalogItem("acc_beret", { type: "misc", allowedSlots: ["head"] })).toBe(true)
        expect(
            isAccessoryCatalogItem("gear_alchemy_satchel", {
                type: "container",
                allowedSlots: ["waist"],
            })
        ).toBe(true)
        expect(isAccessoryCatalogItem("misc_magibike", { type: "misc" })).toBe(false)
        expect(isAccessoryCatalogItem("wp_dagger", { type: "weapon", allowedSlots: ["rightHand"] })).toBe(
            false
        )
    })

    it("maps accessories to the accessory library type", () => {
        expect(resolveEquipmentLibraryType("acc_fedoraOfCinders", { type: "misc", allowedSlots: ["head"] })).toBe(
            "accessory"
        )
        expect(resolveEquipmentLibraryType("misc_magibike", { type: "misc" })).toBe("misc")
    })

    it("formats allowed slot labels in UI order", () => {
        expect(formatAccessoryAllowedSlotsLabel(["wristRight", "head", "wristLeft"])).toBe(
            "Head, Wrist (L), Wrist (R)"
        )
        expect(formatAccessoryAllowedSlotsLabel(["back"])).toBe("Waist")
    })

    it("labels the accessory library section", () => {
        expect(formatEquipmentLibraryTypeLabel("accessory")).toBe("Accessories")
        expect(formatEquipmentLibraryTypeLabel("shield")).toBe("Shields")
    })

    it("catalog acc_* items resolve as accessories", () => {
        const def = rulesData.items?.acc_pendantOfHealing
        expect(def).toBeTruthy()
        expect(isAccessoryCatalogItem("acc_pendantOfHealing", def!)).toBe(true)
        expect(formatAccessoryAllowedSlotsLabel(def!.allowedSlots as string[])).toBe("Neck")
    })

    it("filters accessories by slot", () => {
        expect(accessoryItemMatchesSlotFilter(["head"], "head")).toBe(true)
        expect(accessoryItemMatchesSlotFilter(["head"], "neck")).toBe(false)
        expect(accessoryItemMatchesSlotFilter(["wristLeft", "wristRight"], "wrists")).toBe(true)
        expect(accessoryItemMatchesSlotFilter(["wristLeft"], "wrists")).toBe(true)
        expect(accessoryItemMatchesSlotFilter(["back"], "waist")).toBe(true)
        expect(accessoryItemMatchesSlotFilter(["head"], "all")).toBe(true)
    })

    it("counts accessories per slot filter", () => {
        const rows = [
            { id: "a", def: { allowedSlots: ["head"] } },
            { id: "b", def: { allowedSlots: ["neck"] } },
            { id: "c", def: { allowedSlots: ["wristLeft", "wristRight"] } },
        ]
        const counts = countAccessoryItemsBySlotFilter(rows)
        expect(counts.get("all")).toBe(3)
        expect(counts.get("head")).toBe(1)
        expect(counts.get("neck")).toBe(1)
        expect(counts.get("wrists")).toBe(1)
        expect(counts.get("waist")).toBe(0)
    })
})
