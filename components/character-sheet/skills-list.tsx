"use client"

import { Character, getAbilityModifier, formatModifier } from "@/lib/character-data"
import { Circle, CircleDot } from "lucide-react"

interface SkillsListProps {
  skills: Character['skills']
  abilities: Character['abilities']
  proficiencyBonus: number
}

const abilityAbbreviations: Record<keyof Character['abilities'], string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA"
}

export function SkillsList({ skills, abilities, proficiencyBonus }: SkillsListProps) {
  const calculateSkillBonus = (skill: Character['skills'][0]) => {
    const abilityMod = getAbilityModifier(abilities[skill.ability])
    let bonus = abilityMod
    if (skill.proficient) bonus += proficiencyBonus
    if (skill.expertise) bonus += proficiencyBonus
    return bonus
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Skills</h3>
      <div className="space-y-0.5">
        {skills.map((skill) => (
          <div 
            key={skill.name} 
            className="flex items-center gap-2 py-1 px-2 rounded hover:bg-secondary/50 transition-colors group"
          >
            <div className="flex items-center gap-1">
              {skill.expertise ? (
                <CircleDot className="w-3 h-3 text-primary" />
              ) : skill.proficient ? (
                <CircleDot className="w-3 h-3 text-primary" />
              ) : (
                <Circle className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            <span className="w-8 text-center font-mono text-sm font-semibold text-foreground">
              {formatModifier(calculateSkillBonus(skill))}
            </span>
            <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors">
              {skill.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {abilityAbbreviations[skill.ability]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
