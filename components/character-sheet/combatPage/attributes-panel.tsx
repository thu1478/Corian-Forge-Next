"use client"

import { getAttributeModifier, formatModifier } from "@/lib/character-data"
import { cn } from "@/lib/utils"

interface AttributesPanelProps {
  attributes: {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
  }
  highlighted?: Partial<Record<keyof AttributesPanelProps["attributes"], boolean>>
}

const attributeConfig = {
  might: { label: "Might", abbr: "MIG", color: "text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-800/60 dark:bg-red-950/30" },
  dexterity: { label: "Dexterity", abbr: "DEX", color: "text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800/60 dark:bg-emerald-950/30" },
  reason: { label: "Reason", abbr: "REA", color: "text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800/60 dark:bg-blue-950/30" },
  willpower: { label: "Willpower", abbr: "WIP", color: "text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800/60 dark:bg-amber-950/30" },
  presence: { label: "Presence", abbr: "PRE", color: "text-pink-700 border-pink-300 bg-pink-50 dark:text-pink-400 dark:border-pink-800/60 dark:bg-pink-950/30" }
}

export function AttributesPanel({ attributes, highlighted = {} }: AttributesPanelProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4">Attributes</h3>
      
      <div className="grid grid-cols-5 gap-2">
        {(Object.keys(attributeConfig) as Array<keyof typeof attributeConfig>).map((key) => {
          const config = attributeConfig[key]
          const value = attributes[key]
          const modifier = getAttributeModifier(value)
          const isHighlighted = highlighted[key] === true
          
          return (
            <div
              key={key}
              className={cn(
                "text-center p-2.5 rounded-lg border",
                config.color
              )}
              title={isHighlighted ? "Changed by active mount or Anima form" : undefined}
            >
              <div className="text-xs uppercase tracking-wider font-bold mb-1">
                {config.abbr}
              </div>
              <div className={cn("text-xl font-bold", isHighlighted ? "text-violet-700 dark:text-violet-300" : "text-foreground")}>{value}</div>
              <div className={cn("text-sm font-mono opacity-80", isHighlighted ? "text-violet-700 dark:text-violet-300" : "")}>
                {formatModifier(modifier)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
