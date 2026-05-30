import { actionTagsIncludeCanonical } from "@/lib/action-tag-utils"
import type { CreatureDefinition, RulesWithBestiary } from "@/lib/creature-roster"
import { getCreatureTemplates } from "@/lib/creature-roster"
import type { CharAttribute } from "@/lib/rules"
import type { WeaponItem } from "@/lib/equipment-data"
import { isAnimaWeaponSlotUid, parseAnimaWeaponSlotUid, buildAnimaWeaponSlotUid } from "@/lib/anima-weapon-slots"

export { buildAnimaWeaponSlotUid, isAnimaWeaponSlotUid, parseAnimaWeaponSlotUid } from "@/lib/anima-weapon-slots"

export type NaturalWeaponDefinition = {
    name: string
    damage: number
    damageType: string
    range?: number
    tags?: string[]
    attributes?: CharAttribute[]
}

export type NaturalWeaponSystemDefaults = {
    attributes?: CharAttribute[]
    range?: number
    tags?: string[]
}

export type RulesWithNaturalWeapons = RulesWithBestiary & {
    system?: {
        defaults?: {
            naturalWeapon?: NaturalWeaponSystemDefaults
        }
    }
}

const FALLBACK_DEFAULTS: NaturalWeaponSystemDefaults = {
    attributes: ["might", "dexterity"],
    range: 1,
    tags: ["melee", "natural", "brawling"],
}

export function getNaturalWeaponSystemDefaults(
    rules: RulesWithNaturalWeapons
): NaturalWeaponSystemDefaults {
    const raw = rules.system?.defaults?.naturalWeapon
    if (!raw || typeof raw !== "object") return { ...FALLBACK_DEFAULTS }
    const attrs = Array.isArray(raw.attributes)
        ? raw.attributes
              .map((a) => String(a).trim())
              .filter((a): a is CharAttribute =>
                  ["might", "dexterity", "reason", "willpower", "presence"].includes(a)
              )
        : FALLBACK_DEFAULTS.attributes
    const range =
        typeof raw.range === "number" && Number.isFinite(raw.range)
            ? Math.max(0, raw.range)
            : FALLBACK_DEFAULTS.range
    const tags = Array.isArray(raw.tags)
        ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
        : FALLBACK_DEFAULTS.tags
    return {
        attributes: attrs?.length ? attrs : FALLBACK_DEFAULTS.attributes,
        range,
        tags: tags?.length ? tags : FALLBACK_DEFAULTS.tags,
    }
}

export function normalizeNaturalWeapon(
    raw: NaturalWeaponDefinition,
    defaults: NaturalWeaponSystemDefaults
): NaturalWeaponDefinition {
    return {
        name: raw.name,
        damage: raw.damage,
        damageType: raw.damageType,
        range:
            typeof raw.range === "number" && Number.isFinite(raw.range)
                ? Math.max(0, raw.range)
                : defaults.range ?? FALLBACK_DEFAULTS.range,
        tags: raw.tags?.length ? [...raw.tags] : [...(defaults.tags ?? FALLBACK_DEFAULTS.tags!)],
        attributes: raw.attributes?.length
            ? [...raw.attributes]
            : [...(defaults.attributes ?? FALLBACK_DEFAULTS.attributes!)],
    }
}

