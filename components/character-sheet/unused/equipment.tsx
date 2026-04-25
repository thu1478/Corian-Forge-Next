"use client"

import { CharacterSaveData } from "@/lib/character-data"
import { Backpack, Check } from "lucide-react"

interface EquipmentProps {
  equipment: CharacterSaveData['equipment']
  currency: CharacterSaveData['currency']
}

export function Equipment({ equipment, currency }: EquipmentProps) {
  const totalWeight = equipment.reduce((acc, item) => acc + (item.weight * item.quantity), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Backpack className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Equipment</h3>
        </div>
        <span className="text-xs text-muted-foreground">{totalWeight} lbs</span>
      </div>
      
      {/* Currency */}
      <div className="grid grid-cols-5 gap-2 p-3 bg-secondary/30 rounded-lg">
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-amber-700">{currency.copper}</span>
          <span className="text-[10px] uppercase text-muted-foreground">CP</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-gray-400">{currency.silver}</span>
          <span className="text-[10px] uppercase text-muted-foreground">SP</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-blue-300">{currency.electrum}</span>
          <span className="text-[10px] uppercase text-muted-foreground">EP</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-primary">{currency.gold}</span>
          <span className="text-[10px] uppercase text-muted-foreground">GP</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold text-cyan-300">{currency.platinum}</span>
          <span className="text-[10px] uppercase text-muted-foreground">PP</span>
        </div>
      </div>
      
      {/* Equipment List */}
      <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
        {equipment.map((item) => (
          <div 
            key={item.name} 
            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-secondary/50 transition-colors group"
          >
            {item.equipped && (
              <Check className="w-3 h-3 text-primary" />
            )}
            <span className={`flex-1 text-sm ${item.equipped ? "text-primary font-medium" : "text-foreground"}`}>
              {item.name}
            </span>
            {item.quantity > 1 && (
              <span className="text-xs text-muted-foreground">×{item.quantity}</span>
            )}
            <span className="text-xs text-muted-foreground">{item.weight * item.quantity} lb</span>
          </div>
        ))}
      </div>
    </div>
  )
}
