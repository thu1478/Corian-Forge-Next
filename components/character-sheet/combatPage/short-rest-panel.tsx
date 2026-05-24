"use client"

import { useEffect, useRef, useState } from "react"
import { Droplets, GripHorizontal, Heart, Leaf, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ShortRestPanelProps {
    isOpen: boolean
    onClose: () => void
    maxHP: number
    maxMP: number
    hp: number
    mp: number
    respiteAvailable: number
    maxRespite: number
    deathThreshold: number
    onApply: (respitesSpent: number) => void
}

export function ShortRestPanel({
    isOpen,
    onClose,
    maxHP,
    maxMP,
    hp,
    mp,
    respiteAvailable,
    maxRespite,
    deathThreshold,
    onApply,
}: ShortRestPanelProps) {
    const [position, setPosition] = useState({ x: 120, y: 120 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [spentInput, setSpentInput] = useState("0")
    const containerRef = useRef<HTMLDivElement>(null)

    const hpPer = Math.floor(maxHP / 3)
    const mpPer = Math.floor(maxMP / 2)

    const spent = Math.min(
        Math.max(0, Math.floor(parseInt(spentInput, 10) || 0)),
        respiteAvailable
    )

    const previewHp = Math.min(Math.max(hp + spent * hpPer, deathThreshold), maxHP)
    const previewMp = Math.min(Math.max(mp + spent * mpPer, 0), maxMP)

    useEffect(() => {
        if (isOpen) setSpentInput("0")
    }, [isOpen])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y,
                })
            }
        }
        const handleMouseUp = () => setIsDragging(false)
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging, dragOffset])

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

    const handleClose = () => {
        setSpentInput("0")
        onClose()
    }

    const handleApply = () => {
        onApply(spent)
        setSpentInput("0")
        onClose()
    }

    if (!isOpen) return null

    return (
        <div
            ref={containerRef}
            className="fixed z-50 w-[22rem] bg-card border-2 border-border rounded-xl shadow-2xl"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? "grabbing" : "auto",
            }}
        >
            <div
                className="flex items-center justify-between px-4 py-3 bg-emerald-950/20 rounded-t-xl border-b border-border cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-bold text-foreground text-base">Short rest</h3>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Focus and barrier reset to 0; combat stat adjustments reset. Spend respites to recover{" "}
                    <span className="font-semibold text-foreground">1/3 max HP</span> and{" "}
                    <span className="font-semibold text-foreground">1/2 max MP</span> each (round down).
                </p>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Per respite</span>
                        <span className="font-mono font-semibold text-foreground">
                            +{hpPer} HP, +{mpPer} MP
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                            Available respites
                        </span>
                        <span className="font-mono font-bold">
                            {respiteAvailable} / {maxRespite}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Respites to spend</label>
                    <Input
                        type="number"
                        min={0}
                        max={respiteAvailable}
                        value={spentInput}
                        onChange={(e) => setSpentInput(e.target.value)}
                        className="text-lg font-mono h-11"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-100/50 dark:bg-red-950/30 rounded-lg border border-red-300/60 dark:border-red-800/50">
                        <div className="flex items-center gap-2 mb-1 text-[10px] text-red-800 dark:text-red-300 uppercase tracking-wider font-bold">
                            <Heart className="w-4 h-4" />
                            HP
                        </div>
                        <div className="font-mono font-bold text-lg flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="line-through text-xs opacity-50">{hp}</span>
                            <span className="text-red-700 dark:text-red-300">{previewHp}</span>
                            <span className="text-[10px] opacity-50">/ {maxHP}</span>
                        </div>
                    </div>
                    <div className="p-3 bg-blue-100/50 dark:bg-blue-950/30 rounded-lg border border-blue-300/60 dark:border-blue-800/50">
                        <div className="flex items-center gap-2 mb-1 text-[10px] text-blue-800 dark:text-blue-300 uppercase tracking-wider font-bold">
                            <Droplets className="w-4 h-4" />
                            MP
                        </div>
                        <div className="font-mono font-bold text-lg flex flex-wrap items-baseline gap-x-2 gap-y-0">
                            <span className="line-through text-xs opacity-50">{mp}</span>
                            <span className="text-blue-700 dark:text-blue-300">{previewMp}</span>
                            <span className="text-[10px] opacity-50">/ {maxMP}</span>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleApply}
                    className="w-full h-11 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                    Apply short rest
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                    HP will not go below your death threshold ({deathThreshold}).
                </p>
            </div>
        </div>
    )
}
