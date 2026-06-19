"use client"

import { cn } from "@/lib/utils"

export type ChargePipsProps = {
    maxCharges: number
    currentCharges: number
    onChange?: (newCount: number) => void
    label?: string
    className?: string
    readOnly?: boolean
    showLabel?: boolean
}

export function ChargePips({
    maxCharges,
    currentCharges,
    onChange,
    label = "Charges",
    className,
    readOnly = false,
    showLabel = true,
}: ChargePipsProps) {
    if (maxCharges <= 0) return null

    const current = Math.min(Math.max(0, currentCharges), maxCharges)

    const pipClass = (isFilled: boolean) =>
        cn(
            "w-4 h-4 rounded-full border-2",
            isFilled
                ? "bg-amber-400 border-amber-600 shadow-sm"
                : "bg-muted/30 border-dashed border-muted-foreground/30",
            !readOnly && !isFilled && "hover:border-amber-400/50",
            !readOnly && "transition-all hover:scale-110 active:scale-95",
        )

    return (
        <div className={cn("flex items-center gap-2", showLabel ? "justify-between" : "", className)}>
            {showLabel ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {label}
                </span>
            ) : null}
            <div className="flex gap-1.5">
                {Array.from({ length: maxCharges }).map((_, i) => {
                    const isFilled = i < current
                    const isLastFilled = i === current - 1

                    if (readOnly) {
                        return <span key={i} className={pipClass(isFilled)} aria-hidden />
                    }

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                const newVal = isLastFilled ? i : i + 1
                                onChange?.(newVal)
                            }}
                            className={pipClass(isFilled)}
                        />
                    )
                })}
            </div>
        </div>
    )
}
