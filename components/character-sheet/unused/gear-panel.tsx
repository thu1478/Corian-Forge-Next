"use client"

import {useState} from "react"
import {Equipment, InventoryItem} from "@/lib/character-data"
import {cn} from "@/lib/utils"
import {
    Backpack,
    CircleDot,
    Coins,
    Crown,
    Ear,
    Eye,
    Footprints,
    Gem,
    Search,
    Shield,
    Shirt,
    Sparkles,
    Sword
} from "lucide-react"
import {Input} from "@/components/ui/input"

interface GearPanelProps {
  equipment: Equipment
  inventory: InventoryItem[]
  money: number
  ip: number
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

export function GearPanel({ equipment, inventory, money, ip }: GearPanelProps) {
  const [inventorySearch, setInventorySearch] = useState("")
  const [showEquipped, setShowEquipped] = useState<"all" | "equipped" | "empty">("all")

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.description.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  const filteredAccessories = accessorySlots.filter(slot => {
    if (showEquipped === "all") return true
    if (showEquipped === "equipped") return equipment.accessories[slot.key] !== null
    return equipment.accessories[slot.key] === null
  })

  return (
    <div className="space-y-4">
      {/* Currency & IP */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4" />
          Currency
        </h3>

        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mx-auto mb-1">
              <span className="text-yellow-400 font-bold">{money}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-yellow-500/80">Zenny</span>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 border-2 border-violet-500/50 flex items-center justify-center mx-auto mb-1">
              <span className="text-violet-400 font-bold">{ip}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-violet-500/80">IP</span>
          </div>
        </div>
      </div>

      {/* Main Equipment */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
          <Sword className="w-4 h-4" />
          Equipment
        </h3>

        <div className="space-y-2">
          {/* Hands */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                <Sword className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Right Hand</span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                equipment.rightHand ? "text-foreground" : "text-muted-foreground italic"
              )}>
                {equipment.rightHand || "Empty"}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider">Left Hand</span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                equipment.leftHand ? "text-foreground" : "text-muted-foreground italic"
              )}>
                {equipment.leftHand || "Empty"}
              </span>
            </div>
          </div>

          {/* Armor */}
          <div className="p-2 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
              <Shirt className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Armor</span>
            </div>
            <span className={cn(
              "text-xs font-medium",
              equipment.armor ? "text-foreground" : "text-muted-foreground italic"
            )}>
              {equipment.armor || "None"}
            </span>
          </div>
        </div>
      </div>

      {/* Accessories - Improved Layout */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
            Accessories
          </h3>
          <div className="flex gap-1">
            {(["all", "equipped", "empty"] as const).map(option => (
              <button
                key={option}
                onClick={() => setShowEquipped(option)}
                className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-medium transition-colors capitalize",
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

        <div className="space-y-1.5">
          {filteredAccessories.map(({ key, label, icon }) => {
            const item = equipment.accessories[key]
            return (
              <div 
                key={key}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
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
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">{label}</span>
                  <span className={cn(
                    "text-sm font-medium truncate block",
                    item ? "text-foreground" : "text-muted-foreground/50 italic"
                  )}>
                    {item || "Empty"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Inventory with Search */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
          <Backpack className="w-4 h-4" />
          Inventory
          <span className="text-xs text-muted-foreground font-normal">({inventory.length})</span>
        </h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search inventory..."
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-muted/20 border-border"
          />
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/10 border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">{item.name}</span>
                <span className="text-[11px] text-muted-foreground truncate block">
                  {item.description}
                </span>
              </div>
              <span className="text-sm font-bold text-primary ml-3 shrink-0">x{item.quantity}</span>
            </div>
          ))}

          {filteredInventory.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {inventorySearch ? "No items found" : "Inventory is empty"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
