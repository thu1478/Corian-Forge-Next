import type { RulesRoot } from "@corian-forge/rules-kit"
import type { CombatSandboxRoot, HydratedActionCard } from "./types.js"

function hydrateFromRules(
    id: string,
    rules: RulesRoot,
): HydratedActionCard | null {
    const globalCard = rules.actionCards?.[id] as unknown as Record<string, unknown> | undefined
    if (globalCard && typeof globalCard === "object") {
        const src = (globalCard.source as string) || "global"
        return {
            ...(globalCard as HydratedActionCard),
            id,
            source: src,
            tags: (globalCard.tags as string[]) ?? [],
        }
    }

    for (const className of Object.keys(rules.classes || {})) {
        const classData = rules.classes![className] as {
            actions?: Record<string, { actionCard?: Record<string, unknown> }>
        }
        const wrapper = classData?.actions?.[id]
        if (wrapper?.actionCard) {
            const ac = wrapper.actionCard
            return {
                ...(ac as HydratedActionCard),
                id,
                source: className,
                tags: (ac.tags as string[]) ?? [],
            }
        }
    }

    return null
}

/** Resolve action card: sandbox local map first, then rules.json. */
export function hydrateSandboxActionCard(
    id: string | undefined | null,
    sandbox: CombatSandboxRoot,
    rules: RulesRoot,
): HydratedActionCard | null {
    if (id == null || id === "") return null

    const local = sandbox.actionCards?.[id]
    if (local && typeof local === "object") {
        return {
            ...local,
            id,
            source: (local.source as string) || "sandbox",
            tags: (local.tags as string[]) ?? [],
        }
    }

    return hydrateFromRules(id, rules)
}

export function listKnownActionCardIds(
    sandbox: CombatSandboxRoot,
    rules: RulesRoot,
): string[] {
    const ids = new Set<string>()
    for (const id of Object.keys(sandbox.actionCards ?? {})) ids.add(id)
    for (const id of Object.keys(rules.actionCards ?? {})) ids.add(id)
    for (const className of Object.keys(rules.classes ?? {})) {
        const cls = rules.classes![className] as { actions?: Record<string, unknown> }
        for (const id of Object.keys(cls.actions ?? {})) ids.add(id)
    }
    return [...ids].sort((a, b) => a.localeCompare(b))
}

export function actionIdExists(
    id: string,
    sandbox: CombatSandboxRoot,
    rules: RulesRoot,
): boolean {
    return hydrateSandboxActionCard(id, sandbox, rules) != null
}
