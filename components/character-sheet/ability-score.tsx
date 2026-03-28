"use client"

import { getAbilityModifier, formatModifier } from "@/lib/character-data"

interface AbilityScoreProps {
  name: string
  score: number
  colorClass: string
}

export function AbilityScore({ name, score, colorClass }: AbilityScoreProps) {
  const modifier = getAbilityModifier(score)
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative w-20 h-24 flex flex-col items-center justify-center rounded-lg border-2 ${colorClass} bg-secondary/50 transition-all hover:scale-105`}
      >
        <span className="text-3xl font-bold text-foreground">{formatModifier(modifier)}</span>
        <div className="absolute -bottom-3 bg-card border border-border rounded-full px-2 py-0.5">
          <span className="text-sm font-semibold text-foreground">{score}</span>
        </div>
      </div>
      <span className="mt-4 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {name}
      </span>
    </div>
  )
}
