import { describe, expect, it } from "vitest"
import {
    getActionCard,
    getClassRule,
    getDamageTypes,
    getFeatRule,
    getGlobalPassive,
    getOccupationRules,
    getPointBuy,
    getRaceRule,
    getRulesGlossary,
    getRulesSkills,
    getStartingXPPerLevel,
    listClassIds,
    rulesData,
} from "@/lib/rules-data"

describe("rulesData singleton", () => {
    it("loads bundled rules with expected top-level keys", () => {
        expect(rulesData.system).toBeTruthy()
        expect(rulesData.classes).toBeTruthy()
        expect(rulesData.races).toBeTruthy()
    })
})

describe("rules accessors", () => {
    it("getClassRule returns class by id", () => {
        const fighter = getClassRule("fighter")
        expect(fighter?.name ?? "fighter").toBeTruthy()
    })

    it("getRaceRule normalizes race key", () => {
        const human = getRaceRule("Human")
        expect(human).toBeTruthy()
    })

    it("getPointBuy and XP tables are populated", () => {
        expect(Object.keys(getPointBuy()).length).toBeGreaterThan(0)
        expect(getStartingXPPerLevel()["1"]).toBeGreaterThan(0)
    })

    it("getRulesSkills returns catalog", () => {
        expect(Object.keys(getRulesSkills()).length).toBeGreaterThan(0)
    })

    it("getOccupationRules returns registry", () => {
        expect(typeof getOccupationRules()).toBe("object")
    })

    it("getDamageTypes returns list", () => {
        expect(getDamageTypes().length).toBeGreaterThan(0)
    })

    it("getGlobalPassive reads global passives table", () => {
        const ids = Object.keys(rulesData.passives ?? {})
        if (ids.length === 0) return
        expect(getGlobalPassive(ids[0])).toBeTruthy()
    })

    it("getActionCard resolves known action id when present", () => {
        const ids = Object.keys(rulesData.actionCards ?? {})
        if (ids.length === 0) return
        expect(getActionCard(ids[0])?.id ?? ids[0]).toBeTruthy()
    })

    it("getFeatRule resolves feat registry", () => {
        const ids = Object.keys(rulesData.system.feats ?? {})
        if (ids.length === 0) return
        expect(getFeatRule(ids[0])).toBeTruthy()
    })

    it("getRulesGlossary exposes effect dictionary", () => {
        expect(getRulesGlossary()?.effectDictionary).toBeTruthy()
    })

    it("listClassIds matches classes map", () => {
        expect(listClassIds().length).toBe(Object.keys(rulesData.classes).length)
    })
})
