"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Heart, Shield, Droplets, Target, Swords, Footprints, ShieldCheck, Gem, Minus, Plus, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ResourceBarProps {
  label: string
  current: number
  max: number
  color: string
  icon: React.ReactNode
  onUpdate?: (current: number, max: number) => void
}

function ResourceBar({ label, current, max, color, icon, onUpdate }: ResourceBarProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editCurrent, setEditCurrent] = useState(current.toString())
  const [editMax, setEditMax] = useState(max.toString())
  const percentage = Math.min((current / max) * 100, 100)

  const handleSave = () => {
    const newCurrent = Math.max(0, parseInt(editCurrent) || 0)
    const newMax = Math.max(1, parseInt(editMax) || 1)
    onUpdate?.(Math.min(newCurrent, newMax), newMax)
    setIsEditing(false)
  }

  const handleIncrement = () => {
    if (current < max) onUpdate?.(current + 1, max)
  }

  const handleDecrement = () => {
    if (current > 0) onUpdate?.(current - 1, max)
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="uppercase tracking-wider font-semibold">{label}</span>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={editCurrent}
              onChange={(e) => setEditCurrent(e.target.value)}
              className="w-14 h-7 text-sm text-center p-1"
              autoFocus
            />
            <span className="text-muted-foreground">/</span>
            <Input
              type="number"
              value={editMax}
              onChange={(e) => setEditMax(e.target.value)}
              className="w-14 h-7 text-sm text-center p-1"
            />
            <Button size="sm" variant="ghost" className="h-7 px-2 text-sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0 hover:bg-destructive/20"
              onClick={handleDecrement}
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <button
              onClick={() => {
                setEditCurrent(current.toString())
                setEditMax(max.toString())
                setIsEditing(true)
              }}
              className="font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-base min-w-[4rem] text-center"
            >
              {current}/{max}
            </button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0 hover:bg-primary/20"
              onClick={handleIncrement}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="h-4 bg-muted/50 rounded-full overflow-hidden border border-border">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface ResourceBarsProps {
  hp: { current: number; max: number }
  barrier: { current: number; max: number }
  mp: { current: number; max: number }
  focus: { current: number; max: number }
  ip: number
  onHpChange?: (current: number, max: number) => void
  onBarrierChange?: (current: number, max: number) => void
  onMpChange?: (current: number, max: number) => void
  onFocusChange?: (current: number, max: number) => void
  onIpChange?: (value: number) => void
  onOpenDamageCalculator?: () => void
}

export function ResourceBars({ hp, barrier, mp, focus, ip, onHpChange, onBarrierChange, onMpChange, onFocusChange, onIpChange, onOpenDamageCalculator }: ResourceBarsProps) {
  const [isEditingIp, setIsEditingIp] = useState(false)
  const [editIp, setEditIp] = useState(ip.toString())

  const handleIpSave = () => {
    const newIp = Math.max(0, parseInt(editIp) || 0)
    onIpChange?.(newIp)
    setIsEditingIp(false)
  }

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold uppercase tracking-wider text-primary">Resources</h3>
        {onOpenDamageCalculator && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDamageCalculator}
            className="gap-2 h-8"
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Damage</span>
          </Button>
        )}
      </div>
      
      <ResourceBar
        label="HP"
        current={hp.current}
        max={hp.max}
        color="bg-gradient-to-r from-red-600 to-red-500"
        icon={<Heart className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
        onUpdate={onHpChange}
      />
      
      <ResourceBar
        label="Barrier"
        current={barrier.current}
        max={barrier.max}
        color="bg-gradient-to-r from-cyan-600 to-cyan-400"
        icon={<Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
        onUpdate={onBarrierChange}
      />
      
      <ResourceBar
        label="MP"
        current={mp.current}
        max={mp.max}
        color="bg-gradient-to-r from-blue-600 to-blue-400"
        icon={<Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
        onUpdate={onMpChange}
      />
      
      <ResourceBar
        label="Focus"
        current={focus.current}
        max={focus.max}
        color="bg-gradient-to-r from-orange-600 to-amber-400"
        icon={<Target className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />}
        onUpdate={onFocusChange}
      />

      {/* IP as a simple value resource */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Gem className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span className="uppercase tracking-wider font-medium">IP</span>
          </div>
          {isEditingIp ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={editIp}
                onChange={(e) => setEditIp(e.target.value)}
                className="w-16 h-6 text-xs text-center p-1"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleIpSave}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-5 w-5 p-0 hover:bg-destructive/20"
                onClick={() => onIpChange?.(Math.max(0, ip - 1))}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <button
                onClick={() => {
                  setEditIp(ip.toString())
                  setIsEditingIp(true)
                }}
                className="font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer min-w-[2rem] text-center"
              >
                {ip}
              </button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-5 w-5 p-0 hover:bg-primary/20"
                onClick={() => onIpChange?.(ip + 1)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="h-3 bg-violet-500/30 rounded-full overflow-hidden border border-violet-500/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
            style={{ width: `${Math.min(ip * 10, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface CombatStatsPanelProps {
  defense: number
  stability: number
  speed: number
  resistances: string[]
  vulnerabilities: string[]
}

export function CombatStatsPanel({ defense, stability, speed, resistances, vulnerabilities }: CombatStatsPanelProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4">Combat Stats</h3>
      
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex justify-center mb-2">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{defense}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Defense</div>
        </div>
        
        <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stability}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Stability</div>
        </div>
        
        <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex justify-center mb-2">
            <Footprints className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{speed}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Speed</div>
        </div>
      </div>

      {/* Resistances & Vulnerabilities */}
      <div className="space-y-3">
        {resistances.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">Resist:</span>
            {resistances.map((r) => (
              <span key={r} className="text-xs px-2 py-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700/50 dark:text-emerald-300 font-medium">
                {r}
              </span>
            ))}
          </div>
        )}
        {vulnerabilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-red-700 dark:text-red-400 uppercase tracking-wider font-semibold">Vuln:</span>
            {vulnerabilities.map((v) => (
              <span key={v} className="text-xs px-2 py-1 rounded bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/40 dark:border-red-700/50 dark:text-red-300 font-medium">
                {v}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface OtherStatsProps {
  xp: number
  inspiration: number
  victories: number
}

export function OtherStats({ xp, inspiration, victories }: OtherStatsProps) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4">Progress</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">XP</span>
          <span className="font-mono font-bold text-foreground text-base">{xp.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Inspiration</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-5 h-5 rounded-full border-2",
                  i < inspiration
                    ? "bg-amber-400 border-amber-300"
                    : "bg-muted/30 border-border"
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Victories</span>
          <span className="font-mono font-bold text-foreground text-base">{victories}</span>
        </div>
      </div>
    </div>
  )
}
