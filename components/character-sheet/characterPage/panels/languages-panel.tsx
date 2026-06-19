"use client"

import { Languages } from "lucide-react"

interface LanguagesPanelProps {
    languages: string[]
}

export function LanguagesPanel({languages}: LanguagesPanelProps) {
    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Languages className="w-5 h-5"/>
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
