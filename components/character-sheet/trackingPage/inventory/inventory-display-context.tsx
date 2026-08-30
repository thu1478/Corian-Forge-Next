"use client"

import { createContext } from "react"
import type { TraitRef } from "@/lib/baseRefs"
import type { CharacterClass } from "@/lib/rules"
import type { RulesWithItemRanks } from "@/logic/equipment/item-rank-display"
import type { WeaponDamageContext } from "@/logic/equipment/weapon-utils"

export const InventoryItemDisplayContext = createContext<{
    bondedWeaponUids?: string[]
    traits?: TraitRef[]
    rules?: RulesWithItemRanks
    weaponDamageContext?: WeaponDamageContext
    attributes?: {
        might: number
        dexterity: number
        reason: number
        willpower: number
        presence: number
    }
    classes?: CharacterClass[]
}>({})
