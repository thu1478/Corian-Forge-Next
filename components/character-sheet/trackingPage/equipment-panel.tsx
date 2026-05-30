"use client"

import {useState} from "react"
import {cn} from "@/lib/utils"
import {
    AlertTriangle,
    Sword,
    Shield,
    Shirt,
    Crown,
    Eye,
    Ear,
    Gem,
    Footprints,
    CircleDot,
    Sparkles,
    ChevronDown,
    X
} from "lucide-react"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {ArmorItem, Equipment, InventoryItem, MiscItem, ShieldItem, WeaponItem} from "@/lib/equipment-data";
import {armorStatSummary, shieldStatSummary, weaponStatSummary} from "@/lib/equipment-stats-display";
import type { TraitRef } from "@/lib/baseRefs";
import { buildWeaponBondContext, isBondedWeapon } from "@/lib/weapon-utils";
import { getItemNameClass, type RulesWithItemRanks } from "@/lib/item-rank-display";
import { WeaponBondBadge } from "@/components/equipment/weapon-bond-badge";
import { heavyMightRequirementDeficitMessage, martialProficiencyDeficitMessage } from "@/lib/equipment-proficiency";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCreatureTemplates, type RulesWithBestiary } from "@/lib/creature-roster";
import { buildAnimaWeaponSlotUid, listNaturalWeaponOptionsForTemplate, type RulesWithNaturalWeapons } from "@/lib/natural-weapons";

export function ProficiencyAlert({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="-m-1 p-1 rounded text-amber-500 hover:bg-amber-500/15 shrink-0"
                    aria-label="Proficiency warning"
                >
                    <AlertTriangle className="w-4 h-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={4} className="max-w-[min(92vw,280px)] text-xs leading-snug">
                {message}
            </TooltipContent>
        </Tooltip>
    );
}

interface EquipmentPanelProps {
    equipment: {
        activeWeapon: WeaponItem | ShieldItem | null;
        offhand: WeaponItem | ShieldItem | null;
        armor: ArmorItem | null;
        accessories: Record<string, MiscItem | null>;
    };
    inventory: InventoryItem[]; // Keep this for the selection dropdowns
    onAccessoryChange: (slot: keyof Equipment["accessories"], uid: string | null) => void;
    onEquipmentChange: (slot: "activeWeapon" | "offhand" | "armor", item: any) => void;
    /** When set, martial-tagged gear without matching class proficiency shows a warning. */
    martialProficiencyIds?: ReadonlySet<string> | null;
    /** Used for Heavy equipment requirement warnings. */
    might?: number;
    /** When true, shields may be equipped in the main hand (Guardian Shield Master). */
    shieldMaster?: boolean;
    traits?: TraitRef[];
    bondedWeaponUids?: string[];
    rules?: RulesWithItemRanks;
    /** When set, only natural weapon hand slots are editable; other gear is stashed. */
    activeDruidAnimaTemplateId?: string | null;
}

function EquippedWeaponName({
    item,
    bonded,
    rules,
    className,
}: {
    item: WeaponItem | ShieldItem
    bonded: boolean
    rules?: RulesWithItemRanks
    className?: string
}) {
    return (
        <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
            <span className={cn("truncate font-medium text-sm", getItemNameClass(item, rules))}>
                {item.name}
            </span>
            {item.type === "weapon" ? <WeaponBondBadge bonded={bonded} /> : null}
        </span>
    )
}

const accessorySlots: { key: keyof Equipment["accessories"]; label: string; icon: React.ReactNode }[] = [
    {key: "head", label: "Head", icon: <Crown className="w-4 h-4"/>},
    {key: "face", label: "Face", icon: <Eye className="w-4 h-4"/>},
    {key: "ears", label: "Ears", icon: <Ear className="w-4 h-4"/>},
    {key: "neck", label: "Neck", icon: <Gem className="w-4 h-4"/>},
    {key: "back", label: "Back", icon: <Sparkles className="w-4 h-4"/>},
    {key: "hands", label: "Hands", icon: <CircleDot className="w-4 h-4"/>},
    {key: "ringLeft", label: "Ring (L)", icon: <CircleDot className="w-4 h-4"/>},
    {key: "ringRight", label: "Ring (R)", icon: <CircleDot className="w-4 h-4"/>},
    {key: "waist", label: "Waist", icon: <CircleDot className="w-4 h-4"/>},
    {key: "feet", label: "Feet", icon: <Footprints className="w-4 h-4"/>}
]

