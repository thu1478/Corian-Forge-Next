import { describe, expect, it } from "vitest"
import {
    hasEquippedWeaponForWeaponAction,
    resolveWeaponForActionPowerRoll,
    resolveWeaponForGrantedEquipmentAction,
} from "@/logic/equipment/weapon-utils"
import type { WeaponItem } from "@/lib/equipment-data"

function sword(uid: string, damage: number): WeaponItem {
    return {
        uid,
        id: "wp_longsword",
        name: uid,
        quantity: 1,
        description: "",
        tags: ["melee", "1h", "martial"],
        type: "weapon",
        damage,
        damageType: "slashing",
        range: 1,
        attributes: ["might"],
    }
}

describe("resolveWeaponForGrantedEquipmentAction", () => {
    it("uses granting weapon even when offhand matches better", () => {
        const main = sword("main", 3)
        const off = sword("off", 8)
        const granted = resolveWeaponForGrantedEquipmentAction(
            main,
            ["Weapon", "Melee", "1H"],
            ["might"],
            {}
        )
        const generic = resolveWeaponForActionPowerRoll(
            ["Weapon", "Melee", "1H"],
            ["might"],
            main,
            off,
            {}
        )

        expect(granted?.uid).toBe("main")
        expect(granted?.damage).toBe(3)
        expect(generic?.uid).toBe("main")
    })

    it("returns granting offhand weapon when that item granted the action", () => {
        const main = sword("main", 3)
        const off = sword("off", 5)
        const granted = resolveWeaponForGrantedEquipmentAction(
            off,
            ["Weapon", "Melee", "1H"],
            ["might"],
            {}
        )
        expect(granted?.uid).toBe("off")
        expect(granted?.damage).toBe(5)
    })
})

function brawlingGloves(): WeaponItem {
    return {
        uid: "gloves-1",
        id: "wp_wrestlerGloves",
        name: "Wrestler's Gloves",
        quantity: 1,
        description: "",
        tags: ["melee", "brawling", "1h", "light"],
        type: "weapon",
        damage: 2,
        damageType: "crushing",
        range: 1,
        attributes: ["might", "dexterity"],
    }
}

function handaxe(uid: string): WeaponItem {
    return {
        uid,
        id: "wp_handaxe",
        name: "Handaxe",
        quantity: 1,
        description: "",
        tags: ["melee", "1h", "light", "throwing"],
        type: "weapon",
        damage: 3,
        damageType: "slashing",
        range: 1,
        attributes: ["might"],
    }
}

describe("hasEquippedWeaponForWeaponAction", () => {
    it("allows Ranged Brawling actions with a melee brawling weapon (Force Palm)", () => {
        const ok = hasEquippedWeaponForWeaponAction(
            ["Ranged", "Weapon", "Brawling"],
            ["might", "dexterity"],
            brawlingGloves(),
            null
        )
        expect(ok).toBe(true)
    })

    it("still requires a brawling weapon for Brawling-tagged actions", () => {
        const ok = hasEquippedWeaponForWeaponAction(
            ["Ranged", "Weapon", "Brawling"],
            ["might", "dexterity"],
            sword("main", 3),
            null
        )
        expect(ok).toBe(false)
    })

    it("does not allow non-Brawling Ranged actions with only a melee weapon", () => {
        const ok = hasEquippedWeaponForWeaponAction(
            ["Ranged", "Weapon"],
            ["dexterity"],
            sword("main", 3),
            null
        )
        expect(ok).toBe(false)
    })

    it("allows Ranged Throwing actions with a melee throwing weapon (Throw + handaxe)", () => {
        const ok = hasEquippedWeaponForWeaponAction(
            ["Ranged", "Weapon", "Light", "Throwing"],
            ["dexterity"],
            handaxe("axe-1"),
            null
        )
        expect(ok).toBe(true)
    })

    it("allows Throwing equipment actions when roll stat differs from weapon attribute", () => {
        const ok = hasEquippedWeaponForWeaponAction(
            ["Ranged", "Weapon", "Throwing"],
            ["might"],
            handaxe("axe-1"),
            null
        )
        expect(ok).toBe(true)
    })

    it("still requires a throwing weapon for Throwing-tagged Ranged actions", () => {
        const ok = hasEquippedWeaponForWeaponAction(
            ["Ranged", "Weapon", "Throwing"],
            ["dexterity"],
            sword("main", 3),
            null
        )
        expect(ok).toBe(false)
    })
})
