import type { RulesRoot } from "@/lib/rules-data"
import type { CharAttribute } from "@/lib/rules"

export type RulesValidationSeverity = "error" | "warning"

export type RulesValidationIssue = {
    path: string
    code: string
    message: string
    severity: RulesValidationSeverity
}

const CHAR_ATTRIBUTES: CharAttribute[] = [
    "might",
    "dexterity",
    "reason",
    "willpower",
    "presence",
]

function validateItemRequirements(
    itemId: string,
    raw: unknown,
    classIds: Set<string>,
    issues: RulesValidationIssue[],
) {
    if (raw == null) return
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        issues.push({
            path: `items.${itemId}.requirements`,
            code: "invalid-item-requirements",
            message: "Item requirements must be an object",
            severity: "warning",
        })
        return
    }

    const req = raw as Record<string, unknown>
    const stats = req.stats
    if (stats != null) {
        if (typeof stats !== "object" || Array.isArray(stats)) {
            issues.push({
                path: `items.${itemId}.requirements.stats`,
                code: "invalid-item-stat-requirements",
                message: "requirements.stats must be an object",
                severity: "warning",
            })
        } else {
            for (const [key, value] of Object.entries(stats as Record<string, unknown>)) {
                if (!CHAR_ATTRIBUTES.includes(key as CharAttribute)) {
                    issues.push({
                        path: `items.${itemId}.requirements.stats.${key}`,
                        code: "unknown-stat-requirement",
                        message: `Unknown attribute "${key}" in requirements.stats`,
                        severity: "warning",
                    })
                }
                if (typeof value !== "number" || !Number.isFinite(value)) {
                    issues.push({
                        path: `items.${itemId}.requirements.stats.${key}`,
                        code: "invalid-stat-requirement-value",
                        message: "Stat requirement values must be finite numbers",
                        severity: "warning",
                    })
                }
            }
        }
    }

    const classes = req.classes
    if (classes != null) {
        if (typeof classes !== "object" || Array.isArray(classes)) {
            issues.push({
                path: `items.${itemId}.requirements.classes`,
                code: "invalid-item-class-requirements",
                message: "requirements.classes must be an object",
                severity: "warning",
            })
        } else {
            for (const [levelKey, classList] of Object.entries(classes as Record<string, unknown>)) {
                if (!Array.isArray(classList)) {
                    issues.push({
                        path: `items.${itemId}.requirements.classes.${levelKey}`,
                        code: "invalid-class-requirement-bucket",
                        message: "Each requirements.classes entry must be an array of class ids",
                        severity: "warning",
                    })
                    continue
                }
                const level = Number(levelKey)
                if (!Number.isFinite(level) || level < 1) {
                    issues.push({
                        path: `items.${itemId}.requirements.classes.${levelKey}`,
                        code: "invalid-class-requirement-level",
                        message: "Class requirement level keys must be positive numbers",
                        severity: "warning",
                    })
                }
                for (const classId of classList) {
                    if (typeof classId !== "string" || !classId.trim()) continue
                    if (!classIds.has(classId)) {
                        issues.push({
                            path: `items.${itemId}.requirements.classes.${levelKey}`,
                            code: "unknown-class-requirement",
                            message: `Unknown class id "${classId}" in requirements.classes`,
                            severity: "warning",
                        })
                    }
                }
            }
        }
    }
}

const REQUIRED_TOP_LEVEL = [
    "system",
    "classes",
    "races",
    "items",
    "actionCards",
    "passives",
    "bestiary",
] as const

/** Structural + alias checks for bundled rules content. */
export function validateRulesDocument(rules: unknown): RulesValidationIssue[] {
    const issues: RulesValidationIssue[] = []
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) {
        issues.push({
            path: "",
            code: "invalid-root",
            message: "Rules root must be a JSON object",
            severity: "error",
        })
        return issues
    }

    const root = rules as Record<string, unknown>

    for (const key of REQUIRED_TOP_LEVEL) {
        if (!(key in root)) {
            issues.push({
                path: key,
                code: "missing-section",
                message: `Missing required top-level key "${key}"`,
                severity: "error",
            })
        }
    }

    const classes = root.classes
    const classIdSet = new Set<string>()
    if (classes && typeof classes === "object" && !Array.isArray(classes)) {
        for (const classId of Object.keys(classes as Record<string, unknown>)) {
            classIdSet.add(classId)
        }
        for (const [classId, raw] of Object.entries(classes as Record<string, unknown>)) {
            if (!raw || typeof raw !== "object") continue
            const cls = raw as Record<string, unknown>
            if (cls.statBonus != null) {
                issues.push({
                    path: `classes.${classId}.statBonus`,
                    code: "legacy-statBonus",
                    message: 'Use "statBonuses" array instead of legacy "statBonus" object',
                    severity: "error",
                })
            }
            if (cls.skillTraining != null) {
                issues.push({
                    path: `classes.${classId}.skillTraining`,
                    code: "legacy-skillTraining",
                    message: 'Use "skillTrainings" array instead of legacy "skillTraining" object',
                    severity: "error",
                })
            }
            if (!cls.name && !cls.id) {
                issues.push({
                    path: `classes.${classId}`,
                    code: "missing-name",
                    message: "Class entry should have a display name",
                    severity: "warning",
                })
            }
        }
    }

    const bestiary = root.bestiary
    if (bestiary && typeof bestiary === "object" && !Array.isArray(bestiary)) {
        const creatures = (bestiary as { creatures?: unknown }).creatures
        if (creatures && typeof creatures === "object" && !Array.isArray(creatures)) {
            for (const [creatureId, raw] of Object.entries(creatures as Record<string, unknown>)) {
                if (!raw || typeof raw !== "object") continue
                const creature = raw as Record<string, unknown>
                if (Array.isArray(creature.traits) && !Array.isArray(creature.traitRefs)) {
                    issues.push({
                        path: `bestiary.creatures.${creatureId}.traits`,
                        code: "legacy-creature-traits",
                        message:
                            'Use "traitRefs" instead of legacy "traits" string array on creature templates',
                        severity: "error",
                    })
                }
            }
        }
    }

    const items = root.items
    if (items && typeof items === "object" && !Array.isArray(items)) {
        for (const [itemId, raw] of Object.entries(items as Record<string, unknown>)) {
            if (!raw || typeof raw !== "object") continue
            const item = raw as Record<string, unknown>
            if (item.requirements != null) {
                validateItemRequirements(itemId, item.requirements, classIdSet, issues)
            }
        }
    }

    const actionCards = root.actionCards
    if (actionCards && typeof actionCards === "object" && !Array.isArray(actionCards)) {
        for (const [actionId, raw] of Object.entries(actionCards as Record<string, unknown>)) {
            if (!raw || typeof raw !== "object") continue
            const card = raw as Record<string, unknown>
            if (typeof card.name !== "string" || !card.name.trim()) {
                issues.push({
                    path: `actionCards.${actionId}`,
                    code: "missing-action-name",
                    message: "Action card should have a non-empty name",
                    severity: "warning",
                })
            }
        }
    }

    return issues
}

export function validateRulesRoot(rules: RulesRoot): RulesValidationIssue[] {
    return validateRulesDocument(rules)
}

export function hasValidationErrors(issues: RulesValidationIssue[]): boolean {
    return issues.some((i) => i.severity === "error")
}