export function EquipmentPanel({
    equipment,
    inventory,
    onAccessoryChange,
    onEquipmentChange,
    martialProficiencyIds = null,
    might,
    shieldMaster = false,
    traits,
    bondedWeaponUids,
    rules,
    activeDruidAnimaTemplateId = null,
}: EquipmentPanelProps) {
    const [showEquipped, setShowEquipped] = useState<"all" | "equipped" | "empty">("all")
    const bondCtx = buildWeaponBondContext(traits, bondedWeaponUids ?? [])

    const animaMode = Boolean(activeDruidAnimaTemplateId)
    const animaNaturalWeapons = (() => {
        if (!animaMode || !activeDruidAnimaTemplateId || !rules) return []
        const template = getCreatureTemplates(rules as RulesWithBestiary)[activeDruidAnimaTemplateId]
        return listNaturalWeaponOptionsForTemplate(template, rules as RulesWithNaturalWeapons)
    })()

    const animaHandOptions = animaNaturalWeapons.map(({ key, weapon }) => ({
        key,
        weapon,
        uid: buildAnimaWeaponSlotUid(key),
    }))

    const activeProfWarn =
        martialProficiencyIds != null
            ? martialProficiencyDeficitMessage(equipment.activeWeapon, martialProficiencyIds)
            : null;
    const offhandProfWarn =
        martialProficiencyIds != null
            ? martialProficiencyDeficitMessage(equipment.offhand, martialProficiencyIds)
            : null;
    const armorProfWarn =
        martialProficiencyIds != null
            ? martialProficiencyDeficitMessage(equipment.armor, martialProficiencyIds)
            : null;
    const activeHeavyWarn = heavyMightRequirementDeficitMessage(equipment.activeWeapon, might)
    const offhandHeavyWarn = heavyMightRequirementDeficitMessage(equipment.offhand, might)
    const armorHeavyWarn = heavyMightRequirementDeficitMessage(equipment.armor, might)
    const activeWarn = [activeProfWarn, activeHeavyWarn].filter(Boolean).join(" ")
    const offhandWarn = [offhandProfWarn, offhandHeavyWarn].filter(Boolean).join(" ")
    const armorWarn = [armorProfWarn, armorHeavyWarn].filter(Boolean).join(" ")
    const anyEquipProfWarn = !!(activeWarn || offhandWarn || armorWarn);

    const filteredAccessories = accessorySlots.filter(slot => {
        if (showEquipped === "all") return true
        if (showEquipped === "equipped") return equipment.accessories[slot.key] !== null
        return equipment.accessories[slot.key] === null
    })

    // Get items from inventory that can be equipped to a specific slot
    const getItemsForSlot = (slot: string) => {
        if (animaMode && (slot === "activeWeapon" || slot === "offhand")) {
            return animaHandOptions.map(({ weapon }) => weapon)
        }
        if (slot === "activeWeapon") {
            return inventory.filter(
                (item): item is WeaponItem | ShieldItem =>
                    item.type === "weapon" || (shieldMaster && item.type === "shield"),
            );
        }
        if (slot === "offhand") {
            return inventory.filter(
                (item): item is WeaponItem | ShieldItem =>
                    item.type === "weapon" || item.type === "shield"
            );
        }
        if (slot === "armor") {
            return inventory.filter((item): item is ArmorItem => item.type === "armor");
        }
        return inventory.filter((item): item is MiscItem =>
            item.allowedSlots?.includes(slot as any) ?? false
        );
    };

    return (
        <div className="space-y-4">
            {/* Main Equipment */}
            <div className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="text-base font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                        <Sword className="w-5 h-5"/>
                        Equipment
                    </h3>
                    {anyEquipProfWarn ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="-m-1 p-1 rounded text-amber-500 hover:bg-amber-500/15 shrink-0"
                                    aria-label="Equipment proficiency warnings"
                                >
                                    <AlertTriangle className="w-5 h-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[min(92vw,280px)] text-xs leading-snug space-y-1.5">
                                <p className="font-semibold text-background">Equipment warnings</p>
                                {[activeWarn, offhandWarn, armorWarn].filter(Boolean).map((t, i) => (
                                    <p key={i}>{t}</p>
                                ))}
                            </TooltipContent>
                        </Tooltip>
                    ) : null}
                </div>

                {animaMode ? (
                    <p className="mb-3 text-xs text-muted-foreground leading-snug rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                        Anima form — normal equipment is stashed. Choose natural weapons for each hand below.
                    </p>
                ) : null}

                <div className="space-y-3">
                    {/* Active Weapon */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Sword className="w-4 h-4 shrink-0"/>
                                <span className="text-xs uppercase tracking-wider font-medium">Active Weapon</span>
                            </div>
                            <ProficiencyAlert message={activeWarn || null} />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-between text-sm h-9">
                <span className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 truncate",
                    !!equipment.activeWeapon ? "" : "text-muted-foreground italic"
                )}>
                    {equipment.activeWeapon ? (
                        <EquippedWeaponName
                            item={equipment.activeWeapon}
                            bonded={isBondedWeapon(equipment.activeWeapon.uid, bondCtx)}
                            rules={rules}
                        />
                    ) : (
                        "Empty"
                    )}
                </span>
                                    <ChevronDown className="w-4 h-4 shrink-0 ml-2"/>
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="w-[280px]">
                                <DropdownMenuItem onClick={() => onEquipmentChange?.("activeWeapon", null)}>
                                    <X className="w-4 h-4 mr-2 text-muted-foreground"/>
                                    <span className="text-muted-foreground italic">Unequip</span>
                                </DropdownMenuItem>

                                {(getItemsForSlot("activeWeapon") as (WeaponItem | ShieldItem)[]).map((item) => (
                                    <DropdownMenuItem
                                        key={item.uid}
                                        onClick={() => onEquipmentChange?.("activeWeapon", item)}
                                        className="flex flex-col items-start gap-0.5 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            {item.type === "weapon" ? <Sword className="w-3 h-3 opacity-50"/> :
                                                <Shield className="w-3 h-3 opacity-50"/>}
                                            <EquippedWeaponName
                                                item={item}
                                                bonded={isBondedWeapon(item.uid, bondCtx)}
                                                rules={rules}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground leading-snug">
                                            {item.type === "weapon"
                                                ? weaponStatSummary(item)
                                                : shieldStatSummary(item)}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {equipment.activeWeapon ? (
                            <p className="mt-2 text-[10px] font-mono tabular-nums text-muted-foreground truncate">
                                {equipment.activeWeapon.type === "weapon"
                                    ? weaponStatSummary(equipment.activeWeapon)
                                    : shieldStatSummary(equipment.activeWeapon)}
                            </p>
                        ) : null}
                    </div>

                    {/* OFFHAND SLOT */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Shield className="w-4 h-4 shrink-0"/>
                                <span className="text-xs uppercase tracking-wider font-medium">Offhand</span>
                            </div>
                            <ProficiencyAlert message={offhandWarn || null} />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-between text-sm h-9">
                    <span className={cn(
                        "flex min-w-0 flex-1 items-center gap-1.5 truncate",
                        !!equipment.offhand ? "" : "text-muted-foreground italic"
                    )}>
                        {equipment.offhand ? (
                            <EquippedWeaponName
                                item={equipment.offhand}
                                bonded={isBondedWeapon(equipment.offhand.uid, bondCtx)}
                                rules={rules}
                            />
                        ) : (
                            "Empty"
                        )}
                    </span>
                                    <ChevronDown className="w-4 h-4 shrink-0 ml-2"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[280px]">
                                <DropdownMenuItem onClick={() => onEquipmentChange?.("offhand", null)}>
                                    <X className="w-4 h-4 mr-2 text-muted-foreground"/>
                                    <span className="text-muted-foreground italic">Unequip</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator/>

                                {(getItemsForSlot("offhand") as (WeaponItem | ShieldItem)[]).map((item) => (
                                    <DropdownMenuItem
                                        key={item.uid}
                                        onClick={() => onEquipmentChange?.("offhand", item)}
                                        className="flex flex-col items-start gap-0.5 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            {item.type === "weapon" ? <Sword className="w-3 h-3 opacity-50"/> :
                                                <Shield className="w-3 h-3 opacity-50"/>}
                                            <EquippedWeaponName
                                                item={item}
                                                bonded={isBondedWeapon(item.uid, bondCtx)}
                                                rules={rules}
                                            />
                                        </div>

                                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground leading-snug">
                                            {item.type === "weapon"
                                                ? weaponStatSummary(item)
                                                : shieldStatSummary(item)}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {equipment.offhand ? (
                            <p className="mt-2 text-[10px] font-mono tabular-nums text-muted-foreground truncate">
                                {equipment.offhand.type === "weapon"
                                    ? weaponStatSummary(equipment.offhand)
                                    : shieldStatSummary(equipment.offhand)}
                            </p>
                        ) : null}
                    </div>

                    {!animaMode ? (
                    <>
                    {/* Armor */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center justify-between gap-2 text-muted-foreground mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <Shirt className="w-4 h-4 shrink-0"/>
                                <span className="text-xs uppercase tracking-wider font-medium">Armor</span>
                            </div>
                            <ProficiencyAlert message={armorWarn || null} />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-between text-sm h-9">
                <span className={cn(
                    "truncate",
                    !!equipment.armor ? "text-foreground" : "text-muted-foreground italic"
                )}>
                    {/* This works because every item has a name */}
                    {equipment.armor?.name || "No Armor Equipped"}
                </span>
                                    <ChevronDown className="w-4 h-4 shrink-0 ml-2"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[280px]">
                                <DropdownMenuItem onClick={() => onEquipmentChange?.("armor", null)}>
                                    <X className="w-4 h-4 mr-2 text-muted-foreground"/>
                                    <span className="text-muted-foreground italic">Unequip</span>
                                </DropdownMenuItem>
                                {(inventory.filter(i => i.type === 'armor') as ArmorItem[]).map((item) => (
                                    <DropdownMenuItem
                                        key={item.uid}
                                        onClick={() => onEquipmentChange?.("armor", item)}
                                        className="flex flex-col items-start gap-0.5"
                                    >
                                        <span className="font-medium text-sm">{item.name}</span>
                                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground leading-snug">
                                            {armorStatSummary(item)}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {equipment.armor ? (
                            <p className="mt-2 text-[10px] font-mono tabular-nums text-muted-foreground truncate">
                                {armorStatSummary(equipment.armor)}
                            </p>
                        ) : null}
                    </div>
                    </>
                    ) : null}
                </div>
            </div>

            {!animaMode ? (
            <>
            {/* Accessories */}
            <div className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold uppercase tracking-wider text-primary">
                        Accessories
                    </h3>
                    <div className="flex gap-1">
                        {(["all", "equipped", "empty"] as const).map(option => (
                            <button
                                key={option}
                                onClick={() => setShowEquipped(option)}
                                className={cn(
                                    "px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize",
                                    showEquipped === option
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredAccessories.map(({key, label, icon}) => {
                        // item is now a full MiscItem object from your HydratedCharacter
                        const item = equipment.accessories[key];
                        const availableItems = getItemsForSlot(key);

                        return (
                            <div
                                key={key}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                    item
                                        ? "bg-muted/20 border-border"
                                        : "bg-muted/5 border-border/30"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                                    item ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground/50"
                                )}>
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">
                            {label}
                        </span>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-between text-sm h-8 px-3"
                                            >
                                    <span className={cn(
                                        "truncate text-left",
                                        item ? "text-foreground" : "text-muted-foreground/50 italic"
                                    )}>
                                        {/* Updated: Accessing .name from the hydrated object */}
                                        {item?.name || "Empty"}
                                    </span>
                                                <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-2 opacity-50"/>
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="start" className="w-[240px]">
                                            <DropdownMenuItem
                                                className="text-muted-foreground focus:text-foreground italic cursor-pointer"
                                                onClick={() => onAccessoryChange(key, null)}
                                            >
                                                <X className="w-4 h-4 mr-2"/>
                                                <span>Unequip</span>
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator/>

                                            {availableItems.map((invItem) => (
                                                <DropdownMenuItem
                                                    key={invItem.uid}
                                                    // Updated: Pass the UID for unique identification
                                                    onClick={() => onAccessoryChange(key, invItem.uid)}
                                                    className="flex flex-col items-start gap-0.5 py-2"
                                                >
                                                    <span className="font-medium text-sm">{invItem.name}</span>
                                                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                                            {invItem.description}
                                        </span>
                                                </DropdownMenuItem>
                                            ))}

                                            {availableItems.length === 0 && (
                                                <div className="p-2 text-center text-xs text-muted-foreground italic">
                                                    No items available
                                                </div>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            </>
            ) : null}
        </div>
    )
}