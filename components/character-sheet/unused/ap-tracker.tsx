"use client"

import { Zap, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface APTrackerProps {
  current: number
  max: number
  onSpend: (amount: number) => void
  onReset: () => void
}

export function APTracker({ current, max, onSpend, onReset }: APTrackerProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Action Points
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* AP Pips */}
      <div className="flex items-center justify-center gap-3 mb-3">
        {Array.from({ length: max }).map((_, i) => {
          const isAvailable = i < current
          return (
            <button
              key={i}
              onClick={() => isAvailable && onSpend(1)}
              disabled={!isAvailable}
              className={cn(
                "relative w-14 h-14 rounded-xl border-2 transition-all duration-200",
                isAvailable
                  ? "bg-gradient-to-br from-primary/30 to-primary/10 border-primary shadow-lg shadow-primary/20 hover:scale-110 cursor-pointer"
                  : "bg-muted/20 border-muted/40 cursor-not-allowed"
              )}
            >
              <Zap
                className={cn(
                  "w-7 h-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all",
                  isAvailable ? "text-primary" : "text-muted/50"
                )}
              />
              {isAvailable && (
                <div className="absolute inset-0 rounded-xl bg-primary/10 animate-pulse" />
              )}
            </button>
          )
        })}
      </div>

      {/* AP Count */}
      <div className="text-center">
        <span className="text-3xl font-bold text-primary">{current}</span>
        <span className="text-lg text-muted-foreground"> / {max}</span>
        <p className="text-xs text-muted-foreground mt-1">Click to spend AP</p>
      </div>
    </div>
  )
}
