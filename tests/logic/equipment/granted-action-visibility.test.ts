import { describe, expect, it } from "vitest"
import type { ActionCard } from "@/lib/rules"
import { filterVisibleEquipmentGrantedCards } from "@/logic/equipment/granted-action-visibility"

function stubScimitarGrant(): ActionCard {
    return {
        id: "pocketSand",
        name: "Pocket Sand",
        type: "action",
        description: "Throw sand",
        tags: ["Ranged", "Weapon"],
        source: "equipment",
        grantingItemUid: "scimitar-uid",
        instanceKey: "pocketSand::scimitar-uid",
        powerRoll: { rollStats: ["dexterity"] },
    }
}

function stubThrowAction(): ActionCard {
    return {
        id: "throw",
        name: "Throw",
        type: "action",
        description: "Throw a weapon",
        tags: ["Ranged", "Weapon", "Light", "Throwing"],
        source: "marksman",
        powerRoll: { rollStats: ["dexterity"] },
    }
}

describe("filterVisibleEquipmentGrantedCards", () => {
    it("shows item-granted ranged weapon actions while melee granting weapon is equipped", () => {
        const visible = filterVisibleEquipmentGrantedCards([stubScimitarGrant()], {
            inventory: [
                {
                    uid: "scimitar-uid",
                    id: "wp_banditsScimitar",
                    name: "Bandit's Scimitar",
                    type: "weapon",
                    tags: ["melee", "1h", "martial", "light"],
                    attributes: ["dexterity"],
                    actionIDs: ["equipment/stab", "pocketSand"],
                } as never,
            ],
            equippedUids: ["scimitar-uid"],
            handSlotUids: ["scimitar-uid", null],
        })
        expect(visible).toHaveLength(1)
        expect(visible[0].id).toBe("pocketSand")
    })

    it("shows Throwing weapon actions when a melee throwing weapon is equipped", () => {
        const visible = filterVisibleEquipmentGrantedCards([stubThrowAction()], {
            inventory: [
                {
                    uid: "axe-uid",
                    id: "wp_handaxe",
                    name: "Handaxe",
                    type: "weapon",
                    tags: ["melee", "1h", "light", "throwing"],
                    attributes: ["might"],
                } as never,
            ],
            equippedUids: ["axe-uid"],
            handSlotUids: ["axe-uid", null],
        })
        expect(visible).toHaveLength(1)
        expect(visible[0].id).toBe("throw")
    })
})
