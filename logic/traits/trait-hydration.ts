import type { CharacterSaveData } from "@/lib/character-data"
import type { InventoryItem } from "@/lib/equipment-data"
import type { HydratedCharacter } from "@/lib/HydratedChar"
import type { TraitRef } from "@/lib/baseRefs"
import type { RulesRoot } from "@/lib/rules-data"
import type { Trait, TraitEffect } from "@/lib/rules"
import { resolveInventionModulePassiveIds } from "@/logic/traits/helpers"
import { resolvePassiveById } from "@/logic/traits/passive-lookup"
import { resolveTraitEffectsAfterSelection } from "@/logic/traits/selection"

/** Trait ref discovered from save, equipment, or racial passives (pre-hydration). */
export type DiscoveredTraitRef = TraitRef & {
    itemId?: string
    inlineDefinition?: Record<string, unknown>
}

/** Save JSON or item-hydrated character — equipment may be UIDs or resolved items. */
export type TraitDiscoverySource = Pick<CharacterSaveData, "traits" | "race"> & {
    equipment?: CharacterSaveData["equipment"] | HydratedCharacter["equipment"]
    inventory?: Array<CharacterSaveData["inventory"][number] | InventoryItem>
}

export function discoverAllTraitRefs(
    character: TraitDiscoverySource | null | undefined,
    rulesData?: RulesRoot
): DiscoveredTraitRef[] {
    if (!character) return []

    const traitMap = new Map<string, DiscoveredTraitRef>()

    const raceKey = character.race?.toLowerCase()
    const racialPassives =
        raceKey && rulesData?.races?.[raceKey]?.passives
            ? rulesData.races[raceKey].passives
            : undefined
    if (racialPassives) {
        for (const [id, passive] of Object.entries(racialPassives)) {
            if (
                passive &&
                typeof passive === "object" &&
                "type" in passive &&
                (passive as { type?: string }).type === "innate"
            ) {
                traitMap.set(id, {
                    id,
                    source: "racial",
                    inlineDefinition: passive as Record<string, unknown>,
                })
            }
        }
    }

    const baseRefs = character.traits || []
    baseRefs.forEach((t: TraitRef | string | Record<string, unknown>) => {
        const id = typeof t === "object" ? (t as TraitRef).id || Object.keys(t)[0] : String(t)
        const declaredSource =
            typeof t === "object" && typeof (t as TraitRef).source === "string"
                ? (t as TraitRef).source.toLowerCase()
                : "other"
        const existing = traitMap.get(id)
        const next: DiscoveredTraitRef = {
            ...(existing || {}),
            id,
            source: declaredSource,
        }
        if (typeof t === "object") {
            const ref = t as TraitRef & Record<string, unknown>
            if (!ref.id && ref[id]) next.inlineDefinition = ref[id] as Record<string, unknown>
            if (ref.itemId) next.itemId = String(ref.itemId)
            if (Array.isArray(ref.selectedEffectIndices)) {
                next.selectedEffectIndices = ref.selectedEffectIndices
            }
            if (typeof ref.charges === "number") next.charges = ref.charges
        }
        traitMap.set(id, next)
    })

    const activeUids = new Set(
        [
            character.equipment?.activeWeapon,
            character.equipment?.offhand,
            character.equipment?.armor,
            ...Object.values(character.equipment?.accessories || {}),
        ]
            .filter(Boolean)
            .map((slot) => (typeof slot === "object" && slot != null ? slot.uid : slot))
            .filter((uid): uid is string => typeof uid === "string" && uid.length > 0)
    )

    activeUids.forEach((targetUid) => {
        const item = character.inventory?.find((inv) => String(inv.uid) === String(targetUid))
        const itemTraits = item && "traits" in item ? item.traits : undefined
        if (itemTraits) {
            itemTraits.forEach((traitEntry: string | Record<string, unknown>) => {
                const id =
                    typeof traitEntry === "object" ? Object.keys(traitEntry)[0] : traitEntry
                if (!id) return

                traitMap.set(id, {
                    id,
                    source: "equipment",
                    itemId: targetUid,
                    inlineDefinition:
                        typeof traitEntry === "object"
                            ? (traitEntry[id] as Record<string, unknown>)
                            : undefined,
                })
            })
        }

        const catalogId = item && "id" in item ? String(item.id) : ""
        const catalogTraits =
            catalogId && rulesData?.items?.[catalogId] && "traits" in rulesData.items[catalogId]
                ? (rulesData.items[catalogId] as { traits?: unknown }).traits
                : undefined
        if (Array.isArray(catalogTraits)) {
            catalogTraits.forEach((traitEntry: string | Record<string, unknown>) => {
                const id =
                    typeof traitEntry === "string"
                        ? traitEntry
                        : typeof traitEntry === "object" && traitEntry != null
                          ? Object.keys(traitEntry)[0]
                          : ""
                if (!id || traitMap.has(id)) return

                traitMap.set(id, {
                    id,
                    source: "equipment",
                    itemId: targetUid,
                    inlineDefinition:
                        typeof traitEntry === "object" && traitEntry != null
                            ? (traitEntry[id] as Record<string, unknown>)
                            : undefined,
                })
            })
        }

        const inventionPassiveIds = resolveInventionModulePassiveIds(
            String(item?.id ?? ""),
            item && "inventionModules" in item ? item.inventionModules : undefined,
            item && "inventionModuleConfig" in item ? item.inventionModuleConfig : undefined,
            (rulesData ?? {}) as Parameters<typeof resolveInventionModulePassiveIds>[3]
        )
        for (const passiveId of inventionPassiveIds) {
            traitMap.set(passiveId, {
                id: passiveId,
                source: "equipment",
                itemId: targetUid,
            })
        }
    })

    return Array.from(traitMap.values())
}

export function hydrateTraitRefs(
    traitRefs: DiscoveredTraitRef[],
    character: TraitDiscoverySource,
    rulesData: RulesRoot
): Trait[] {
    if (!character) return []

    return traitRefs.reduce((acc: Trait[], tRef) => {
        const ruleData = resolvePassiveById(tRef.id, rulesData, {
            character,
            traitRef: tRef,
        })

        if (ruleData || tRef.id) {
            const saveEffects = Array.isArray((tRef as { effects?: unknown }).effects)
                ? ((tRef as { effects?: unknown }).effects as TraitEffect[])
                : undefined
            const merged: Trait = {
                name: tRef.id,
                description: "",
                minLevel: 1,
                ...ruleData,
                ...tRef,
                id: tRef.id,
                uid: tRef.id,
                source: (tRef.source || ruleData?.source || "other") as Trait["source"],
                effects: saveEffects?.length ? saveEffects : (ruleData?.effects as TraitEffect[] | undefined),
            }
            const resolved = resolveTraitEffectsAfterSelection(
                merged,
                tRef.selectedEffectIndices
            )
            if (resolved) {
                merged.effects = resolved
            }
            acc.push(merged)
        }
        return acc
    }, [])
}
