import type { RulesRoot } from "@/lib/rules-data"

export type RulesValidationSeverity = "error" | "warning"

export type RulesValidationIssue = {
    path: string
    code: string
    message: string
    severity: RulesValidationSeverity
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
    if (classes && typeof classes === "object" && !Array.isArray(classes)) {
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
                        message: 'Use "traitRefs" instead of legacy "traits" string array on creature templates',
                        severity: "error",
                    })
                }
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
