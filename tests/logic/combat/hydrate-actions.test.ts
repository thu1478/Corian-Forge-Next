import { describe, expect, it } from "vitest"
import { hydrateSandboxActionCard } from "@/packages/combat-kit/src/hydrate-actions"
import type { CombatSandboxRoot } from "@/packages/combat-kit/src/types"
import type { RulesRoot } from "@corian-forge/rules-kit"

const sandbox: CombatSandboxRoot = {
    version: 1,
    creatures: {},
    actionCards: {
        "sandbox/simpleBite": {
            name: "Simple Bite",
            type: "action",
            description: "Test bite",
            source: "sandbox",
            tags: [],
            powerRoll: { rollStats: ["might"], tier1Dmg: 2, tier2Dmg: 4, tier3Dmg: 6 },
        },
    },
}

const rules = {
    actionCards: {
        "beast/ram": {
            name: "Ram",
            type: "action",
            description: "Ram attack",
            source: "global",
            tags: [],
            powerRoll: { rollStats: ["might"], tier1Dmg: 4, tier2Dmg: 6, tier3Dmg: 8 },
        },
    },
} as unknown as RulesRoot

describe("hydrateSandboxActionCard", () => {
    it("prefers sandbox-local action cards", () => {
        const card = hydrateSandboxActionCard("sandbox/simpleBite", sandbox, rules)
        expect(card?.name).toBe("Simple Bite")
        expect(card?.source).toBe("sandbox")
    })

    it("falls back to rules.json action cards", () => {
        const card = hydrateSandboxActionCard("beast/ram", sandbox, rules)
        expect(card?.name).toBe("Ram")
        expect(card?.source).toBe("global")
    })

    it("returns null for unknown ids", () => {
        expect(hydrateSandboxActionCard("missing/action", sandbox, rules)).toBeNull()
    })
})
