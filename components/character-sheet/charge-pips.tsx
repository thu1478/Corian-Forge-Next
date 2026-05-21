"use client"

import { cn } from "@/lib/utils"

export type ChargePipsProps = {
    maxCharges: number
    currentCharges: number
    onChange: (newCount: number) => void
    label?: string
    className?: string
}

export function ChargePips({
    maxCharges,
    currentCharges,
    onChange,
    label = "Charges",
    className,
}: ChargePipsProps) {
    if (maxCharges <= 0) return null

    const current = Math.min(Math.max(0, currentCharges), maxCharges)

    return (
        <div className={cn("flex items-center justify-between gap-2", className)}>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
            <div className="flex gap-1.5">
                {Array.from({ length: maxCharges }).map((_, i) => {
                    const isFilled = i < current
                    const isLastFilled = i === current - 1

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                const newVal = isLastFilled ? i : i + 1
                                onChange(newVal)
                            }}
                            className={cn(
                                "w-4 h-4 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                                isFilled
                                    ? "bg-amber-400 border-amber-600 shadow-sm"
                                    : "bg-muted/30 border-dashed border-muted-foreground/30 hover:border-amber-400/50"
                            )}
                        />
                    )
                })}
            </div>
        </div>
    )
}
