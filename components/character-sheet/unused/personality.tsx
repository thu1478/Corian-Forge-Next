"use client"

import { CharacterSaveData } from "@/lib/character-data"
import { Heart, Lightbulb, Link2, AlertTriangle } from "lucide-react"

interface PersonalityProps {
  character: CharacterSaveData
}

export function Personality({ character }: PersonalityProps) {
  const sections = [
    { icon: Heart, label: "Personality Traits", content: character.personalityTraits },
    { icon: Lightbulb, label: "Ideals", content: character.ideals },
    { icon: Link2, label: "Bonds", content: character.bonds },
    { icon: AlertTriangle, label: "Flaws", content: character.flaws },
  ]

  return (
    <div className="space-y-3">
      {sections.map(({ icon: Icon, label, content }) => (
        <div key={label} className="p-3 bg-secondary/30 rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">{label}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
        </div>
      ))}
    </div>
  )
}
