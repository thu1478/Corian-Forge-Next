"use client"

import { GraduationCap } from "lucide-react"
import { getDeityPassiveEntries } from "@/logic/classes/priest-deities"

interface ClassesPanelProps {
    classes: { id: string; level: number }[]; // Character's specific data
    rules: Record<string, any>;               // The entire classes section of rules.json
    /** Priest: show level 3 deity passive summary when level ≥ 3. */
    priestDeity?: string | null
}

export function ClassesPanel({classes, rules, priestDeity = null}: ClassesPanelProps) {

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5"/>
                Classes
                {/*<span className="text-sm text-muted-foreground font-normal">(Level {totalLevel})</span>*/}
            </h3>

            <div className="space-y-3">
                {classes.map((cls, i) => {
                    const priestPassives =
                        cls.id === "priest" && cls.level >= 3 && priestDeity
                            ? getDeityPassiveEntries({ classes: rules } as { classes?: Record<string, unknown> }, priestDeity)
                            : []

                    return (
                        <div
                            key={i}
                            className="p-3 rounded-lg bg-muted/20 border border-border space-y-2"
                        >
                            <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground text-base">
                    {rules?.[cls.id]?.name}
                  </span>
                            <span className="text-base font-bold text-primary shrink-0">
                    Lv. {cls.level}
                  </span>
                            </div>
                            {priestPassives.length > 0 ? (
                                <div className="text-xs text-muted-foreground border-t border-border/60 pt-2 space-y-1">
                                    <span className="font-medium text-foreground/90">Deity passive</span>
                                    {priestPassives.map((p) => (
                                        <p key={p.slug} className="leading-snug">
                                            <span className="font-semibold text-foreground">{p.name}:</span>{" "}
                                            {p.description}
                                        </p>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}
