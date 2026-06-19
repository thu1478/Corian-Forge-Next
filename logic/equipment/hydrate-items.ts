import type { CharacterSaveData } from "@/lib/character-data"
import type { ArmorItem, MiscItem, ShieldItem, WeaponItem } from "@/lib/equipment-data"
import type { HydratedCharacter } from "@/lib/HydratedChar"
import { isAnimaWeaponSlotUid, resolveAnimaHandWeapon, type RulesWithNaturalWeapons } from "@/logic/equipment/natural-weapons"
import { resolveHydratedItemCharges } from "@/logic/equipment/item-charges"

/** Pure item + equipment slot hydration (no React). */
export function hydrateCharacterItems(
    rawCharacter: CharacterSaveData,
    rules: { items: Record<string, unknown> } & RulesWithNaturalWeapons
): HydratedCharacter {
    const attributes = rawCharacter.attributes ?? {}
    const fullInventory = rawCharacter.inventory.map((entry) => {
        const itemDef = rules.items[entry.id] as Record<string, unknown> | undefined

        if (!itemDef) {
            console.warn(`Could not find item definition for ID: ${entry.id}`)
        }

        const ruleName = (itemDef?.name as string) ?? `Unknown (${entry.id})`
        const custom = typeof entry.customName === "string" ? entry.customName.trim() : ""
        const rankRaw =
            typeof entry.rank === "string" && entry.rank.trim()
                ? entry.rank.trim()
                : typeof itemDef?.rank === "string" && (itemDef.rank as string).trim()
                  ? (itemDef.rank as string).trim()
                  : "common"
        const chargeSnapshot = resolveHydratedItemCharges(
            entry,
            itemDef as import("@/logic/equipment/item-charges").ItemChargeRules,
            attributes
        )
        return {
            ...itemDef,
            uid: entry.uid,
            id: entry.id,
            customName: custom || undefined,
            rank: rankRaw,
            quantity: entry.quantity ?? (itemDef?.quantity as number) ?? 1,
            containerId: entry.containerId ?? null,
            inventionModules: entry.inventionModules,
            inventionModuleConfig: entry.inventionModuleConfig,
            name: custom || ruleName,
            description: (itemDef?.description as string) ?? "",
            ...(chargeSnapshot ? { charges: chargeSnapshot } : {}),
        } as Record<string, unknown> & { uid: string; id: string; type?: string }
    })

    const equipment = rawCharacter.equipment
    const resolveHandSlot = (slot: unknown): WeaponItem | ShieldItem | null => {
        if (slot == null) return null
        const uid = typeof slot === "string" ? slot : null
        if (!uid) return null
        if (isAnimaWeaponSlotUid(uid)) {
            return resolveAnimaHandWeapon(
                uid,
                rawCharacter.activeDruidAnimaTemplateId,
                rules
            )
        }
        const i = fullInventory.find((x) => x.uid === uid)
        if (!i) return null
        if (i.type === "weapon" || i.type === "shield") return i as unknown as WeaponItem | ShieldItem
        return null
    }

    const hydratedEquipment = {
        activeWeapon: resolveHandSlot(equipment.activeWeapon),
        offhand: resolveHandSlot(equipment.offhand),
        armor: (fullInventory.find((i) => i.uid === equipment.armor) as ArmorItem | undefined) ?? null,
        accessories: Object.fromEntries(
            Object.entries(equipment.accessories ?? {}).map(([slot, uid]) => [
                slot,
                (fullInventory.find((i) => i.uid === uid) as MiscItem | undefined) ?? null,
            ])
        ),
    }

    return {
        resistances: [],
        vulnerabilities: {},
        ...rawCharacter,
        inventory: fullInventory,
        equipment: hydratedEquipment,
    } as unknown as HydratedCharacter
}
