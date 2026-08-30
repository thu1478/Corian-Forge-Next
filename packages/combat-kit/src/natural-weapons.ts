import type { NaturalWeaponDefinition } from "./types.js"

/** Parse `natural:weaponKey` from action hidden tags or `Natural(key)` from visible tags. */
export function parseNaturalWeaponKeyFromAction(
    actionTags: string[] | undefined,
    hiddenTags?: string[] | undefined,
): string | null {
    for (const tag of hiddenTags ?? []) {
        const t = String(tag).trim()
        const lower = t.toLowerCase()
        if (lower.startsWith("natural:")) {
            const key = t.slice("natural:".length).trim()
            if (key) return key
        }
    }
    for (const tag of actionTags ?? []) {
        const m = String(tag).trim().match(/^Natural\(([^)]+)\)$/i)
        if (m?.[1]?.trim()) return m[1].trim()
    }
    return null
}

function weaponHasTag(weapon: NaturalWeaponDefinition, tag: string): boolean {
    const want = tag.trim().toLowerCase()
    return (weapon.tags ?? []).some((t) => String(t).trim().toLowerCase() === want)
}

/** When an action is clearly melee or ranged, pick the sole matching natural weapon if unambiguous. */
export function inferNaturalWeaponKeyFromActionTags(
    actionTags: string[] | undefined,
    naturalWeapons: Record<string, NaturalWeaponDefinition> | undefined,
): string | undefined {
    if (!naturalWeapons) return undefined
    const tags = (actionTags ?? []).map((t) => String(t).trim().toLowerCase())
    const isRanged = tags.includes("ranged")
    const isMelee = tags.includes("melee")
    if (!isRanged && !isMelee) return undefined

    const entries = Object.entries(naturalWeapons)
    if (isRanged) {
        const ranged = entries.filter(([, w]) => weaponHasTag(w, "ranged"))
        if (ranged.length === 1) return ranged[0]![0]
    }
    if (isMelee) {
        const melee = entries.filter(([, w]) => weaponHasTag(w, "melee"))
        if (melee.length === 1) return melee[0]![0]
    }
    return undefined
}

export function resolveNaturalWeaponKeyForRoll(input: {
    naturalWeapons?: Record<string, NaturalWeaponDefinition>
    activeNaturalWeaponKey?: string
    defaultNaturalWeaponKey?: string
    actionWeaponKey?: string
    actionTags?: string[]
    hiddenTags?: string[]
}): string | undefined {
    const weapons = input.naturalWeapons
    if (!weapons || Object.keys(weapons).length === 0) return undefined

    const pick = (key: string | undefined | null): string | undefined => {
        if (!key) return undefined
        return key in weapons ? key : undefined
    }

    const fromOverride = pick(input.actionWeaponKey)
    if (fromOverride) return fromOverride

    const fromHidden = pick(parseNaturalWeaponKeyFromAction(input.actionTags, input.hiddenTags))
    if (fromHidden) return fromHidden

    const fromTags = pick(inferNaturalWeaponKeyFromActionTags(input.actionTags, weapons))
    if (fromTags) return fromTags

    const fromActive = pick(input.activeNaturalWeaponKey)
    if (fromActive) return fromActive

    const fromDefault = pick(input.defaultNaturalWeaponKey)
    if (fromDefault) return fromDefault

    return Object.keys(weapons)[0]
}

export function resolveNaturalWeaponBonus(
    naturalWeapons: Record<string, NaturalWeaponDefinition> | undefined,
    weaponKey: string | undefined,
    usesWeapon: boolean,
): number {
    if (!usesWeapon || !naturalWeapons || !weaponKey) return 0
    return naturalWeapons[weaponKey]?.damage ?? 0
}

export function resolveNaturalWeaponBonusForRoll(input: {
    naturalWeapons?: Record<string, NaturalWeaponDefinition>
    activeNaturalWeaponKey?: string
    defaultNaturalWeaponKey?: string
    actionWeaponKey?: string
    actionTags?: string[]
    hiddenTags?: string[]
    usesWeapon: boolean
}): { weaponKey?: string; weaponBonus: number } {
    const weaponKey = resolveNaturalWeaponKeyForRoll(input)
    const weaponBonus = resolveNaturalWeaponBonus(input.naturalWeapons, weaponKey, input.usesWeapon)
    return { weaponKey, weaponBonus }
}

export function formatNaturalWeaponLabel(
    key: string,
    weapon: NaturalWeaponDefinition | undefined,
): string {
    const name = weapon?.name?.trim() || key
    const dmg = weapon?.damage
    return typeof dmg === "number" ? `${name} (${dmg} dmg)` : name
}
