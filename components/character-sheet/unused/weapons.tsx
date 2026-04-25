"use client"

import { CharacterSaveData } from "@/lib/character-data"
import { Sword } from "lucide-react"

interface WeaponsProps {
  weapons: CharacterSaveData['weapons']
}

export function Weapons({ weapons }: WeaponsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sword className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Attacks & Spellcasting</h3>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50">
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Name</th>
              <th className="text-center py-2 px-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Atk Bonus</th>
              <th className="text-center py-2 px-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Damage</th>
              <th className="text-right py-2 px-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Type</th>
            </tr>
          </thead>
          <tbody>
            {weapons.map((weapon, index) => (
              <tr 
                key={weapon.name} 
                className={`hover:bg-secondary/30 transition-colors ${
                  index !== weapons.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <td className="py-2 px-3 font-medium text-foreground">{weapon.name}</td>
                <td className="py-2 px-3 text-center font-mono text-primary">+{weapon.attackBonus}</td>
                <td className="py-2 px-3 text-center font-mono text-foreground">{weapon.damage}</td>
                <td className="py-2 px-3 text-right text-muted-foreground">{weapon.damageType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
