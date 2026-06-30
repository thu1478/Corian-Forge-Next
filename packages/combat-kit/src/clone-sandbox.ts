import type { CombatSandboxRoot, SandboxSection } from "./types.js"

export type CloneSandboxResult =
    | {
          ok: true
          sandbox: CombatSandboxRoot
          entryPath: string
          section: SandboxSection
          newId: string
      }
    | {
          ok: false
          error: string
      }

function sectionMap(
    sandbox: CombatSandboxRoot,
    section: SandboxSection,
): Record<string, unknown> | undefined {
    const map = sandbox[section]
    if (!map || typeof map !== "object" || Array.isArray(map)) return undefined
    return map as Record<string, unknown>
}

export function cloneSandboxEntry(
    sandbox: CombatSandboxRoot,
    section: SandboxSection,
    sourceId: string,
    newId: string,
    overrides?: Record<string, unknown>,
): CloneSandboxResult {
    const trimmedSource = String(sourceId ?? "").trim()
    const trimmedNew = String(newId ?? "").trim()

    if (!trimmedSource) return { ok: false, error: "Source id is required" }
    if (!trimmedNew) return { ok: false, error: "New id is required" }
    if (trimmedSource === trimmedNew) return { ok: false, error: "New id must differ from source id" }

    const map = sectionMap(sandbox, section)
    if (!map) return { ok: false, error: `Invalid section "${section}"` }

    const source = map[trimmedSource]
    if (!source || typeof source !== "object") {
        return { ok: false, error: `Source "${trimmedSource}" not found in ${section}` }
    }
    if (map[trimmedNew]) {
        return { ok: false, error: `Id "${trimmedNew}" already exists in ${section}` }
    }

    const clone = structuredClone(source) as Record<string, unknown>
    if (overrides) Object.assign(clone, overrides)

    const next: CombatSandboxRoot = structuredClone(sandbox)
    ;(next[section] as Record<string, unknown>)[trimmedNew] = clone

    return {
        ok: true,
        sandbox: next,
        entryPath: `${section}.${trimmedNew}`,
        section,
        newId: trimmedNew,
    }
}

export function deleteSandboxEntry(
    sandbox: CombatSandboxRoot,
    section: SandboxSection,
    entryId: string,
): CloneSandboxResult {
    const trimmed = String(entryId ?? "").trim()
    if (!trimmed) return { ok: false, error: "Entry id is required" }

    const map = sectionMap(sandbox, section)
    if (!map) return { ok: false, error: `Invalid section "${section}"` }
    if (!map[trimmed]) return { ok: false, error: `Entry "${trimmed}" not found in ${section}` }

    const next: CombatSandboxRoot = structuredClone(sandbox)
    delete (next[section] as Record<string, unknown>)[trimmed]

    return {
        ok: true,
        sandbox: next,
        entryPath: `${section}.${trimmed}`,
        section,
        newId: trimmed,
    }
}

export function createSandboxEntry(
    sandbox: CombatSandboxRoot,
    section: SandboxSection,
    newId: string,
    overrides?: Record<string, unknown>,
): CloneSandboxResult {
    const trimmedNew = String(newId ?? "").trim()
    if (!trimmedNew) return { ok: false, error: "New id is required" }

    const map = sectionMap(sandbox, section)
    if (!map) return { ok: false, error: `Invalid section "${section}"` }
    if (map[trimmedNew]) {
        return { ok: false, error: `Id "${trimmedNew}" already exists in ${section}` }
    }

    const blank =
        section === "creatures"
            ? {
                  name: trimmedNew,
                  role: "summon",
                  level: 1,
                  creatureTypes: [],
                  tags: [],
                  attributes: {
                      might: 10,
                      dexterity: 10,
                      reason: 10,
                      willpower: 10,
                      presence: 10,
                  },
                  actionIDs: [],
                  naturalWeapons: {},
              }
            : {
                  name: trimmedNew,
                  type: "action",
                  description: "",
                  source: "sandbox",
                  tags: [],
                  powerRoll: { rollStats: ["might"], tier1Dmg: 0, tier2Dmg: 0, tier3Dmg: 0 },
              }

    const entry = { ...blank, ...(overrides ?? {}) }
    const next: CombatSandboxRoot = structuredClone(sandbox)
    ;(next[section] as Record<string, unknown>)[trimmedNew] = entry

    return {
        ok: true,
        sandbox: next,
        entryPath: `${section}.${trimmedNew}`,
        section,
        newId: trimmedNew,
    }
}
