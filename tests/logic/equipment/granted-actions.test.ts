import { describe, expect, it } from "vitest"
import {
    collectEquipmentGrantedActions,
    getHandEquippedEquipmentReactionIds,
    getInjectedEquipmentReactionRefs,
    resolveEquipmentActionInstances,
    resolveEquipmentReactionInstances,
} from "@/logic/equipment/granted-actions"
import type { InventoryItem, WeaponItem } from "@/lib/equipment-data"

function dagger(uid: string, actionIDs: string[], extra: Record<string, unknown> = {}): WeaponItem {
    return {
        uid,
        id: "wp_dagger",
        name: `Dagger ${uid}`,
        quantity: 1,
        description: "",
        tags: ["melee", "1h", "light"],
        type: "weapon",
        damage: 2,
        damageType: "piercing",
        range: 1,
        attributes: ["dexterity"],
        actionIDs,
        ...extra,
    } as WeaponItem
}

describe("granted-actions", () => {
    it("collects grants only from equipped items", () => {
        const inventory = [
            dagger("a", ["equipment/stab"]),
            dagger("b", ["equipment/stab"]),
        ]
        const grants = collectEquipmentGrantedActions(inventory, ["a"])
        expect(grants).toHaveLength(1)
        expect(grants[0].itemUid).toBe("a")
    })

    it("dedupes duplicate action ids to active hand when no charges", () => {
        const inventory = [dagger("main", ["equipment/stab"]), dagger("off", ["equipment/stab"])]
        const rules = {
            actionCards: {
                "equipment/stab": {
                    name: "Stab",
                    type: "action",
                    description: "",
                    tags: ["Weapon", "Melee"],
                },
            },
            items: {},
        }

        const cards = resolveEquipmentActionInstances({
            inventory,
            equippedUids: ["main", "off"],
            activeHandUid: "main",
            offhandUid: "off",
            attributes: { might: 10, dexterity: 10, reason: 10, willpower: 10, presence: 10 },
            rules: rules as never,
        })

        expect(cards).toHaveLength(1)
        expect(cards[0].grantingItemUid).toBe("main")
        expect(cards[0].source).toBe("equipment")
    })

    it("splits into separate cards when any grantor has charge tracking", () => {
        const inventory = [
            dagger("w1", ["equipment/zap"], { fixedMaxCharges: 3 }),
            dagger("w2", ["equipment/zap"], { fixedMaxCharges: 3 }),
        ]
        const rules = {
            actionCards: {
                "equipment/zap": {
                    name: "Zap",
                    type: "action",
                    description: "",
                    tags: [],
                    itemChargeCost: 1,
                },
            },
            items: {
                wp_dagger: {
                    fixedMaxCharges: 3,
                },
            },
        }

        const cards = resolveEquipmentActionInstances({
            inventory,
            equippedUids: ["w1", "w2"],
            activeHandUid: "w1",
            offhandUid: "w2",
            attributes: { might: 10, dexterity: 10, reason: 10, willpower: 10, presence: 10 },
            rules: rules as never,
        })

        expect(cards).toHaveLength(2)
        expect(cards.map((c) => c.instanceKey).sort()).toEqual(
            ["equipment/zap::w1", "equipment/zap::w2"].sort()
        )
    })

    it("splits reaction cards from action cards for equipment grants", () => {
        const inventory = [dagger("gloves", ["equipment/jab", "suplex"])]
        const rules = {
            actionCards: {
                "equipment/jab": {
                    name: "Jab",
                    type: "action",
                    description: "",
                    tags: ["Melee", "Weapon", "Brawling"],
                },
                suplex: {
                    name: "Suplex",
                    type: "reaction",
                    description: "Suplex them",
                    trigger: "A creature experiences forced movement",
                    tags: ["Melee", "Weapon", "Brawling"],
                },
            },
            items: {},
        }

        const actions = resolveEquipmentActionInstances({
            inventory,
            equippedUids: ["gloves"],
            activeHandUid: "gloves",
            offhandUid: null,
            attributes: { might: 10, dexterity: 10, reason: 10, willpower: 10, presence: 10 },
            rules: rules as never,
        })
        const reactions = resolveEquipmentReactionInstances({
            inventory,
            equippedUids: ["gloves"],
            activeHandUid: "gloves",
            offhandUid: null,
            attributes: { might: 10, dexterity: 10, reason: 10, willpower: 10, presence: 10 },
            rules: rules as never,
        })

        expect(actions).toHaveLength(1)
        expect(actions[0].id).toBe("equipment/jab")
        expect(reactions).toHaveLength(1)
        expect(reactions[0].id).toBe("suplex")
        expect(reactions[0].trigger).toBe("A creature experiences forced movement")
        expect(reactions[0].grantingItemUid).toBe("gloves")
    })

    it("injects equipment reactions only when item is in a hand slot", () => {
        const inventory = [dagger("gloves", ["suplex"])]
        const rules = {
            actionCards: {
                suplex: {
                    name: "Suplex",
                    type: "reaction",
                    description: "",
                    trigger: "Forced movement",
                },
            },
            items: {},
        }

        const inInventoryOnly = getInjectedEquipmentReactionRefs(
            { equipment: { activeWeapon: null, offhand: null }, inventory, reactions: [] },
            rules as never
        )
        expect(inInventoryOnly).toHaveLength(0)

        const inHand = getInjectedEquipmentReactionRefs(
            { equipment: { activeWeapon: "gloves", offhand: null }, inventory, reactions: [] },
            rules as never
        )
        expect(inHand).toHaveLength(1)
        expect(inHand[0].id).toBe("suplex")
        expect(inHand[0].slotIndex).toBe(-1)

        const ids = getHandEquippedEquipmentReactionIds(
            { equipment: { activeWeapon: "gloves", offhand: null }, inventory },
            rules as never
        )
        expect(ids.has("suplex")).toBe(true)
    })

    it("resolves actionIDs from rules catalog when save inventory entry lacks them", () => {
        const saveInventory = [
            {
                uid: "gloves",
                id: "wp_dagger",
                quantity: 1,
            } as WeaponItem,
        ]
        const rules = {
            items: {
                wp_dagger: { actionIDs: ["suplex"] },
            },
            actionCards: {
                suplex: {
                    name: "Suplex",
                    type: "reaction",
                    description: "",
                    trigger: "Forced movement",
                },
            },
        }

        const injected = getInjectedEquipmentReactionRefs(
            { equipment: { activeWeapon: "gloves", offhand: null }, inventory: saveInventory, reactions: [] },
            rules as never
        )
        expect(injected).toHaveLength(1)
        expect(injected[0].id).toBe("suplex")
    })

    it("grants charged accessory actions when neck item is equipped", () => {
        const inventory = [
            {
                uid: "pendant-uid",
                id: "acc_pendantOfHealing",
                name: "Pendant of Healing",
                quantity: 1,
                description: "",
                tags: [],
                type: "misc",
                allowedSlots: ["neck"],
                actionIDs: ["healingCircle"],
                fixedMaxCharges: 2,
                chargeReset: ["longRest"],
            } as InventoryItem,
        ]
        const rules = {
            actionCards: {
                healingCircle: {
                    name: "Healing Circle",
                    type: "action",
                    description: "Heal allies nearby.",
                    tags: ["Spell", "Emanation"],
                    itemChargeCost: 1,
                },
            },
            items: {
                acc_pendantOfHealing: { fixedMaxCharges: 2 },
            },
        }

        const grants = collectEquipmentGrantedActions(inventory, ["pendant-uid"])
        expect(grants).toHaveLength(1)
        expect(grants[0].actionId).toBe("healingCircle")

        const cards = resolveEquipmentActionInstances({
            inventory,
            equippedUids: ["pendant-uid"],
            activeHandUid: null,
            offhandUid: null,
            attributes: { might: 10, dexterity: 10, reason: 10, willpower: 10, presence: 10 },
            rules: rules as never,
        })
        expect(cards).toHaveLength(1)
        expect(cards[0].id).toBe("healingCircle")
        expect(cards[0].grantingItemUid).toBe("pendant-uid")
    })
})
