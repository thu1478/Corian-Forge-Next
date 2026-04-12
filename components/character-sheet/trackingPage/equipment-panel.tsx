"use client"

import {useState} from "react"
import {cn} from "@/lib/utils"
import {
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

interface EquipmentPanelProps {
    equipment: {
        activeWeapon: WeaponItem | null;
        offhand: WeaponItem | ShieldItem | null;
        armor: ArmorItem | null;
        accessories: Record<string, MiscItem | null>;
    };
    inventory: InventoryItem[]; // Keep this for the selection dropdowns
    onAccessoryChange: (slot: keyof Equipment["accessories"], uid: string | null) => void;
    onEquipmentChange: (slot: "activeWeapon" | "offhand" | "armor", item: any) => void;
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

export function EquipmentPanel({equipment, inventory, onAccessoryChange, onEquipmentChange}: EquipmentPanelProps) {
    const [showEquipped, setShowEquipped] = useState<"all" | "equipped" | "empty">("all")

    const filteredAccessories = accessorySlots.filter(slot => {
        if (showEquipped === "all") return true
        if (showEquipped === "equipped") return equipment.accessories[slot.key] !== null
        return equipment.accessories[slot.key] === null
    })

    // Get items from inventory that can be equipped to a specific slot
    const getItemsForSlot = (slot: string) => {
        if (slot === "activeWeapon") {
            return inventory.filter((item): item is WeaponItem => item.type === "weapon");
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
                <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                    <Sword className="w-5 h-5"/>
                    Equipment
                </h3>

                <div className="space-y-3">
                    {/* Active Weapon */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Sword className="w-4 h-4"/>
                            <span className="text-xs uppercase tracking-wider font-medium">Active Weapon</span>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-between text-sm h-9">
                <span className={cn(
                    "truncate",
                    // equipment.activeWeapon is now the OBJECT, so !! check works
                    !!equipment.activeWeapon ? "text-foreground" : "text-muted-foreground italic"
                )}>
                    {/* Access .name directly from the hydrated object */}
                    {equipment.activeWeapon?.name || "Empty"}
                </span>
                                    <ChevronDown className="w-4 h-4 shrink-0 ml-2"/>
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="w-[220px]">
                                <DropdownMenuItem onClick={() => onEquipmentChange?.("activeWeapon", null)}>
                                    <X className="w-4 h-4 mr-2 text-muted-foreground"/>
                                    <span className="text-muted-foreground italic">Unequip</span>
                                </DropdownMenuItem>

                                {(getItemsForSlot("activeWeapon") as WeaponItem[]).map((item) => (
                                    <DropdownMenuItem
                                        key={item.uid}
                                        onClick={() => onEquipmentChange?.("activeWeapon", item)}
                                        className="flex flex-col items-start gap-0.5"
                                    >
                                        <span className="font-medium text-sm">{item.name}</span>
                                        <div
                                            className="flex gap-2 text-[10px] text-muted-foreground uppercase tracking-tight font-mono">
                                            <span>Dmg: {item.damage} ({item.damageType})</span>
                                            <span>Range: {item.range}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* OFFHAND SLOT */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Shield className="w-4 h-4"/>
                            <span className="text-xs uppercase tracking-wider font-medium">Offhand</span>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full justify-between text-sm h-9">
                    <span className={cn(
                        "truncate",
                        !!equipment.offhand ? "text-foreground" : "text-muted-foreground italic"
                    )}>
                        {equipment.offhand?.name || "Empty"}
                    </span>
                                    <ChevronDown className="w-4 h-4 shrink-0 ml-2"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[220px]">
                                <DropdownMenuItem onClick={() => onEquipmentChange?.("offhand", null)}>
                                    <X className="w-4 h-4 mr-2 text-muted-foreground"/>
                                    <span className="text-muted-foreground italic">Unequip</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator/>

                                {/* Filtered for Weapons OR Shields */}
                                {(inventory.filter(i => i.type === "weapon" || i.type === "shield") as (WeaponItem | ShieldItem)[]).map((item) => (
                                    <DropdownMenuItem
                                        key={item.uid}
                                        onClick={() => onEquipmentChange?.("offhand", item)}
                                        className="flex flex-col items-start gap-0.5 py-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            {item.type === "weapon" ? <Sword className="w-3 h-3 opacity-50"/> :
                                                <Shield className="w-3 h-3 opacity-50"/>}
                                            <span className="font-medium text-sm">{item.name}</span>
                                        </div>

                                        <div
                                            className="flex gap-2 text-[10px] text-muted-foreground uppercase tracking-tight font-mono">
                                            {item.type === "weapon" ? (
                                                <>
                                                    <span>Dmg: {item.damage}</span>
                                                    <span>Range: {item.range}</span>
                                                </>
                                            ) : (
                                                <span>Defense: {item.defense}</span>
                                            )}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Armor */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Shirt className="w-4 h-4"/>
                            <span className="text-xs uppercase tracking-wider font-medium">Armor</span>
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
                            <DropdownMenuContent align="start" className="w-[200px]">
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
                                        <div
                                            className="flex gap-3 text-[10px] text-muted-foreground uppercase font-mono">
                                            {/* FIX: Accessing the nested value property */}
                                            <span>Def: {item.defense.value}</span>
                                            <span>Stab: {item.stability}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

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
        </div>
    )
}