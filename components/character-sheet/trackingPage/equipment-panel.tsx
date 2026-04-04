"use client"

import { useState } from "react"
import { Equipment, InventoryItem } from "@/lib/character-data"
import { cn } from "@/lib/utils"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EquipmentPanelProps {
  equipment: Equipment
  inventory: InventoryItem[]
  onAccessoryChange?: (slot: keyof Equipment["accessories"], value: string | null) => void
  onEquipmentChange?: (slot: "rightHand" | "leftHand" | "armor", value: string | null) => void
}

const accessorySlots: { key: keyof Equipment["accessories"]; label: string; icon: React.ReactNode }[] = [
  { key: "head", label: "Head", icon: <Crown className="w-4 h-4" /> },
  { key: "face", label: "Face", icon: <Eye className="w-4 h-4" /> },
  { key: "ears", label: "Ears", icon: <Ear className="w-4 h-4" /> },
  { key: "neck", label: "Neck", icon: <Gem className="w-4 h-4" /> },
  { key: "back", label: "Back", icon: <Sparkles className="w-4 h-4" /> },
  { key: "hands", label: "Hands", icon: <CircleDot className="w-4 h-4" /> },
  { key: "ringLeft", label: "Ring (L)", icon: <CircleDot className="w-4 h-4" /> },
  { key: "ringRight", label: "Ring (R)", icon: <CircleDot className="w-4 h-4" /> },
  { key: "waist", label: "Waist", icon: <CircleDot className="w-4 h-4" /> },
  { key: "feet", label: "Feet", icon: <Footprints className="w-4 h-4" /> }
]

export function EquipmentPanel({ equipment, inventory, onAccessoryChange, onEquipmentChange }: EquipmentPanelProps) {
  const [showEquipped, setShowEquipped] = useState<"all" | "equipped" | "empty">("all")

  const filteredAccessories = accessorySlots.filter(slot => {
    if (showEquipped === "all") return true
    if (showEquipped === "equipped") return equipment.accessories[slot.key] !== null
    return equipment.accessories[slot.key] === null
  })

  // Get items from inventory that can be equipped to a specific slot
  const getItemsForSlot = (slot: keyof Equipment["accessories"] | "rightHand" | "leftHand" | "armor") => {
    return inventory.filter(item => {
      if (slot === "rightHand" || slot === "leftHand") {
        return item.type === "weapon" || item.slot === slot
      }
      if (slot === "armor") {
        return item.type === "armor" || item.slot === "armor"
      }
      // For accessory slots, check if item can go in this slot or any ring slot for rings
      if (slot === "ringLeft" || slot === "ringRight") {
        return item.slot === "ringLeft" || item.slot === "ringRight" || item.slot === slot
      }
      return item.slot === slot
    })
  }

  return (
    <div className="space-y-4">
      {/* Main Equipment */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <Sword className="w-5 h-5" />
          Equipment
        </h3>

        <div className="space-y-3">
          {/* Hands */}
          <div className="grid grid-cols-2 gap-3">
            {/* Right Hand */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Sword className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-medium">Right Hand</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full justify-between text-sm h-9"
                  >
                    <span className={cn(
                      "truncate",
                      equipment.rightHand ? "text-foreground" : "text-muted-foreground italic"
                    )}>
                      {equipment.rightHand || "Empty"}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuItem onClick={() => onEquipmentChange?.("rightHand", null)}>
                    <X className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground italic">Unequip</span>
                  </DropdownMenuItem>
                  {getItemsForSlot("rightHand").map((item) => (
                    <DropdownMenuItem 
                      key={item.id}
                      onClick={() => onEquipmentChange?.("rightHand", item.name)}
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.damage && (
                        <span className="ml-auto text-xs text-muted-foreground font-mono">{item.damage}</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Left Hand */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Shield className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-medium">Left Hand</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full justify-between text-sm h-9"
                  >
                    <span className={cn(
                      "truncate",
                      equipment.leftHand ? "text-foreground" : "text-muted-foreground italic"
                    )}>
                      {equipment.leftHand || "Empty"}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuItem onClick={() => onEquipmentChange?.("leftHand", null)}>
                    <X className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground italic">Unequip</span>
                  </DropdownMenuItem>
                  {getItemsForSlot("leftHand").map((item) => (
                    <DropdownMenuItem 
                      key={item.id}
                      onClick={() => onEquipmentChange?.("leftHand", item.name)}
                    >
                      <span className="font-medium">{item.name}</span>
                      {item.damage && (
                        <span className="ml-auto text-xs text-muted-foreground font-mono">{item.damage}</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Armor */}
          <div className="p-3 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Shirt className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">Armor</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full justify-between text-sm h-9"
                >
                  <span className={cn(
                    "truncate",
                    equipment.armor ? "text-foreground" : "text-muted-foreground italic"
                  )}>
                    {equipment.armor || "None"}
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem onClick={() => onEquipmentChange?.("armor", null)}>
                  <X className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground italic">Unequip</span>
                </DropdownMenuItem>
                {getItemsForSlot("armor").map((item) => (
                  <DropdownMenuItem 
                    key={item.id}
                    onClick={() => onEquipmentChange?.("armor", item.name)}
                  >
                    <span className="font-medium">{item.name}</span>
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

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredAccessories.map(({ key, label, icon }) => {
            const item = equipment.accessories[key]
            const availableItems = getItemsForSlot(key)
            
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
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium block mb-1">{label}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full justify-between text-sm h-8"
                      >
                        <span className={cn(
                          "truncate text-left",
                          item ? "text-foreground" : "text-muted-foreground/50 italic"
                        )}>
                          {item || "Empty"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[220px]">
                      <DropdownMenuItem onClick={() => onAccessoryChange?.(key, null)}>
                        <X className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-muted-foreground italic">Unequip</span>
                      </DropdownMenuItem>
                      {availableItems.map((invItem) => (
                        <DropdownMenuItem 
                          key={invItem.id}
                          onClick={() => onAccessoryChange?.(key, invItem.name)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{invItem.name}</span>
                            <span className="text-xs text-muted-foreground">{invItem.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      {availableItems.length === 0 && (
                        <DropdownMenuItem disabled>
                          <span className="text-muted-foreground italic">No items available</span>
                        </DropdownMenuItem>
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
