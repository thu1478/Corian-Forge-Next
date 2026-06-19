import { actionTagsIncludeCanonical } from "@/logic/actions/tag-utils"
import type { TraitRef } from "@/lib/baseRefs"
import type { Equipment } from "@/lib/equipment-data"
import type { InventoryItem } from "@/lib/equipment-data"
import { buildAnimaWeaponSlotUid } from "@/logic/equipment/anima-weapon-slots"
import { getCreatureTemplates, type CreatureDefinition } from "@/logic/creatures/roster"
import { cloneEquipment, emptyEquipmentSnapshot, type NaturalWeaponDefinition, type RulesWithNaturalWeapons } from "@/logic/equipment/natural-weapons"

export const DRUID_CLASS_ID = "druid"
export const DRUID_ANIMA_PASSIVE_ID = "anima"
export const DRUID_ANIMA_ROSTER_SOURCE = "druidAnima"

type ClassLike = { id: string; level: number }

export type DruidAnimaSlot = {
    slotIndex: number
    maxCatalogLevel: 2 | 4
}

export type AnimaTemplateLike = {
    name?: string
    role?: string
    catalogLevel?: number
    summonTier?: 2 | 4
    tags?: string[]
    actionIDs?: string[]
    naturalWeapons?: Record<string, NaturalWeaponDefinition>
    defaultNaturalWeaponKey?: string
}

export function getDruidLevel(classes: ClassLike[] | undefined): number {
    return classes?.find((c) => c.id === DRUID_CLASS_ID)?.level ?? 0
}

export function hasDruidAnimaPassive(
    traits: TraitRef[] | undefined,
    classes: ClassLike[] | undefined
): boolean {
    if (getDruidLevel(classes) < 3) return false
    return (traits ?? []).some(
        (t) => t.id === DRUID_ANIMA_PASSIVE_ID && String(t.source).toLowerCase() === "class"
    )
}

export function getDruidAnimaSlots(
    classes: ClassLike[] | undefined,
    traits: TraitRef[] | undefined
): DruidAnimaSlot[] {
    const level = getDruidLevel(classes)
    if (level < 3 || !hasDruidAnimaPassive(traits, classes)) return []
    const slots: DruidAnimaSlot[] = [
        { slotIndex: 0, maxCatalogLevel: 2 },
        { slotIndex: 1, maxCatalogLevel: 2 },
    ]
    if (level >= 5) slots.push({ slotIndex: 2, maxCatalogLevel: 4 })
    return slots
}

export function isDruidAnimaTemplate(def: AnimaTemplateLike | undefined): boolean {
    if (!def) return false
    const tags = (def.tags ?? []).map((tag) => tag.trim().toLowerCase())
    return tags.includes("anima") || tags.includes("druidanima") || tags.includes("druid-anima")
}

export function getAnimaTemplateCatalogLevel(def: AnimaTemplateLike | undefined): number | null {
    if (!def) return null
    if (typeof def.catalogLevel === "number" && Number.isFinite(def.catalogLevel)) {
        return Math.floor(def.catalogLevel)
    }
    if (def.summonTier === 4) return 4
    if (def.summonTier === 2) return 2
    return null
}

export function listDruidAnimaCatalogTemplateIds(
    templates: Record<string, AnimaTemplateLike>,
    maxCatalogLevel: 2 | 4
): string[] {
    return Object.entries(templates)
        .filter(([, def]) => {
            if (!isDruidAnimaTemplate(def)) return false
            const level = getAnimaTemplateCatalogLevel(def)
            return level != null && level <= maxCatalogLevel
        })
        .map(([id]) => id)
        .sort((a, b) => {
            const an = templates[a]?.name ?? a
            const bn = templates[b]?.name ?? b
            return an.localeCompare(bn, undefined, { sensitivity: "base" })
        })
}

export function sanitizeDruidAnimaTemplateIds(
    templateIds: string[] | undefined,
    slots: DruidAnimaSlot[],
    templates: Record<string, AnimaTemplateLike>
): string[] {
    if (slots.length === 0) return []
    const used = new Set<string>()
    return slots.map((slot) => {
        const raw = String(templateIds?.[slot.slotIndex] ?? "").trim()
        if (!raw || used.has(raw)) return ""
        const allowed = new Set(listDruidAnimaCatalogTemplateIds(templates, slot.maxCatalogLevel))
        if (!allowed.has(raw)) return ""
        used.add(raw)
        return raw
    })
}

export function getSelectedDruidAnimaTemplateIds(
    templateIds: string[] | undefined,
    slots: DruidAnimaSlot[],
    templates: Record<string, AnimaTemplateLike>
): string[] {
    return sanitizeDruidAnimaTemplateIds(templateIds, slots, templates).filter(Boolean)
}

export function getDruidAnimaActionCardIds(def: AnimaTemplateLike | undefined): string[] {
    return [...new Set((def?.actionIDs ?? []).map((id) => String(id).trim()).filter(Boolean))]
}

export function isDruidAnimaRosterEntry(entry: { rosterSource?: string; id?: string }): boolean {
    return entry.rosterSource === DRUID_ANIMA_ROSTER_SOURCE || String(entry.id ?? "").startsWith("druid-anima-slot-")
}

