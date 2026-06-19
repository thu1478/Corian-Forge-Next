import type { CloneSection, RulesRoot } from "./types.js"
import { validateRulesDocument } from "./validate-rules.js"

export type CloneRulesResult =
    | {
          ok: true
          rules: RulesRoot
          entryPath: string
          section: CloneSection
          newId: string
      }
    | {
          ok: false
          error: string
      }

function sectionMap(rules: RulesRoot, section: CloneSection): Record<string, unknown> | undefined {
    const map = rules[section]
    if (!map || typeof map !== "object" || Array.isArray(map)) return undefined
    return map as Record<string, unknown>
}

/**
 * Deep-clone a rules entry under `items`, `passives`, or `actionCards`.
 */
export function cloneRulesEntry(
    rules: RulesRoot,
    section: CloneSection,
    sourceId: string,
    newId: string,
    overrides?: Record<string, unknown>,
): CloneRulesResult {
    const trimmedSource = String(sourceId ?? "").trim()
    const trimmedNew = String(newId ?? "").trim()

    if (!trimmedSource) return { ok: false, error: "Source id is required" }
    if (!trimmedNew) return { ok: false, error: "New id is required" }
    if (trimmedSource === trimmedNew) return { ok: false, error: "New id must differ from source id" }

    const map = sectionMap(rules, section)
    if (!map) return { ok: false, error: `Section "${section}" is missing or invalid` }

    const source = map[trimmedSource]
    if (!source || typeof source !== "object") {
        return { ok: false, error: `No entry "${trimmedSource}" in ${section}` }
    }
    if (map[trimmedNew] != null) {
        return { ok: false, error: `Entry "${trimmedNew}" already exists in ${section}` }
    }

    const cloned = structuredClone(source) as Record<string, unknown>
    if (overrides && typeof overrides === "object") {
        Object.assign(cloned, overrides)
    }

    const next: RulesRoot = structuredClone(rules)
    const nextMap = sectionMap(next, section)!
    nextMap[trimmedNew] = cloned

    return {
        ok: true,
        rules: next,
        entryPath: `${section}.${trimmedNew}`,
        section,
        newId: trimmedNew,
    }
}

export function deleteRulesEntry(
    rules: RulesRoot,
    section: CloneSection,
    entryId: string,
): CloneRulesResult {
    const trimmed = String(entryId ?? "").trim()
    if (!trimmed) return { ok: false, error: "Entry id is required" }

    const map = sectionMap(rules, section)
    if (!map) return { ok: false, error: `Section "${section}" is missing or invalid` }
    if (map[trimmed] == null) return { ok: false, error: `No entry "${trimmed}" in ${section}` }

    const next: RulesRoot = structuredClone(rules)
    const nextMap = sectionMap(next, section)!
    delete nextMap[trimmed]

    return {
        ok: true,
        rules: next,
        entryPath: `${section}.${trimmed}`,
        section,
        newId: trimmed,
    }
}

export function createRulesEntry(
    rules: RulesRoot,
    section: CloneSection,
    newId: string,
    overrides?: Record<string, unknown>,
): CloneRulesResult {
    const trimmedNew = String(newId ?? "").trim()
    if (!trimmedNew) return { ok: false, error: "New id is required" }

    const map = sectionMap(rules, section)
    if (!map) return { ok: false, error: `Section "${section}" is missing or invalid` }
    if (map[trimmedNew] != null) {
        return { ok: false, error: `Entry "${trimmedNew}" already exists in ${section}` }
    }

    const displayName =
        typeof overrides?.name === "string" && overrides.name.trim()
            ? overrides.name.trim()
            : trimmedNew

    let base: Record<string, unknown>
    switch (section) {
        case "passives":
            base = {
                name: displayName,
                minLevel: 1,
                description: "",
                effects: [],
            }
            break
        case "actionCards":
            base = {
                name: displayName,
                type: "action",
                description: "",
                tags: [],
                source: "custom",
                apCost: 0,
            }
            break
        case "items":
            base = {
                name: displayName,
                type: "misc",
                description: "",
                tags: [],
                quantity: 1,
            }
            break
        default:
            return { ok: false, error: `Unknown section "${section}"` }
    }

    const entry = { ...base, ...(overrides ?? {}) }

    const next: RulesRoot = structuredClone(rules)
    const nextMap = sectionMap(next, section)!
    nextMap[trimmedNew] = entry

    return {
        ok: true,
        rules: next,
        entryPath: `${section}.${trimmedNew}`,
        section,
        newId: trimmedNew,
    }
}

export function validateCloneResult(rules: RulesRoot) {
    return validateRulesDocument(rules)
}
