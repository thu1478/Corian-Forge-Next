"use client"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toggleInventionModulePick } from "@/components/character-creator/logic/class-selection-helpers"
import { formatWeaponInfusionDamageLabel } from "@/components/character-creator/logic/import"
import type { InventionVariant, SpecialInventionSave, WeaponInfusionDamageType } from "@/lib/character-data"
import { getItemRule } from "@/lib/rules-data"

type SpecialInventionRulesUi = {
    variants?: Record<string, { name?: string; description?: string; modulePick?: number }>
    weaponInfusionDamageTypes?: string[]
    modules?: Record<string, { label?: string }>
}

export function SpecialInventionSection({
    inventionRules,
    specialInvention,
    onChange,
}: {
    inventionRules?: SpecialInventionRulesUi
    specialInvention?: SpecialInventionSave
    onChange: (save: SpecialInventionSave | undefined) => void
}) {
    const variant = specialInvention?.variant
    const armorPool = (getItemRule("arm_artificer_armor") as { inventionModulePool?: string[] } | undefined)
        ?.inventionModulePool ?? []
    const backpackPool = (getItemRule("gear_support_backpack") as { inventionModulePool?: string[] } | undefined)
        ?.inventionModulePool ?? []
    const armorModules = specialInvention?.armorModules ?? []
    const backpackModules = specialInvention?.backpackModules ?? []
    const modulePick =
        inventionRules?.variants?.modularArmor?.modulePick ??
        inventionRules?.variants?.supportBackpack?.modulePick ??
        2
    const needsInfusionType = backpackModules.includes("weaponInfusion")
    const infusionTypes = (inventionRules?.weaponInfusionDamageTypes ?? []).filter((d) =>
        ["volt", "water", "fire", "earth"].includes(String(d))
    ) as WeaponInfusionDamageType[]

    return (
        <section className="mt-16 rounded-2xl border border-border bg-card/80 p-6 space-y-6">
            <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                    Special Invention
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    Choose one invention at Artificer level 3. Modular Armor and Support Backpack each require
                    exactly {modulePick} modules; Weapon Infusion also needs a damage type.
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(inventionRules?.variants ?? {}).map(([id, def]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() =>
                            onChange({
                                variant: id as InventionVariant,
                                armorModules: id === "modularArmor" ? specialInvention?.armorModules : undefined,
                                backpackModules:
                                    id === "supportBackpack" ? specialInvention?.backpackModules : undefined,
                                weaponInfusionDamageType:
                                    id === "supportBackpack"
                                        ? specialInvention?.weaponInfusionDamageType
                                        : undefined,
                            })
                        }
                        className={cn(
                            "rounded-xl border p-4 text-left transition-colors",
                            variant === id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/40"
                        )}
                    >
                        <div className="font-bold text-sm">{def.name ?? id}</div>
                        <div className="text-xs text-muted-foreground mt-1">{def.description ?? ""}</div>
                    </button>
                ))}
            </div>
            {variant === "modularArmor" ? (
                <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Armor modules (pick {modulePick})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {armorPool.map((mid) => {
                            const selected = armorModules.includes(mid)
                            const disabled = !selected && armorModules.length >= modulePick
                            return (
                                <button
                                    key={mid}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                        onChange({
                                            variant: "modularArmor",
                                            armorModules: toggleInventionModulePick(
                                                armorModules,
                                                mid,
                                                modulePick
                                            ),
                                            backpackModules: undefined,
                                            weaponInfusionDamageType: undefined,
                                        })
                                    }
                                    className={cn(
                                        "rounded-lg border px-3 py-2 text-xs font-semibold",
                                        selected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border disabled:opacity-40"
                                    )}
                                >
                                    {inventionRules?.modules?.[mid]?.label ?? mid}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : null}
            {variant === "supportBackpack" ? (
                <div className="space-y-4">
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            Backpack modules (pick {modulePick})
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {backpackPool.map((mid) => {
                                const selected = backpackModules.includes(mid)
                                const disabled = !selected && backpackModules.length >= modulePick
                                return (
                                    <button
                                        key={mid}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                            const nextMods = toggleInventionModulePick(
                                                backpackModules,
                                                mid,
                                                modulePick
                                            )
                                            onChange({
                                                variant: "supportBackpack",
                                                backpackModules: nextMods,
                                                armorModules: undefined,
                                                weaponInfusionDamageType: nextMods.includes("weaponInfusion")
                                                    ? specialInvention?.weaponInfusionDamageType
                                                    : undefined,
                                            })
                                        }}
                                        className={cn(
                                            "rounded-lg border px-3 py-2 text-xs font-semibold",
                                            selected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border disabled:opacity-40"
                                        )}
                                    >
                                        {inventionRules?.modules?.[mid]?.label ?? mid}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {needsInfusionType ? (
                        <div className="space-y-1.5 max-w-xs">
                            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                Weapon Infusion damage type
                            </Label>
                            <Select
                                value={specialInvention?.weaponInfusionDamageType ?? ""}
                                onValueChange={(v) =>
                                    onChange({
                                        variant: "supportBackpack",
                                        backpackModules,
                                        weaponInfusionDamageType: v as WeaponInfusionDamageType,
                                    })
                                }
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue placeholder="Select type…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {infusionTypes.map((dt) => (
                                        <SelectItem key={dt} value={dt}>
                                            {formatWeaponInfusionDamageLabel(dt)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    )
}
