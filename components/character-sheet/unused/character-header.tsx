"use client"

import { CharacterSaveData } from "@/lib/character-data"
import { Crown, Scroll, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface CharacterHeaderProps {
  character: CharacterSaveData
}

export function CharacterHeader({ character }: CharacterHeaderProps) {
  // XP thresholds for each level (simplified 5e progression)
  const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]
  const currentLevelXP = xpThresholds[character.level - 1] || 0
  const nextLevelXP = xpThresholds[character.level] || currentLevelXP
  const xpProgress = nextLevelXP > currentLevelXP 
    ? ((character.experiencePoints - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 
    : 100

  return (
    <div className="p-6 bg-card rounded-xl border border-border">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Character Name and Basic Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground tracking-wide">{character.name}</h1>
            <Badge variant="outline" className="text-primary border-primary">
              Level {character.level}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Crown className="w-4 h-4 text-primary" />
              <span>{character.race}</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1">
              <Scroll className="w-4 h-4 text-primary" />
              <span>{character.class}</span>
            </div>
            <span className="text-border">•</span>
            <span>{character.background}</span>
            <span className="text-border">•</span>
            <span>{character.alignment}</span>
          </div>
        </div>

        {/* XP and Proficiency */}
        <div className="flex flex-col sm:flex-row gap-4 lg:items-end">
          {/* Proficiency Bonus */}
          <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-lg border border-border">
            <Star className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Proficiency</span>
              <span className="text-xl font-bold text-foreground">+{character.proficiencyBonus}</span>
            </div>
          </div>

          {/* XP Progress */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Experience Points</span>
              <span className="text-primary font-semibold">{character.experiencePoints.toLocaleString()} XP</span>
            </div>
            <Progress value={xpProgress} className="h-2 bg-muted" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentLevelXP.toLocaleString()}</span>
              <span>{nextLevelXP.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
