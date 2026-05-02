"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { X, GripHorizontal, Shield, Heart, Sparkles, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { resolveIncomingDamage, type DamageChannel } from "@/lib/damage-resolution"

interface DamageCalculatorProps {
  isOpen: boolean
  onClose: () => void
  defense: number
  hp: { current: number; max: number }
  barrier: number
  onApplyDamage: (newHp: number, newBarrier: number) => void
  damageTypes: string[]
  resistances: string[]
  vulnerabilities: Record<string, number>
}

export function DamageCalculator({
  isOpen,
  onClose,
  defense,
  hp,
  barrier,
  onApplyDamage,
  damageTypes,
  resistances,
  vulnerabilities,
}: DamageCalculatorProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [damageInput, setDamageInput] = useState("")
  const [penInput, setPenInput] = useState("")
  const [damageChannel, setDamageChannel] = useState<DamageChannel>("physical")
  const [damageType, setDamageType] = useState(() => damageTypes[0] ?? "crushing")
  const containerRef = useRef<HTMLDivElement>(null)

  const rawDamage = parseInt(damageInput, 10) || 0
  const rawPen = parseInt(penInput, 10) || 0

  const breakdown = useMemo(
    () =>
      resolveIncomingDamage({
        rawDamage,
        penetration: rawPen,
        defense,
        damageChannel,
        damageType,
        resistances,
        vulnerabilities,
      }),
    [rawDamage, rawPen, defense, damageChannel, damageType, resistances, vulnerabilities]
  )

  const finalDamage = breakdown.finalDamage
  const usesDefense = damageChannel === "physical"

  let previewBarrier = barrier
  let previewHp = hp.current
  let remainingDamage = finalDamage

  if (remainingDamage > 0) {
    if (previewBarrier >= remainingDamage) {
      previewBarrier -= remainingDamage
      remainingDamage = 0
    } else {
      remainingDamage -= previewBarrier
      previewBarrier = 0
    }
    previewHp -= remainingDamage
  }

  useEffect(() => {
    if (!damageTypes.length) return
    if (!damageTypes.includes(damageType)) {
      setDamageType(damageTypes[0])
    }
  }, [damageTypes, damageType])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleApplyDamage = () => {
    if (finalDamage <= 0) return

    let remaining = finalDamage
    let newBarrier = barrier
    let newHp = hp.current

    if (newBarrier > 0) {
      if (newBarrier >= remaining) {
        newBarrier -= remaining
        remaining = 0
      } else {
        remaining -= newBarrier
        newBarrier = 0
      }
    }

    newHp = newHp - remaining

    onApplyDamage(newHp, newBarrier)
    setDamageInput("")
    setPenInput("")
  }

  const handleClose = () => {
    setDamageInput("")
    setPenInput("")
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(90vh,520px)] overflow-y-auto bg-card border-2 border-border rounded-xl shadow-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "auto",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-t-xl border-b border-border cursor-grab active:cursor-grabbing shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold text-foreground text-base">Damage Calculator</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Physical / Magical</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDamageChannel("physical")}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                damageChannel === "physical"
                  ? "bg-red-100 border-red-400 text-red-700 dark:bg-red-950/50 dark:border-red-600 dark:text-red-300"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Swords className="w-4 h-4 shrink-0" />
              Physical
            </button>
            <button
              type="button"
              onClick={() => setDamageChannel("magical")}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                damageChannel === "magical"
                  ? "bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-950/50 dark:border-violet-600 dark:text-violet-300"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              Magical
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Channel sets defense &amp; penetration. Damage type (below) is for resistances and vulnerabilities only.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Damage type (resist / vuln)</label>
          <Select value={damageType} onValueChange={setDamageType}>
            <SelectTrigger className="h-11 w-full capitalize">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {damageTypes.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Incoming damage</label>
          <Input
            type="number"
            placeholder="Enter damage amount"
            value={damageInput}
            onChange={(e) => setDamageInput(e.target.value)}
            className="text-lg font-mono h-12"
          />
        </div>

        {usesDefense && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Penetration</label>
            <Input
              type="number"
              placeholder="Enter penetration amount"
              value={penInput}
              onChange={(e) => setPenInput(e.target.value)}
              className="text-lg font-mono h-12"
            />
          </div>
        )}

        <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Raw</span>
            <span className="font-mono font-bold text-foreground tabular-nums">{breakdown.rawDamage}</span>
          </div>
          {usesDefense && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Defense (after pen)</span>
              <span className="font-mono font-bold text-foreground tabular-nums">−{breakdown.relevantDefense}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-muted-foreground">After defense</span>
            <span className="font-mono font-bold text-foreground tabular-nums">{breakdown.afterDefense}</span>
          </div>
          {breakdown.conflict && (
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
              Resist and vulnerability both apply to this type — modifiers cancel (same as combat stats).
            </p>
          )}
          {!breakdown.conflict && breakdown.resistApplied && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resistance (½, round up)</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                → {breakdown.afterResist}
              </span>
            </div>
          )}
          {!breakdown.conflict && breakdown.vulnFlat > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vulnerability</span>
              <span className="font-mono font-bold text-red-700 dark:text-red-400 tabular-nums">
                +{breakdown.vulnFlat}
              </span>
            </div>
          )}
          <div className="border-t border-border pt-2 mt-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-base">Final damage</span>
              <span
                className={cn(
                  "font-mono font-bold text-xl tabular-nums",
                  finalDamage > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {finalDamage}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-cyan-100/50 dark:bg-cyan-950/30 rounded-lg border border-cyan-300 dark:border-cyan-700/50">
            <div className="flex items-center gap-2 mb-1 text-xs text-cyan-700 dark:text-cyan-300 uppercase tracking-wider font-semibold">
              <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Barrier
            </div>
            <div className="font-mono font-bold text-lg flex items-baseline gap-2">
              <span className="line-through text-xs opacity-50 text-cyan-900 dark:text-cyan-100">{barrier}</span>
              <span className="text-cyan-700 dark:text-cyan-300">{previewBarrier}</span>
            </div>
          </div>

          <div className="p-3 bg-red-100/50 dark:bg-red-950/30 rounded-lg border border-red-300 dark:border-red-700/50">
            <div className="flex items-center gap-2 mb-1 text-xs text-red-700 dark:text-red-300 uppercase tracking-wider font-semibold">
              <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
              HP
            </div>
            <div className="font-mono font-bold text-lg flex items-baseline gap-2">
              <span className="line-through text-xs opacity-50 text-red-900 dark:text-red-100">{hp.current}</span>
              <span
                className={cn(
                  previewHp < 0 ? "text-red-500 animate-pulse" : "text-red-700 dark:text-red-300"
                )}
              >
                {previewHp}
              </span>
              <span className="text-[10px] opacity-40">/ {hp.max}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleApplyDamage}
          disabled={finalDamage <= 0}
          className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
        >
          Apply {finalDamage} damage
        </Button>
        <p className="text-xs text-muted-foreground text-center">Barrier is depleted first, then HP</p>
      </div>
    </div>
  )
}
