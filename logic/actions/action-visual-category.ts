import type { ActionCard } from "@/lib/rules"
import { hiddenTagsIncludeSustainOrBarrier, hiddenTagsIncludeShieldAttack } from "@/logic/combat/power-roll-combat-bonuses"
import { actionTagsIncludeCanonical } from "@/logic/actions/tag-utils"

export type ActionVisualCategory = "equipment" | "sustain" | "spell" | "weapon" | "default"

export type ActionVisualCategoryInput = Pick<
    ActionCard,
    "id" | "source" | "tags" | "hiddenTags" | "grantingItemUid" | "type"
>

export const ACTION_VISUAL_CATEGORY_LABELS: Record<ActionVisualCategory, string> = {
    equipment: "Equipment",
    sustain: "Sustain",
    spell: "Spell",
    weapon: "Weapon",
    default: "Action",
}

export function isEquipmentGrantedAction(
    action: Pick<ActionCard, "id" | "source" | "grantingItemUid">
): boolean {
    if (action.grantingItemUid) return true
    if (action.source === "equipment") return true
    return action.id?.startsWith("equipment/") ?? false
}

export function resolveActionVisualCategory(action: ActionVisualCategoryInput): ActionVisualCategory {
    if (hiddenTagsIncludeSustainOrBarrier(action.hiddenTags)) return "sustain"
    if (actionTagsIncludeCanonical(action.tags, "Spell")) return "spell"
    if (actionTagsIncludeCanonical(action.tags, "Weapon")) return "weapon"
    if (hiddenTagsIncludeShieldAttack(action.hiddenTags)) return "weapon"
    if (isEquipmentGrantedAction(action)) return "equipment"
    return "default"
}

export function formatActionCardSubtitle(action: ActionVisualCategoryInput): string {
    const category = ACTION_VISUAL_CATEGORY_LABELS[resolveActionVisualCategory(action)]
    if (action.type === "reaction") return `${category} · Reaction`
    if (action.type === "freeReaction") return `${category} · Free Reaction`
    return category
}
