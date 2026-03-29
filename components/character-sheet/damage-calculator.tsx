"use client"

import {useState, useRef, useEffect} from "react"
import {cn} from "@/lib/utils"
import {X, GripHorizontal, Shield, Sparkles, Swords, Heart} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"

interface DamageCalculatorProps {
    isOpen: boolean
    onClose: () => void
    defense: number
    hp: { current: number; max: number }
    barrier: { current: number; max: number }
    onApplyDamage: (newHp: number, newBarrier: number) => void
}

export function DamageCalculator({
                                     isOpen,
                                     onClose,
                                     defense,
                                     hp,
                                     barrier,
                                     onApplyDamage
                                 }: DamageCalculatorProps) {
    const [position, setPosition] = useState({x: 100, y: 100})
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({x: 0, y: 0})
    const [damageInput, setDamageInput] = useState("")
    const [damageType, setDamageType] = useState<"physical" | "magical">("physical")
    const containerRef = useRef<HTMLDivElement>(null)

    const rawDamage = parseInt(damageInput) || 0
    const relevantDefense = damageType === "physical" ? defense : 0
    const finalDamage = damageType === "physical" ? Math.max(1, rawDamage - relevantDefense) : rawDamage

    // Calculate what the values WOULD be
    let previewBarrier = barrier.current
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
        // Note: No Math.max(0) here yet so we can see negative HP for the "DEAD" threshold
        previewHp -= remainingDamage
    }

    // Handle mouse down on drag handle
    const handleMouseDown = (e: React.MouseEvent) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            })
            setIsDragging(true)
        }
    }

    // Handle mouse move while dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y
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

        let remainingDamage = finalDamage
        let newBarrier = barrier.current
        let newHp = hp.current

        // Barrier absorbs damage first
        if (newBarrier > 0) {
            if (newBarrier >= remainingDamage) {
                newBarrier -= remainingDamage
                remainingDamage = 0
            } else {
                remainingDamage -= newBarrier
                newBarrier = 0
            }
        }

        // Remaining damage goes to HP
        newHp = newHp - remainingDamage

        onApplyDamage(newHp, newBarrier)
        setDamageInput("")
    }

    if (!isOpen) return null

    return (
        <div
            ref={containerRef}
            className="fixed z-50 w-80 bg-card border-2 border-border rounded-xl shadow-2xl"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? "grabbing" : "auto"
            }}
        >
            {/* Drag Handle */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-t-xl border-b border-border cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4 text-muted-foreground"/>
                    <h3 className="font-bold text-foreground text-base">Damage Calculator</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={onClose}
                >
                    <X className="w-4 h-4"/>
                </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Damage Type Toggle */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Damage Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setDamageType("physical")}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-base font-medium",
                                damageType === "physical"
                                    ? "bg-red-100 border-red-400 text-red-700 dark:bg-red-950/50 dark:border-red-600 dark:text-red-300"
                                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <Swords className="w-5 h-5"/>
                            Physical
                        </button>
                        <button
                            onClick={() => setDamageType("magical")}
                            className={cn(
                                "flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all text-base font-medium",
                                damageType === "magical"
                                    ? "bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-950/50 dark:border-violet-600 dark:text-violet-300"
                                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <Sparkles className="w-5 h-5"/>
                            Magical
                        </button>
                    </div>
                </div>

                {/* Damage Input */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Incoming Damage</label>
                    <Input
                        type="number"
                        placeholder="Enter damage amount"
                        value={damageInput}
                        onChange={(e) => setDamageInput(e.target.value)}
                        className="text-lg font-mono h-12"
                    />
                </div>

                {/* Calculation Display */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Raw Damage:</span>
                        <span className="font-mono font-bold text-foreground text-base">{rawDamage}</span>
                    </div>
                    {damageType === "physical" && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Defense:</span>
                            <span className="font-mono font-bold text-foreground text-base">
      -{relevantDefense}
    </span>
                        </div>
                    )}
                    <div className="border-t border-border pt-3">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground text-base">Final Damage:</span>
                            <span className={cn(
                                "font-mono font-bold text-xl",
                                finalDamage > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                {finalDamage}
              </span>
                        </div>
                    </div>
                </div>

                {/* Current Resources */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Barrier Box */}
                    <div className="p-3 bg-cyan-100/50 dark:bg-cyan-950/30 rounded-lg border border-cyan-300 dark:border-cyan-700/50">
                        <div className="flex items-center gap-2 mb-1 text-xs text-cyan-700 dark:text-cyan-300 uppercase tracking-wider font-semibold">
                            <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400"/>
                            Barrier
                        </div>
                        <div className="font-mono font-bold text-lg flex items-baseline gap-2">
            <span className="line-through text-xs opacity-50 text-cyan-900 dark:text-cyan-100">
                {barrier.current}
            </span>
                            <span className="text-cyan-700 dark:text-cyan-300">
                {previewBarrier}
            </span>
                            <span className="text-[10px] opacity-40">/ {barrier.max}</span>
                        </div>
                    </div>

                    {/* HP Box */}
                    <div className="p-3 bg-red-100/50 dark:bg-red-950/30 rounded-lg border border-red-300 dark:border-red-700/50">
                        <div className="flex items-center gap-2 mb-1 text-xs text-red-700 dark:text-red-300 uppercase tracking-wider font-semibold">
                            <Heart className="w-4 h-4 text-red-600 dark:text-red-400"/>
                            HP
                        </div>
                        <div className="font-mono font-bold text-lg flex items-baseline gap-2">
            <span className="line-through text-xs opacity-50 text-red-900 dark:text-red-100">
                {hp.current}
            </span>
                            <span className={cn(
                                previewHp < 0 ? "text-red-500 animate-pulse" : "text-red-700 dark:text-red-300"
                            )}>
                {previewHp}
            </span>
                            <span className="text-[10px] opacity-40">/ {hp.max}</span>
                        </div>
                    </div>
                </div>

                {/* Apply Button */}
                <Button
                    onClick={handleApplyDamage}
                    disabled={finalDamage <= 0}
                    className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
                >
                    Apply {finalDamage} Damage
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    Barrier is depleted first, then HP
                </p>
            </div>
        </div>
    )
}
