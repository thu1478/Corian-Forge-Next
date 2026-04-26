"use client"

import { Shield, Zap, Footprints } from "lucide-react"

interface CombatStatsProps {
  armorClass: number
  initiative: number
  speed: number
}

export function CombatStats({ armorClass, initiative, speed }: CombatStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="flex flex-col items-center p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <Shield className="w-5 h-5 text-primary mb-1" />
        <span className="text-2xl font-bold text-foreground">{armorClass}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Armor Class</span>
      </div>
      
      <div className="flex flex-col items-center p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <Zap className="w-5 h-5 text-primary mb-1" />
        <span className="text-2xl font-bold text-foreground">+{initiative}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Initiative</span>
      </div>
      
      <div className="flex flex-col items-center p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
        <Footprints className="w-5 h-5 text-primary mb-1" />
        <span className="text-2xl font-bold text-foreground">{speed}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Speed</span>
      </div>
    </div>
  )
}
