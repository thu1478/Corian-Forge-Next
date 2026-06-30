import { describe, expect, it } from "vitest"
import { validateCombatSandbox } from "@/packages/combat-kit/src/validate-sandbox"
import type { CombatSandboxRoot } from "@/packages/combat-kit/src/types"
import type { RulesRoot } from "@corian-forge/rules-kit"

const rules = {
    actionCards: {
        "beast/ram": { name: "Ram", type: "action", description: "", source: "global", tags: [] },
    },
} as unknown as RulesRoot

describe("validateCombatSandbox", () => {
    it("flags invalid root", () => {
        const issues = validateCombatSandbox(null)
        expect(issues.some((i) => i.code === "invalid-root")).toBe(true)
    })

    it("flags missing creature name", () => {
        const sandbox = {
            version: 1,
            creatures: { bad: { attributes: { might: 10 } } },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox)
        expect(issues.some((i) => i.code === "missing-name")).toBe(true)
    })

    it("flags unknown action references when rules provided", () => {
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                elk: {
                    name: "Elk",
                    attributes: { might: 14 },
                    actionIDs: ["beast/ram", "missing/action"],
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox, rules)
        expect(issues.some((i) => i.code === "unknown-action")).toBe(true)
    })

    it("accepts valid sandbox", () => {
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                elk: {
                    name: "Elk",
                    role: "summon",
                    attributes: { might: 14 },
                    actionIDs: ["beast/ram"],
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox, rules)
        expect(issues.filter((i) => i.severity === "error")).toHaveLength(0)
    })

    it("warns when role is missing", () => {
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                elk: {
                    name: "Elk",
                    attributes: { might: 14 },
                    actionIDs: [],
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox)
        expect(issues.some((i) => i.code === "missing-role")).toBe(true)
    })

    it("errors when defaultNaturalWeaponKey is missing from naturalWeapons", () => {
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                wolf: {
                    name: "Wolf",
                    role: "summon",
                    attributes: { might: 12 },
                    naturalWeapons: { bite: { name: "Bite", damage: 2 } },
                    defaultNaturalWeaponKey: "claw",
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox)
        expect(issues.some((i) => i.code === "missing-natural-weapon-key")).toBe(true)
    })

    it("warns on unknown traitRefs when rules provided", () => {
        const rulesWithTraits = {
            ...rules,
            bestiary: { traits: { pack_hunter: { name: "Pack Hunter" } } },
        } as unknown as RulesRoot
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                wolf: {
                    name: "Wolf",
                    role: "summon",
                    attributes: { might: 12 },
                    traitRefs: ["pack_hunter", "missing_trait"],
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox, rulesWithTraits)
        expect(issues.some((i) => i.code === "unknown-trait-ref")).toBe(true)
    })

    it("validates vulnerability shape", () => {
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                bad: {
                    name: "Bad",
                    role: "summon",
                    attributes: { might: 10 },
                    vulnerabilities: [{ stat: "" }],
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox)
        expect(issues.some((i) => i.code === "missing-vulnerability-stat")).toBe(true)
    })

    it("warns when multiple creature types are set", () => {
        const sandbox: CombatSandboxRoot = {
            version: 1,
            creatures: {
                hybrid: {
                    name: "Hybrid",
                    role: "summon",
                    attributes: { might: 10 },
                    creatureTypes: ["beast", "plant"],
                },
            },
            actionCards: {},
        }
        const issues = validateCombatSandbox(sandbox)
        expect(issues.some((i) => i.code === "multiple-creature-types")).toBe(true)
    })
})
