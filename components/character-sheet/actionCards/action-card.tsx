"use client"

import { ActionCard as ActionCardType } from "@/lib/character-data"
import { cn } from "@/lib/utils"
import { Zap, Droplets, Target, Clock, Crosshair, Users, Swords, Sparkles, Shield, Wrench } from "lucide-react"

interface ActionCardProps {
  action: ActionCardType
  disabled?: boolean
  currentWeapon?: string
}

const typeConfig = {
  attack: {
    icon: Swords,
    bg: "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-950/50 dark:to-red-900/30",
    border: "border-red-300 dark:border-red-800/60",
    accent: "text-red-700 dark:text-red-400",
    badge: "bg-red-200 text-red-800 dark:bg-red-900/80 dark:text-red-200"
  },
  skill: {
    icon: Target,
    bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/50 dark:to-emerald-900/30",
    border: "border-emerald-300 dark:border-emerald-800/60",
    accent: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200"
  },
  spell: {
    icon: Sparkles,
    bg: "bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950/50 dark:to-violet-900/30",
    border: "border-violet-300 dark:border-violet-800/60",
    accent: "text-violet-700 dark:text-violet-400",
    badge: "bg-violet-200 text-violet-800 dark:bg-violet-900/80 dark:text-violet-200"
  },
  reaction: {
    icon: Shield,
    bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/50 dark:to-amber-900/30",
    border: "border-amber-300 dark:border-amber-800/60",
    accent: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-200 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200"
  },
  utility: {
    icon: Wrench,
    bg: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/50 dark:to-sky-900/30",
    border: "border-sky-300 dark:border-sky-800/60",
    accent: "text-sky-700 dark:text-sky-400",
    badge: "bg-sky-200 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200"
  }
}

export function ActionCardComponent({ 
  action, 
  disabled = false,
  currentWeapon
}: ActionCardProps) {
  const config = typeConfig[action.type]
  const TypeIcon = config.icon
  const isWeaponAction = action.tags.includes("Weapon")

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 p-5 transition-all duration-200",
        config.bg,
        config.border,
        disabled ? "opacity-50 grayscale" : "hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30 cursor-pointer"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.badge)}>
            <TypeIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight text-lg">{action.name}</h3>
            <span className={cn("text-sm uppercase tracking-wider font-medium", config.accent)}>
              {action.type}
            </span>
          </div>
        </div>
      </div>

      {/* Active Weapon Display for weapon-based attacks */}
      {isWeaponAction && currentWeapon && (
        <div className="mb-4 px-3 py-2 bg-muted/30 rounded-lg border border-border flex items-center gap-2">
          <Swords className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Using:</span>
          <span className="text-sm font-medium text-foreground">{currentWeapon}</span>
        </div>
      )}

      {/* Cost Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* AP Cost */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-base font-bold text-primary">{action.apCost} AP</span>
        </div>

        {/* MP Cost */}
        {action.mpCost !== undefined && action.mpCost > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40">
            <Droplets className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span className="text-base font-bold text-blue-700 dark:text-blue-400">{action.mpCost} MP</span>
          </div>
        )}

        {/* Focus Cost */}
        {action.focusCost !== undefined && action.focusCost > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40">
            <Target className="w-4 h-4 text-orange-700 dark:text-orange-400" />
            <span className="text-base font-bold text-orange-700 dark:text-orange-400">{action.focusCost} Focus</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4 text-sm text-foreground/70">
        {action.range && (
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-4 h-4" />
            <span>{action.range}</span>
          </div>
        )}
        {action.target && (
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{action.target}</span>
          </div>
        )}
        {action.duration && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{action.duration}</span>
          </div>
        )}
      </div>

      {/* Damage */}
      {action.damage && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 dark:bg-black/30 border border-border dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70 uppercase tracking-wider font-medium">Damage</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-foreground text-lg">{action.damage}</span>
              {action.damageType && (
                <span className={cn("text-sm px-2 py-1 rounded font-medium", config.badge)}>
                  {action.damageType}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Effect Description */}
      <p className="text-base text-foreground/80 leading-relaxed mb-4">
        {action.effect}
      </p>

      {/* Requirements */}
      {action.requirements && (
        <p className="text-sm text-amber-700 dark:text-amber-400 font-medium italic mb-3">
          Requires: {action.requirements}
        </p>
      )}

      {/* Cooldown */}
      {action.cooldown && (
        <p className="text-sm text-foreground/70 mb-3">
          Cooldown: {action.cooldown}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border dark:border-white/10">
        {action.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2.5 py-1 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-foreground/70 uppercase tracking-wider font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
