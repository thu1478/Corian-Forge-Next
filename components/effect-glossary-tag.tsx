"use client"

import { useMemo } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { findEffectGlossaryEntry } from "@/logic/display/glossary-lookup"

/** Clickable tag chip with glossary definition (action cards, library equipment, etc.). */
export function EffectGlossaryTag({ tag, className }: { tag: string; className?: string }) {
    const entry = useMemo(() => findEffectGlossaryEntry(tag), [tag])
    const title = entry?.name ?? tag
    const body =
        entry?.description?.trim() ||
        "This tag is not defined in rules.glossary.effectDictionary yet."

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "text-xs px-2.5 py-1 rounded-full border font-medium uppercase tracking-wider",
                        "bg-muted/50 dark:bg-white/5 border-border dark:border-white/10 text-foreground/70",
                        "cursor-pointer transition-colors",
                        "hover:bg-muted hover:text-foreground hover:border-primary/40",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        className
                    )}
                >
                    {tag}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="top"
                sideOffset={6}
                className="w-[min(92vw,28rem)] max-w-none border-border p-4 text-left shadow-md"
            >
                <div className="space-y-2">
                    <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{body}</p>
                </div>
            </PopoverContent>
        </Popover>
    )
}
