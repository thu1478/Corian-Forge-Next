import { describe, expect, it } from "vitest"
import {
    getActionItemChargeCost,
    isItemChargeDepletedForAction,
    restoreInventoryItemCharges,
    updateInventoryItemCharges,
} from "@/logic/equipment/item-charges"
import type { InventoryEntry } from "@/lib/equipment-data"
import type { ActionCard } from "@/lib/rules"

describe("item-charges", () => {
    const itemDef = {
        fixedMaxCharges: 3,
        chargeReset: ["shortRest" as const],
    }

    it("reads spend cost from the action card", () => {
        const action = { id: "equipment/zap", itemChargeCost: 2 } as ActionCard
        expect(getActionItemChargeCost(action)).toBe(2)
        expect(getActionItemChargeCost({ id: "x" } as ActionCard)).toBeNull()
        expect(getActionItemChargeCost({ id: "x", itemChargeCost: 0 } as ActionCard)).toBeNull()
    })

    it("detects depletion for actions with itemChargeCost", () => {
        const action = { id: "equipment/zap", itemChargeCost: 2 } as ActionCard
        const attrs = {
            might: 10,
            dexterity: 10,
            reason: 10,
            willpower: 10,
            presence: 10,
        }
        expect(isItemChargeDepletedForAction(itemDef, action, 1, attrs)).toBe(true)
        expect(isItemChargeDepletedForAction(itemDef, action, 2, attrs)).toBe(false)
    })

    it("updates and restores inventory entry charges", () => {
        const inventory: InventoryEntry[] = [
            { id: "wp_wand", uid: "u1", charges: 1 },
        ]
        const next = updateInventoryItemCharges(inventory, "u1", 0)
        expect(next[0].charges).toBe(0)

        const restored = restoreInventoryItemCharges(
            next,
            "shortRest",
            { might: 10, dexterity: 10, reason: 10, willpower: 10, presence: 10 },
            {
                items: {
                    wp_wand: itemDef,
                },
            }
        )
        expect(restored[0].charges).toBe(3)
    })
})
