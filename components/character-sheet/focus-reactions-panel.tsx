"use client"

import { FocusFeature, Reaction } from "@/lib/character-data"
import { cn } from "@/lib/utils"
import { Target, Zap, Lock, Unlock } from "lucide-react"

interface FocusReactionsPanelProps {
  focusFeatures: FocusFeature[]
  reactions: Reaction[]
  onToggleFocusFeature?: (id: string) => void
  onToggleReaction?: (id: string) => void
}

export function FocusReactionsPanel({ 
  focusFeatures, 
  reactions,
  onToggleFocusFeature,
  onToggleReaction 
}: FocusReactionsPanelProps) {
  const equippedFeatures = focusFeatures.filter(f => f.equipped)
  const equippedReactions = reactions.filter(r => r.equipped)

  return (
    <div className="space-y-4">
      {/* Focus Features */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Focus Features
          <span className="text-sm text-muted-foreground font-normal">({equippedFeatures.length}/3)</span>
        </h3>

        <div className="space-y-3">
          {focusFeatures.map((feature) => (
            <div
              key={feature.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                feature.equipped
                  ? "bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/50"
                  : "bg-muted/10 border-border/50 opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-foreground text-base">{feature.name}</span>
                    {feature.isDefault && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-base text-foreground/80 leading-relaxed">{feature.description}</p>
                </div>
                {!feature.isDefault && onToggleFocusFeature && (
                  <button
                    onClick={() => onToggleFocusFeature(feature.id)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      feature.equipped
                        ? "bg-orange-200 dark:bg-orange-600/30 text-orange-700 dark:text-orange-400 hover:bg-orange-300 dark:hover:bg-orange-600/50"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {feature.equipped ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reactions */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Reactions
          <span className="text-sm text-muted-foreground font-normal">({equippedReactions.length}/3)</span>
        </h3>

        <div className="space-y-3">
          {reactions.map((reaction) => (
            <div
              key={reaction.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                reaction.equipped
                  ? "bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50"
                  : "bg-muted/10 border-border/50 opacity-50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-foreground text-base">{reaction.name}</span>
                    {reaction.isDefault && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700/40">
                    Trigger: {reaction.trigger}
                  </p>
                  <p className="text-base text-foreground/80 leading-relaxed">{reaction.effect}</p>
                </div>
                {!reaction.isDefault && onToggleReaction && (
                  <button
                    onClick={() => onToggleReaction(reaction.id)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      reaction.equipped
                        ? "bg-amber-200 dark:bg-amber-600/30 text-amber-700 dark:text-amber-400 hover:bg-amber-300 dark:hover:bg-amber-600/50"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {reaction.equipped ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
