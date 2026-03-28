"use client"

import { useState } from "react"
import { InventoryItem } from "@/lib/character-data"
import { 
  Backpack, 
  Coins, 
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface InventoryPanelProps {
  inventory: InventoryItem[]
  money: number
  ip: number
}

export function InventoryPanel({ inventory, money, ip }: InventoryPanelProps) {
  const [inventorySearch, setInventorySearch] = useState("")

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.description.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Currency & IP */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Currency
        </h3>

        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center mx-auto mb-2">
              <span className="text-yellow-500 dark:text-yellow-400 font-bold text-xl">{money}</span>
            </div>
            <span className="text-xs uppercase tracking-wider text-yellow-600 dark:text-yellow-500/80 font-medium">Gold</span>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-violet-500/20 border-2 border-violet-500/50 flex items-center justify-center mx-auto mb-2">
              <span className="text-violet-500 dark:text-violet-400 font-bold text-xl">{ip}</span>
            </div>
            <span className="text-xs uppercase tracking-wider text-violet-600 dark:text-violet-500/80 font-medium">IP</span>
          </div>
        </div>
      </div>

      {/* Inventory with Search */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <Backpack className="w-5 h-5" />
          Inventory
          <span className="text-sm text-muted-foreground font-normal">({inventory.length})</span>
        </h3>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search inventory..."
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            className="h-10 pl-10 text-base bg-muted/20 border-border"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-foreground block">{item.name}</span>
                <span className="text-sm text-muted-foreground truncate block">
                  {item.description}
                </span>
              </div>
              <span className="text-base font-bold text-primary ml-3 shrink-0">x{item.quantity}</span>
            </div>
          ))}

          {filteredInventory.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {inventorySearch ? "No items found" : "Inventory is empty"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
