"use client"

import { useState } from "react"
import { CharacterClass, Trait, Skill, Bond, getAttributeModifier, formatModifier } from "@/lib/character-data"
import { cn } from "@/lib/utils"
import { GraduationCap, Sparkles, Languages, Brain, Heart, Star, Filter } from "lucide-react"

interface ClassesPanelProps {
    classes: { id: string; level: number }[]; // Character's specific data
    rules: Record<string, any>;               // The entire classes section of rules.json
}

export function ClassesPanel({ classes, rules }: ClassesPanelProps) {
  const totalLevel = classes.reduce((sum, c) => sum + c.level, 0)

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
        <GraduationCap className="w-5 h-5" />
        Classes
        {/*<span className="text-sm text-muted-foreground font-normal">(Level {totalLevel})</span>*/}
      </h3>

      <div className="space-y-3">
          {classes.map((cls, i) => {

              return (
                  <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border"
                  >
                  <span className="font-semibold text-foreground text-base">
                    {rules?.[cls.id]?.name}
                  </span>
                  <span className="text-base font-bold text-primary">
                    Lv. {cls.level}
                  </span>
                  </div>
              );
          })}
      </div>
    </div>
  )
}

interface TraitsPanelProps {
  traits: Trait[]
}

type TraitSource = "all" | "racial" | "feat" | "class" | "background" | "other"

const sourceColors: Record<string, string> = {
  racial: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50",
  feat: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
  class: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50",
  background: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50",
  other: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/50"
}

const sourceFilterColors: Record<string, string> = {
  all: "bg-primary text-primary-foreground",
  racial: "bg-emerald-600 text-white",
  feat: "bg-amber-600 text-white",
  class: "bg-blue-600 text-white",
  background: "bg-violet-600 text-white",
  other: "bg-slate-600 text-white"
}

export function TraitsPanel({ traits }: TraitsPanelProps) {
  const [filter, setFilter] = useState<TraitSource>("all")

  // Get unique sources from traits
  const availableSources = ["all", ...Array.from(new Set(traits.map(t => t.source)))] as TraitSource[]

  const filteredTraits = filter === "all" 
    ? traits 
    : traits.filter(t => t.source === filter)

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        Traits
        <span className="text-sm text-muted-foreground font-normal">({traits.length})</span>
      </h3>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {availableSources.map(source => (
          <button
            key={source}
            onClick={() => setFilter(source)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
              filter === source
                ? sourceFilterColors[source]
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {source}
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {filteredTraits.map((trait) => (
          <div 
            key={trait.id}
            className="p-3 rounded-lg bg-muted/10 border border-border/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-foreground text-base">{trait.name}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded border uppercase font-medium", sourceColors[trait.source])}>
                {trait.source}
              </span>
            </div>
            <p className="text-base text-foreground/80 leading-relaxed">{trait.description}</p>
          </div>
        ))}

        {filteredTraits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No traits found</p>
        )}
      </div>
    </div>
  )
}

interface LanguagesPanelProps {
  languages: string[]
}

export function LanguagesPanel({ languages }: LanguagesPanelProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
        <Languages className="w-5 h-5" />
        Languages
      </h3>

      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <span 
            key={lang}
            className="px-4 py-2 text-base rounded-full bg-muted/30 border border-border text-foreground font-medium"
          >
            {lang}
          </span>
        ))}
      </div>
    </div>
  )
}

interface SkillsPanelProps {
  skills: Skill[]
  attributes: {
    might: number
    agility: number
    reason: number
    willpower: number
    presence: number
  }
}

const attrAbbrev: Record<string, string> = {
  might: "MIG",
  agility: "AGI",
  reason: "REA",
  willpower: "WIL",
  presence: "PRE"
}

export function SkillsPanel({ skills, attributes }: SkillsPanelProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5" />
        Skills
      </h3>

      <div className="space-y-2">
        {skills.map((skill) => {
          const modifier = getAttributeModifier(attributes[skill.attribute])
          const bonus = skill.hasExpertise ? modifier + 4 : modifier
          
          return (
            <div 
              key={skill.name}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                skill.hasExpertise 
                  ? "bg-amber-100 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/40" 
                  : "bg-muted/10 border-border/50"
              )}
            >
              <div className="flex items-center gap-2">
                {skill.hasExpertise && (
                  <Star className="w-4 h-4 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
                )}
                <span className="text-base text-foreground font-medium">{skill.name}</span>
                <span className="text-xs text-muted-foreground font-medium">({attrAbbrev[skill.attribute]})</span>
              </div>
              <span className={cn(
                "font-mono font-bold text-base",
                skill.hasExpertise ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              )}>
                {formatModifier(bonus)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface BondsPanelProps {
  bonds: Bond[]
  onUpdateBond?: (id: string, target: string) => void
}

const bondTypeColors: Record<string, string> = {
  admiration: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700/50",
  inferiority: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700/50",
  loyalty: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50",
  mistrust: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50",
  affection: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700/50",
  hatred: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50"
}

export function BondsPanel({ bonds }: BondsPanelProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5" />
        Bonds
      </h3>

      <div className="space-y-3">
        {bonds.map((bond) => (
          <div 
            key={bond.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/50"
          >
            <span className="text-base text-foreground font-medium">{bond.target}</span>
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full border uppercase font-semibold",
              bondTypeColors[bond.type]
            )}>
              {bond.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
