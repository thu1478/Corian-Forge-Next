"use client"

import { Check, Shield, X } from "lucide-react"
import { MARTIAL_PROFICIENCY_ROWS } from "@/lib/equipment-proficiency"

export function ProficienciesPanel({ proficiencies }: { proficiencies: ReadonlySet<string> }) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Proficiencies
      </h3>
      <p className="text-xs text-muted-foreground mb-3 leading-snug">
        From your classes (rules). Martial gear needs the matching proficiency or you take penalties per rules.
      </p>
      <ul className="space-y-2">
        {MARTIAL_PROFICIENCY_ROWS.map((row) => {
          const has = proficiencies.has(row.id)
          return (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm"
            >
              <span className="text-foreground/90 leading-tight min-w-0">{row.label}</span>
              {has ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Proficient" />
              ) : (
                <X className="w-4 h-4 shrink-0 text-muted-foreground/70" aria-label="Not proficient" />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
