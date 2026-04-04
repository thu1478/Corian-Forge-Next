"use client"

import { Heart, HeartPulse, Skull } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface HitPointsProps {
  current: number
  max: number
  temp: number
  hitDice: string
  deathSaves: {
    successes: number
    failures: number
  }
}

export function HitPoints({ current, max, temp, hitDice, deathSaves }: HitPointsProps) {
  const percentage = (current / max) * 100
  
  const getHealthColor = () => {
    if (percentage > 50) return "bg-stat-dexterity"
    if (percentage > 25) return "bg-stat-constitution"
    return "bg-destructive"
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-secondary/50 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            <span className="text-sm uppercase tracking-wider text-muted-foreground">Hit Points</span>
          </div>
          <span className="text-xs text-primary">{hitDice} Hit Dice</span>
        </div>
        
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-bold text-foreground">{current}</span>
          <span className="text-lg text-muted-foreground">/ {max}</span>
          {temp > 0 && (
            <span className="ml-2 text-sm text-stat-intelligence">(+{temp} temp)</span>
          )}
        </div>
        
        <Progress 
          value={percentage} 
          className="h-3 bg-muted"
        />
      </div>

      <div className="p-4 bg-secondary/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-3">
          <Skull className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm uppercase tracking-wider text-muted-foreground">Death Saves</span>
        </div>
        
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Successes</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={`success-${i}`}
                  className={`w-4 h-4 rounded-full border-2 ${
                    i < deathSaves.successes 
                      ? "bg-stat-dexterity border-stat-dexterity" 
                      : "border-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Failures</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={`failure-${i}`}
                  className={`w-4 h-4 rounded-full border-2 ${
                    i < deathSaves.failures 
                      ? "bg-destructive border-destructive" 
                      : "border-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
