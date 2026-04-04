"use client"

import { Character, getAbilityModifier, formatModifier } from "@/lib/character-data"
import { Circle, CircleDot } from "lucide-react"

interface SavingThrowsProps {
  abilities: Character['abilities']
  savingThrows: Character['savingThrows']
  proficiencyBonus: number
}

const abilityNames: (keyof Character['abilities'])[] = [
  'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'
]

export function SavingThrows({ abilities, savingThrows, proficiencyBonus }: SavingThrowsProps) {
  const calculateSaveBonus = (ability: keyof Character['abilities']) => {
    const abilityMod = getAbilityModifier(abilities[ability])
    return savingThrows[ability] ? abilityMod + proficiencyBonus : abilityMod
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Saving Throws</h3>
      <div className="space-y-1">
        {abilityNames.map((ability) => (
          <div 
            key={ability} 
            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/50 transition-colors group"
          >
            {savingThrows[ability] ? (
              <CircleDot className="w-3 h-3 text-primary" />
            ) : (
              <Circle className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="w-8 text-center font-mono text-sm font-semibold text-foreground">
              {formatModifier(calculateSaveBonus(ability))}
            </span>
            <span className="flex-1 text-sm capitalize text-foreground group-hover:text-primary transition-colors">
              {ability}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
