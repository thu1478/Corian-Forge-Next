import type {CharacterSaveData} from "@/lib/character-data"
import type {RulesWithBestiary} from "@/logic/creatures/roster"
import {resolveCreatureTraitEntries} from "@/logic/creatures/roster"
import type {MountedRiderBonuses} from "@/logic/creatures/mounted-creature"
import type {Trait, TraitEffect} from "@/lib/rules"

function slugToWords(slug: string): string {
    return slug
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
}

function immunityDisplayLabel(effect: TraitEffect): string | null {
    if (effect.type !== "Immunity") return null
    const raw = effect.stat?.trim()
    if (!raw) return null
    return slugToWords(raw)
}

/** Rules keys for `GrantSight.stat` → combat sheet line. */
const GRANT_SIGHT_LABELS: Record<string, string> = {
    metaphysical: "Metaphysical sight",
    "low-light": "Low-light vision",
    mana: "Manasight",
}

const GRANT_MOVEMENT_LABELS: Record<string, string> = {
    swimming: "Swimming",
    climbing: "Climbing",
    flying: "Flying",
}

function grantSightDisplayLabel(effect: TraitEffect): string | null {
    if (effect.type !== "GrantSight") return null
    const raw = effect.stat?.trim()
    if (!raw) return null
    const key = raw.toLowerCase()
    if (GRANT_SIGHT_LABELS[key]) return GRANT_SIGHT_LABELS[key]
    return slugToWords(raw)
}

function movementModeLabel(mode: string): string {
    const key = mode.trim().toLowerCase()
    return GRANT_MOVEMENT_LABELS[key] ?? slugToWords(key)
}

function pushUnique(out: string[], seen: Set<string>, label: string | null) {
    if (!label || seen.has(label)) return
    seen.add(label)
    out.push(label)
}

export type SpecialMovementEntry = {
    mode: string
    speed: number
    source?: "trait" | "mount"
}

function resolveGrantMovementSpeed(value: string | undefined, landSpeed: number): number | null {
    const v = String(value ?? "").trim()
    if (!v) return landSpeed
    if (v.toLowerCase() === "speed") return landSpeed
    const n = Number(v)
    return Number.isFinite(n) ? Math.floor(n) : null
}

function collectGrantMovementFromTraitEffects(
    effects: TraitEffect[] | undefined,
    landSpeed: number,
    source: "trait" | "mount"
): SpecialMovementEntry[] {
    const out: SpecialMovementEntry[] = []
    for (const e of effects ?? []) {
        if (e.type !== "GrantMovement") continue
        const mode = String(e.stat ?? "").trim().toLowerCase()
        if (!mode) continue
        const speed = resolveGrantMovementSpeed(e.value, landSpeed)
        if (speed == null) continue
        out.push({ mode, speed, source })
    }
    return out
}

/** Condition immunities from resolved `Immunity` trait effects (rules-driven). */
export function collectConditionImmunitiesFromTraits(traits: Trait[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const t of traits) {
        for (const e of t.effects ?? []) {
            if (e.type !== "Immunity") continue
            pushUnique(out, seen, immunityDisplayLabel(e))
        }
    }
    return out
}

/** Special sight lines from resolved `GrantSight` trait effects. */
export function collectSpecialSightFromTraits(traits: Trait[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const t of traits) {
        for (const e of t.effects ?? []) {
            if (e.type !== "GrantSight") continue
            pushUnique(out, seen, grantSightDisplayLabel(e))
        }
    }
    return out
}

/** Always-on character trait movement (e.g. Elf Swimming Grace). */
export function collectSpecialMovementFromTraits(
    traits: Trait[],
    landSpeed: number
): SpecialMovementEntry[] {
    const out: SpecialMovementEntry[] = []
    for (const t of traits) {
        out.push(...collectGrantMovementFromTraitEffects(t.effects, landSpeed, "trait"))
    }
    return out
}

/** Mount-only movement while riding (GrantMovement on mount traits + Rider Adaptable). */
export function collectMountedSpecialMovement(
    mounted: MountedRiderBonuses | null,
    character: CharacterSaveData,
    rules: RulesWithBestiary
): SpecialMovementEntry[] {
    if (!mounted) return []
    const mountSpeed = mounted.speed
    const out: SpecialMovementEntry[] = []

    const traitEntries = resolveCreatureTraitEntries(rules, mounted.template.traitRefs)
    for (const t of traitEntries) {
        out.push(...collectGrantMovementFromTraitEffects(t.effects, mountSpeed, "mount"))
    }

    const movement = character.riderAdaptableMovement
    if (
        character.riderMountType === "adaptable" &&
        (movement === "swimming" || movement === "climbing")
    ) {
        out.push({ mode: movement, speed: mountSpeed, source: "mount" })
    }

    return out
}

export function mergeSpecialMovementEntries(entries: SpecialMovementEntry[]): SpecialMovementEntry[] {
    const byMode = new Map<string, SpecialMovementEntry>()
    for (const e of entries) {
        const prev = byMode.get(e.mode)
        if (!prev || e.speed > prev.speed) byMode.set(e.mode, e)
    }
    return [...byMode.values()].sort((a, b) => a.mode.localeCompare(b.mode))
}

export function formatSpecialMovementLine(entry: SpecialMovementEntry): string {
    return `${movementModeLabel(entry.mode)} ${entry.speed}`
}

export function collectSpecialMovement(ctx: {
    traits: Trait[]
    landSpeed: number
    character: CharacterSaveData
    rules: RulesWithBestiary
    mounted: MountedRiderBonuses | null
}): SpecialMovementEntry[] {
    const traitEntries = collectSpecialMovementFromTraits(ctx.traits, ctx.landSpeed)
    const mountEntries = collectMountedSpecialMovement(ctx.mounted, ctx.character, ctx.rules)
    return mergeSpecialMovementEntries([...traitEntries, ...mountEntries])
}

export function collectSpecialMovementDisplayLines(entries: SpecialMovementEntry[]): string[] {
    return entries.map(formatSpecialMovementLine)
}
