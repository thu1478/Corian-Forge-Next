"use client"

import { Crosshair, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FocusTrackerProps {
  current: number
  onChange: (value: number) => void
}

export function FocusTracker({ current, onChange }: FocusTrackerProps) {
  const handleIncrement = () => {
    onChange(current + 1)
  }

  const handleDecrement = () => {
    onChange(Math.max(0, current - 1))
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
        <Crosshair className="w-4 h-4" />
        Focus
      </h2>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={current === 0}
          className="h-12 w-12 rounded-xl border-2 border-orange-400/50 dark:border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/30 hover:text-orange-700 dark:hover:text-orange-300 disabled:opacity-30"
        >
          <Minus className="w-6 h-6" />
        </Button>

        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Decorative ring */}
          <div className="absolute inset-0 rounded-full border-4 border-orange-400/30 dark:border-orange-500/30" />
          <div className="absolute inset-2 rounded-full border-2 border-orange-400/50 dark:border-orange-500/50 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/50 dark:to-orange-900/20" />
          
          {/* Value */}
          <span className="text-4xl font-bold text-orange-600 dark:text-orange-400 relative z-10">{current}</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          className="h-12 w-12 rounded-xl border-2 border-orange-400/50 dark:border-orange-500/50 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/30 hover:text-orange-700 dark:hover:text-orange-300"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-3">
        Spend Focus to power abilities
      </p>
    </div>
  )
}
