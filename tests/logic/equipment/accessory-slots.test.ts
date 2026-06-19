import { describe, expect, it } from "vitest"
import {
    expandItemAccessorySlots,
    itemAllowedInAccessorySlot,
    migrateAccessories,
} from "@/logic/equipment/accessory-slots"
import { rulesData } from "@/lib/rules-data"

describe("accessory slots", () => {
    it("migrates legacy equipped accessories", () => {
        expect(
            migrateAccessories({
                face: "uid-glasses",
                back: "uid-pack",
                ringLeft: "uid-ring",
                feet: "uid-boots",
            }),
        ).toEqual({
            head: "uid-glasses",
            neck: null,
            waist: "uid-pack",
            wristLeft: "uid-ring",
            wristRight: null,
            feet: "uid-boots",
        })
    })

    it("maps legacy catalog allowedSlots to current slots", () => {
        expect(expandItemAccessorySlots(["back"])).toEqual(new Set(["waist"]))
        expect(itemAllowedInAccessorySlot(["ringRight"], "wristRight")).toBe(true)
        expect(itemAllowedInAccessorySlot(["hands"], "wristLeft")).toBe(true)
        expect(itemAllowedInAccessorySlot(["hands"], "wristRight")).toBe(true)
    })

    it("catalog acc_* items fit their declared accessory slots", () => {
        const samples: Array<{ id: string; slot: Parameters<typeof itemAllowedInAccessorySlot>[1] }> = [
            { id: "acc_beret", slot: "head" },
            { id: "acc_fedoraOfCinders", slot: "head" },
            { id: "acc_pendantOfHealing", slot: "neck" },
            { id: "acc_holster", slot: "waist" },
            { id: "acc_rings", slot: "wristLeft" },
            { id: "acc_rings", slot: "wristRight" },
            { id: "acc_lockdownBoots", slot: "feet" },
        ]
        for (const { id, slot } of samples) {
            const def = rulesData.items?.[id]
            expect(def, id).toBeTruthy()
            expect(itemAllowedInAccessorySlot(def?.allowedSlots as string[] | undefined, slot)).toBe(true)
        }
    })
})
