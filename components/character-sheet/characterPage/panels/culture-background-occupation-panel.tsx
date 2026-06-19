"use client"

import { Briefcase, Globe2, ScrollText } from "lucide-react"

type CultureBlock = Record<string, { name?: string; description?: string }>

interface CultureBackgroundOccupationPanelProps {
    theme: string
    cultureEnvironment: string | null
    cultureOrganization: string | null
    cultureUpbringing: string | null
    occupation: string | null
    /** `rules.system` — uses `culture` and `occupation`. */
    system: {
        culture?: {
            environment?: CultureBlock
            organization?: CultureBlock
            upbringing?: CultureBlock
        }
        occupation?: Record<string, { name?: string }>
    }
}

function cultureLabel(block: CultureBlock | undefined, id: string | null): string | null {
    if (!id || !block?.[id]) return null
    return block[id].name ?? id
}

export function CultureBackgroundOccupationPanel({
    theme,
    cultureEnvironment,
    cultureOrganization,
    cultureUpbringing,
    occupation,
    system,
}: CultureBackgroundOccupationPanelProps) {
    const culture = system.culture
    const envName = cultureLabel(culture?.environment, cultureEnvironment)
    const orgName = cultureLabel(culture?.organization, cultureOrganization)
    const upName = cultureLabel(culture?.upbringing, cultureUpbringing)
    const occName =
        occupation && system.occupation?.[occupation]
            ? system.occupation[occupation].name ?? occupation
            : null

    const row = (label: string, value: string | null) => (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 sm:w-28">
                {label}
            </span>
            <span className="text-sm text-foreground font-medium leading-snug">{value ?? "—"}</span>
        </div>
    )

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                <Globe2 className="w-5 h-5 shrink-0" aria-hidden />
                Culture & background
            </h3>
            <div className="space-y-5">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                        <Globe2 className="w-3.5 h-3.5" aria-hidden />
                        Culture
                    </div>
                    <div className="space-y-2 pl-0.5">
                        {row("Environment", envName)}
                        {row("Organization", orgName)}
                        {row("Upbringing", upName)}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                        <ScrollText className="w-3.5 h-3.5" aria-hidden />
                        Theme
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed pl-0.5">
                        {theme.trim() ? theme : "—"}
                    </p>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                        <Briefcase className="w-3.5 h-3.5" aria-hidden />
                        Occupation
                    </div>
                    <p className="text-sm text-foreground font-medium pl-0.5">{occName ?? "—"}</p>
                </div>
            </div>
        </div>
    )
}
