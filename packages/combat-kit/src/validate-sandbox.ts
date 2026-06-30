import type { RulesRoot } from "@corian-forge/rules-kit"
import { actionIdExists } from "./hydrate-actions.js"
import { CHAR_ATTRIBUTES, type CombatSandboxRoot, type SandboxValidationIssue } from "./types.js"

export function hasSandboxValidationErrors(issues: SandboxValidationIssue[]): boolean {
    return issues.some((i) => i.severity === "error")
}

export function validateCombatSandbox(
    sandbox: unknown,
    rules?: RulesRoot,
): SandboxValidationIssue[] {
    const issues: SandboxValidationIssue[] = []

    if (!sandbox || typeof sandbox !== "object" || Array.isArray(sandbox)) {
        issues.push({
            path: "",
            code: "invalid-root",
            message: "Sandbox root must be a JSON object",
            severity: "error",
        })
        return issues
    }

    const root = sandbox as Record<string, unknown>

    if (typeof root.version !== "number") {
        issues.push({
            path: "version",
            code: "missing-version",
            message: "version must be a number",
            severity: "error",
        })
    }

    const creatures = root.creatures
    if (!creatures || typeof creatures !== "object" || Array.isArray(creatures)) {
        issues.push({
            path: "creatures",
            code: "missing-creatures",
            message: "creatures must be an object map",
            severity: "error",
        })
    } else {
        for (const [id, raw] of Object.entries(creatures as Record<string, unknown>)) {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
                issues.push({
                    path: `creatures.${id}`,
                    code: "invalid-entry",
                    message: "Creature entry must be an object",
                    severity: "error",
                })
                continue
            }
            const creature = raw as Record<string, unknown>
            if (!creature.name || typeof creature.name !== "string") {
                issues.push({
                    path: `creatures.${id}.name`,
                    code: "missing-name",
                    message: "Creature must have a name",
                    severity: "error",
                })
            }
            const attrs = creature.attributes
            if (!attrs || typeof attrs !== "object" || Array.isArray(attrs)) {
                issues.push({
                    path: `creatures.${id}.attributes`,
                    code: "missing-attributes",
                    message: "Creature must have attributes object",
                    severity: "error",
                })
            } else {
                for (const stat of CHAR_ATTRIBUTES) {
                    const val = (attrs as Record<string, unknown>)[stat]
                    if (val != null && typeof val !== "number") {
                        issues.push({
                            path: `creatures.${id}.attributes.${stat}`,
                            code: "invalid-attribute",
                            message: `${stat} must be a number`,
                            severity: "error",
                        })
                    }
                }
            }
            const actionIDs = creature.actionIDs
            if (actionIDs != null) {
                if (!Array.isArray(actionIDs)) {
                    issues.push({
                        path: `creatures.${id}.actionIDs`,
                        code: "invalid-actionIDs",
                        message: "actionIDs must be an array",
                        severity: "error",
                    })
                } else if (rules) {
                    for (const aid of actionIDs) {
                        if (
                            typeof aid !== "string" ||
                            !actionIdExists(aid, root as unknown as CombatSandboxRoot, rules)
                        ) {
                            issues.push({
                                path: `creatures.${id}.actionIDs`,
                                code: "unknown-action",
                                message: `Unknown action card id "${String(aid)}"`,
                                severity: "error",
                            })
                        }
                    }
                }
            }

            if (creature.role == null) {
                issues.push({
                    path: `creatures.${id}.role`,
                    code: "missing-role",
                    message: "Creature role is not set (assistant, minion, or summon)",
                    severity: "warning",
                })
            }

            const creatureTypes = creature.creatureTypes
            if (creatureTypes != null) {
                if (!Array.isArray(creatureTypes)) {
                    issues.push({
                        path: `creatures.${id}.creatureTypes`,
                        code: "invalid-creatureTypes",
                        message: "creatureTypes must be an array",
                        severity: "error",
                    })
                } else if (creatureTypes.length > 1) {
                    issues.push({
                        path: `creatures.${id}.creatureTypes`,
                        code: "multiple-creature-types",
                        message: "A creature may only have one creature type",
                        severity: "warning",
                    })
                }
            }

            const defaultWeaponKey = creature.defaultNaturalWeaponKey
            const naturalWeapons = creature.naturalWeapons
            if (defaultWeaponKey != null) {
                if (typeof defaultWeaponKey !== "string" || !defaultWeaponKey.trim()) {
                    issues.push({
                        path: `creatures.${id}.defaultNaturalWeaponKey`,
                        code: "invalid-defaultNaturalWeaponKey",
                        message: "defaultNaturalWeaponKey must be a non-empty string",
                        severity: "error",
                    })
                } else if (
                    !naturalWeapons ||
                    typeof naturalWeapons !== "object" ||
                    Array.isArray(naturalWeapons) ||
                    !(defaultWeaponKey in (naturalWeapons as Record<string, unknown>))
                ) {
                    issues.push({
                        path: `creatures.${id}.defaultNaturalWeaponKey`,
                        code: "missing-natural-weapon-key",
                        message: `defaultNaturalWeaponKey "${defaultWeaponKey}" not found in naturalWeapons`,
                        severity: "error",
                    })
                }
            }

            if (naturalWeapons != null) {
                if (typeof naturalWeapons !== "object" || Array.isArray(naturalWeapons)) {
                    issues.push({
                        path: `creatures.${id}.naturalWeapons`,
                        code: "invalid-naturalWeapons",
                        message: "naturalWeapons must be an object map",
                        severity: "error",
                    })
                } else {
                    for (const [key, weapon] of Object.entries(
                        naturalWeapons as Record<string, unknown>,
                    )) {
                        if (!weapon || typeof weapon !== "object" || Array.isArray(weapon)) {
                            issues.push({
                                path: `creatures.${id}.naturalWeapons.${key}`,
                                code: "invalid-natural-weapon",
                                message: "Natural weapon entry must be an object",
                                severity: "error",
                            })
                            continue
                        }
                        const w = weapon as Record<string, unknown>
                        if (typeof w.name !== "string" || !w.name.trim()) {
                            issues.push({
                                path: `creatures.${id}.naturalWeapons.${key}.name`,
                                code: "missing-natural-weapon-name",
                                message: "Natural weapon must have a name",
                                severity: "error",
                            })
                        }
                        if (w.damage != null && typeof w.damage !== "number") {
                            issues.push({
                                path: `creatures.${id}.naturalWeapons.${key}.damage`,
                                code: "invalid-natural-weapon-damage",
                                message: "Natural weapon damage must be a number",
                                severity: "error",
                            })
                        }
                    }
                }
            }

            const traitRefs = creature.traitRefs
            if (traitRefs != null) {
                if (!Array.isArray(traitRefs)) {
                    issues.push({
                        path: `creatures.${id}.traitRefs`,
                        code: "invalid-traitRefs",
                        message: "traitRefs must be an array",
                        severity: "error",
                    })
                } else if (rules) {
                    const bestiaryTraits =
                        (rules.bestiary as { traits?: Record<string, unknown> })?.traits ?? {}
                    for (const ref of traitRefs) {
                        if (typeof ref !== "string" || !ref.trim()) {
                            issues.push({
                                path: `creatures.${id}.traitRefs`,
                                code: "invalid-trait-ref",
                                message: "traitRefs entries must be non-empty strings",
                                severity: "error",
                            })
                        } else if (!(ref in bestiaryTraits)) {
                            issues.push({
                                path: `creatures.${id}.traitRefs`,
                                code: "unknown-trait-ref",
                                message: `Trait ref "${ref}" not found in rules.bestiary.traits`,
                                severity: "warning",
                            })
                        }
                    }
                }
            }

            const vulnerabilities = creature.vulnerabilities
            if (vulnerabilities != null) {
                if (!Array.isArray(vulnerabilities)) {
                    issues.push({
                        path: `creatures.${id}.vulnerabilities`,
                        code: "invalid-vulnerabilities",
                        message: "vulnerabilities must be an array",
                        severity: "error",
                    })
                } else {
                    for (let i = 0; i < vulnerabilities.length; i++) {
                        const row = vulnerabilities[i]
                        if (!row || typeof row !== "object" || Array.isArray(row)) {
                            issues.push({
                                path: `creatures.${id}.vulnerabilities[${i}]`,
                                code: "invalid-vulnerability",
                                message: "Vulnerability entry must be an object with stat",
                                severity: "error",
                            })
                            continue
                        }
                        const stat = (row as Record<string, unknown>).stat
                        if (typeof stat !== "string" || !stat.trim()) {
                            issues.push({
                                path: `creatures.${id}.vulnerabilities[${i}].stat`,
                                code: "missing-vulnerability-stat",
                                message: "Vulnerability must have a stat",
                                severity: "error",
                            })
                        }
                    }
                }
            }
        }
    }

    const actionCards = root.actionCards
    if (actionCards == null) {
        issues.push({
            path: "actionCards",
            code: "missing-actionCards",
            message: "actionCards must be an object map (can be empty)",
            severity: "error",
        })
    } else if (typeof actionCards !== "object" || Array.isArray(actionCards)) {
        issues.push({
            path: "actionCards",
            code: "invalid-actionCards",
            message: "actionCards must be an object map",
            severity: "error",
        })
    } else {
        for (const [id, raw] of Object.entries(actionCards as Record<string, unknown>)) {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
                issues.push({
                    path: `actionCards.${id}`,
                    code: "invalid-entry",
                    message: "Action card entry must be an object",
                    severity: "error",
                })
                continue
            }
            const card = raw as Record<string, unknown>
            if (!card.name || typeof card.name !== "string") {
                issues.push({
                    path: `actionCards.${id}.name`,
                    code: "missing-name",
                    message: "Action card must have a name",
                    severity: "warning",
                })
            }
        }
    }

    return issues
}