export function parseNaturalWeaponKeyFromAction(
    actionTags: string[] | undefined,
    hiddenTags?: string[] | undefined
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

export function naturalWeaponDefToWeaponItem(
    def: NaturalWeaponDefinition,
    uid: string,
    naturalKey?: string
): WeaponItem {
    return {
        id: uid,
        uid,
        name: def.name,
        description: "",
        quantity: 1,
        tags: [...(def.tags ?? [])],
        type: "weapon",
        damage: def.damage,
        damageType: def.damageType,
        range: typeof def.range === "number" ? def.range : 1,
        attributes: [...(def.attributes ?? [])],
        ...(naturalKey ? { naturalKey } : {}),
    } as WeaponItem & { naturalKey?: string }
}

export function resolveNaturalWeaponForCreature(
    template: Pick<CreatureDefinition, "naturalWeapons" | "defaultNaturalWeaponKey"> | undefined,
    rules: RulesWithNaturalWeapons,
    key?: string | null
): WeaponItem | null {
    if (!template?.naturalWeapons) return null
    const resolvedKey =
        (key && template.naturalWeapons[key] ? key : null) ??
        (template.defaultNaturalWeaponKey && template.naturalWeapons[template.defaultNaturalWeaponKey]
            ? template.defaultNaturalWeaponKey
            : null)
    if (!resolvedKey) return null
    const raw = template.naturalWeapons[resolvedKey]
    if (!raw) return null
    const def = normalizeNaturalWeapon(raw, getNaturalWeaponSystemDefaults(rules))
    return naturalWeaponDefToWeaponItem(def, buildAnimaWeaponSlotUid(resolvedKey), resolvedKey)
}

export function listNaturalWeaponOptionsForTemplate(
    template: Pick<CreatureDefinition, "naturalWeapons" | "name"> | undefined,
    rules: RulesWithNaturalWeapons
): Array<{ key: string; weapon: WeaponItem }> {
    if (!template?.naturalWeapons) return []
    const defaults = getNaturalWeaponSystemDefaults(rules)
    const out: Array<{ key: string; weapon: WeaponItem }> = []
    for (const [key, raw] of Object.entries(template.naturalWeapons)) {
        const def = normalizeNaturalWeapon(raw, defaults)
        const weapon = naturalWeaponDefToWeaponItem(def, buildAnimaWeaponSlotUid(key), key)
        out.push({ key, weapon })
    }
    return out.sort((a, b) => a.weapon.name.localeCompare(b.weapon.name, undefined, { sensitivity: "base" }))
}

export function resolveAnimaHandWeapon(
    slot: unknown,
    activeTemplateId: string | null | undefined,
    rules: RulesWithNaturalWeapons
): WeaponItem | null {
    const uid =
        slot == null
            ? null
            : typeof slot === "string"
              ? slot
              : typeof slot === "object" && slot !== null && "uid" in slot
                ? String((slot as { uid?: string }).uid ?? "")
                : null
    if (!uid || !isAnimaWeaponSlotUid(uid) || !activeTemplateId) return null
    const key = parseAnimaWeaponSlotUid(uid)
    if (!key) return null
    const template = getCreatureTemplates(rules)[activeTemplateId]
    return resolveNaturalWeaponForCreature(template, rules, key)
}

export function getEquippedAnimaNaturalKeys(character: {
    equipment?: { activeWeapon?: unknown; offhand?: unknown } | null
}): Set<string> {
    const keys = new Set<string>()
    for (const slot of [character.equipment?.activeWeapon, character.equipment?.offhand]) {
        const uid =
            slot == null
                ? null
                : typeof slot === "string"
                  ? slot
                  : typeof slot === "object" && slot !== null && "uid" in slot
                    ? String((slot as { uid?: string }).uid ?? "")
                    : null
        const key = uid ? parseAnimaWeaponSlotUid(uid) : null
        if (key) keys.add(key)
    }
    return keys
}

export function animaWeaponActionVisible(
    actionTags: string[] | undefined,
    hiddenTags: string[] | undefined,
    equippedKeys: Set<string>
): boolean {
    if (!actionTagsIncludeCanonical(actionTags, "Weapon")) return true
    const key = parseNaturalWeaponKeyFromAction(actionTags, hiddenTags)
    if (!key) return equippedKeys.size > 0
    return equippedKeys.has(key)
}

export function resolveNaturalWeaponForAction(
    template: CreatureDefinition | undefined,
    rules: RulesWithNaturalWeapons,
    actionTags: string[] | undefined,
    hiddenTags: string[] | undefined
): WeaponItem | null {
    if (!template) return null
    const key = parseNaturalWeaponKeyFromAction(actionTags, hiddenTags) ?? template.defaultNaturalWeaponKey ?? null
    return resolveNaturalWeaponForCreature(template, rules, key)
}

export function emptyEquipmentSnapshot(): import("@/lib/equipment-data").Equipment {
    return {
        activeWeapon: null,
        offhand: null,
        armor: null,
        accessories: {
            head: null,
            face: null,
            ears: null,
            neck: null,
            back: null,
            hands: null,
            ringLeft: null,
            ringRight: null,
            waist: null,
            feet: null,
        },
    }
}

export function cloneEquipment(eq: import("@/lib/equipment-data").Equipment): import("@/lib/equipment-data").Equipment {
    return {
        activeWeapon: eq.activeWeapon ?? null,
        offhand: eq.offhand ?? null,
        armor: eq.armor ?? null,
        accessories: { ...(eq.accessories ?? emptyEquipmentSnapshot().accessories) },
    }
}

/** Parse inline natural weapon from bestiary JSON row; returns null if invalid. */
export function parseNaturalWeaponFromJson(
    key: string,
    value: unknown
): NaturalWeaponDefinition | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    const o = value as Record<string, unknown>
    const name = typeof o.name === "string" ? o.name.trim() : ""
    const damage = typeof o.damage === "number" && Number.isFinite(o.damage) ? o.damage : NaN
    const damageType = typeof o.damageType === "string" ? o.damageType.trim() : ""
    if (!name || !Number.isFinite(damage) || !damageType) return null

    const range =
        typeof o.range === "number" && Number.isFinite(o.range) ? Math.max(0, o.range) : undefined
    const tagsRaw = o.tags
    const tags = Array.isArray(tagsRaw)
        ? tagsRaw.map((t) => String(t).trim()).filter(Boolean)
        : undefined
    const attrsRaw = o.attributes
    const attributes = Array.isArray(attrsRaw)
        ? attrsRaw
              .map((a) => String(a).trim())
              .filter((a): a is CharAttribute =>
                  ["might", "dexterity", "reason", "willpower", "presence"].includes(a)
              )
        : undefined

    return {
        name,
        damage,
        damageType,
        ...(range !== undefined ? { range } : {}),
        ...(tags?.length ? { tags } : {}),
        ...(attributes?.length ? { attributes } : {}),
    }
}
