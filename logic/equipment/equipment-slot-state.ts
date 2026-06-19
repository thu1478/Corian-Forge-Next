import { traitRefsIncludeId } from "@/logic/traits/helpers"

/** Apply equip/unequip slot updates (two-handers, shield swap, shield master). */
export const EQUIPMENT_RULES = {
    getNewState: (slot: string, item: any, prev: any) => {
        const incomingUid = item?.uid || null
        const equipment = prev.equipment || {}

        const otherKey = slot === "activeWeapon" ? "offhand" : "activeWeapon"

        const currentOtherValue = equipment[otherKey]
        const currentSlotValue = equipment[slot]

        let updates: any = {
            [slot]: incomingUid,
            [otherKey]: currentOtherValue,
        }

        if (!incomingUid) return { equipment: { ...equipment, ...updates } }

        if (item.type === "2H") {
            updates[otherKey] = null
            return { equipment: { ...equipment, ...updates } }
        }

        const isMovingFromOtherSlot = currentOtherValue === incomingUid

        if (isMovingFromOtherSlot) {
            const slotUid = currentSlotValue
            const invItem = Array.isArray(prev.inventory)
                ? prev.inventory.find((i: any) => i && String(i.uid) === String(slotUid))
                : null
            const isShield =
                invItem?.type === "shield" ||
                (typeof slotUid === "string" && slotUid.includes("shield"))

            const shieldMaster = traitRefsIncludeId(prev.traits, "shieldMaster")
            updates[otherKey] = isShield && !shieldMaster ? null : currentSlotValue
        }

        return {
            equipment: {
                ...equipment,
                ...updates,
            },
        }
    },
}