function resolveEquippedArmor(character: {
    equipment?: { armor?: unknown }
    inventory?: InventoryItem[]
}): InventoryItem | null {
    const armorSlot = character.equipment?.armor
    if (!armorSlot) return null
    if (typeof armorSlot === "object") return armorSlot as InventoryItem
    return character.inventory?.find((item) => String(item.uid) === String(armorSlot)) ?? null
}

export function hasMartialArmorEquipped(character: {
    equipment?: { armor?: unknown }
    inventory?: InventoryItem[]
}): boolean {
    const armor = resolveEquippedArmor(character)
    return armor?.type === "armor" && actionTagsIncludeCanonical(armor.tags, "martial")
}

export function druidAnimaDisabledReason(character: {
    equipment?: { armor?: unknown }
    inventory?: InventoryItem[]
}): string | null {
    if (hasMartialArmorEquipped(character)) return "You cannot use Anima while wearing martial armor."
    return null
}

function defaultAnimaMainHandUid(template: CreatureDefinition | undefined): string | null {
    const key = template?.defaultNaturalWeaponKey?.trim()
    if (!key || !template?.naturalWeapons?.[key]) return null
    return buildAnimaWeaponSlotUid(key)
}

function clearedAnimaEquipment(defaultMainHand: string | null): Equipment {
    return {
        ...emptyEquipmentSnapshot(),
        activeWeapon: defaultMainHand,
        offhand: null,
    }
}

type CharacterWithAnimaEquipment = {
    equipment?: Equipment
    equipmentBeforeAnima?: Equipment | null
    activeDruidAnimaTemplateId?: string | null
}

/** Stash gear, clear slots, and equip default anima natural weapon when entering or switching form. */
export function applyAnimaTransformEquipment(
    character: CharacterWithAnimaEquipment,
    nextTemplateId: string | null,
    rules: RulesWithNaturalWeapons
): Pick<CharacterWithAnimaEquipment, "equipment" | "equipmentBeforeAnima"> {
    const prevTemplateId = character.activeDruidAnimaTemplateId ?? null
    const wasActive = Boolean(prevTemplateId)
    const willBeActive = Boolean(nextTemplateId)

    if (!willBeActive) {
        if (wasActive && character.equipmentBeforeAnima) {
            return {
                equipment: cloneEquipment(character.equipmentBeforeAnima),
                equipmentBeforeAnima: null,
            }
        }
        return {
            equipment: character.equipment,
            equipmentBeforeAnima: character.equipmentBeforeAnima ?? null,
        }
    }

    const templates = getCreatureTemplates(rules)
    const nextTemplate = nextTemplateId ? templates[nextTemplateId] : undefined
    const defaultMain = defaultAnimaMainHandUid(nextTemplate)

    if (!wasActive) {
        const snapshot =
            character.equipmentBeforeAnima ??
            (character.equipment ? cloneEquipment(character.equipment) : emptyEquipmentSnapshot())
        return {
            equipmentBeforeAnima: snapshot,
            equipment: clearedAnimaEquipment(defaultMain),
        }
    }

    if (prevTemplateId !== nextTemplateId) {
        return {
            equipmentBeforeAnima: character.equipmentBeforeAnima ?? null,
            equipment: clearedAnimaEquipment(defaultMain),
        }
    }

    return {
        equipment: character.equipment,
        equipmentBeforeAnima: character.equipmentBeforeAnima ?? null,
    }
}

export function getAnimaBarrierGrant(classes: ClassLike[] | undefined): number {
    return Math.max(0, getDruidLevel(classes) * 3)
}

type CharacterWithAnimaBarrier = {
    barrier?: number
    animaBarrierBonus?: number | null
    activeDruidAnimaTemplateId?: string | null
    classes?: ClassLike[]
}

/** Apply or remove the one-time Anima barrier grant (does not stack on toggle or form swap). */
export function applyAnimaTransformBarrier(
    character: CharacterWithAnimaBarrier,
    nextTemplateId: string | null
): Pick<CharacterWithAnimaBarrier, "barrier" | "animaBarrierBonus"> {
    const wasActive = Boolean(character.activeDruidAnimaTemplateId)
    const willBeActive = Boolean(nextTemplateId)
    const grant = getAnimaBarrierGrant(character.classes)
    const currentBarrier = Math.max(0, Number(character.barrier ?? 0) || 0)

    if (!willBeActive) {
        if (!wasActive) {
            return {
                barrier: currentBarrier,
                animaBarrierBonus: character.animaBarrierBonus ?? null,
            }
        }
        const bonus = Math.max(0, Number(character.animaBarrierBonus ?? grant) || 0)
        return {
            barrier: Math.max(0, currentBarrier - bonus),
            animaBarrierBonus: null,
        }
    }

    if (!wasActive) {
        const staleBonus = Math.max(0, Number(character.animaBarrierBonus ?? 0) || 0)
        const base = Math.max(0, currentBarrier - staleBonus)
        return {
            barrier: base + grant,
            animaBarrierBonus: grant,
        }
    }

    return {
        barrier: currentBarrier,
        animaBarrierBonus: character.animaBarrierBonus ?? grant,
    }
}

