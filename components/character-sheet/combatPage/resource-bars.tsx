"use client"

import {useState} from "react"
import {cn} from "@/lib/utils"
import {Calculator, Droplets, Footprints, Heart, Minus, Plus, Shield, ShieldCheck, Swords} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"

interface ResourceBarProps {
    label: string
    current: number
    max: number
    min: number
    color: string
    icon: React.ReactNode
    onUpdate?: (current: number, max: number) => void
    barrier?: number;
}

function ResourceBar({label, current, max, min = 0, color, icon, onUpdate, barrier = 0}: ResourceBarProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editCurrent, setEditCurrent] = useState(current.toString())
    const [editMax, setEditMax] = useState(max.toString())

    // UI: The bar shouldn't show "negative" width. 0 HP is 0%.
    const percentage = Math.max(0, Math.min((current / max) * 100, 100))

    const showBarrier = label === "HP" && barrier > 0;
    const barrierPercentage = showBarrier ? Math.max(0, Math.min((barrier / max) * 100, 100)) : 0;

    // Only HP triggers the "DEAD" overlay at the threshold
    const isDead = label === "HP" && current <= min;

    const handleSave = () => {
        const parsedCurrent = parseInt(editCurrent) || 0
        const parsedMax = Math.max(1, parseInt(editMax) || 1)

        // For HP, we no longer clamp the bottom. For others, we still clamp at 0.
        const floor = label === "HP" ? -999999 : 0;
        const finalCurrent = Math.min(Math.max(parsedCurrent, floor), parsedMax)

        onUpdate?.(finalCurrent, parsedMax)
        setIsEditing(false)
    }

    const handleIncrement = () => {
        if (current < max) onUpdate?.(current + 1, max)
    }

    const handleDecrement = () => {
        // Only MP/Barrier/Focus are blocked at 0. HP can go forever.
        if (label === "HP" || current > 0) {
            onUpdate?.(current - 1, max)
        }
    }

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm h-8">
                <div className="flex items-center gap-2 text-muted-foreground overflow-hidden">
                    {icon}
                    <span className="uppercase tracking-wider font-semibold truncate">{label}</span>
                </div>
                {isEditing ? (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                        {/* Editable Current Value */}
                        <Input
                            type="number"
                            value={editCurrent}
                            onChange={(e) => setEditCurrent(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSave();
                                if (e.key === "Escape") setIsEditing(false);
                            }}
                            className="w-14 h-7 text-sm text-center p-1 font-mono font-bold"
                            autoFocus
                        />

                        {/* Read-only Max Value */}
                        <span className="text-muted-foreground font-mono font-bold px-1">
            / {max}
        </span>

                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 font-bold"
                            onClick={handleSave}
                        >
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
                            <Minus className="w-3.5 h-3.5"/>
                        </Button>
                        <button
                            onClick={() => {
                                setEditCurrent(current.toString())
                                setEditMax(max.toString())
                                setIsEditing(true)
                            }}
                            className="font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-base min-w-[5rem] text-center"
                        >
                            {current}/{max}
                        </button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-primary/20"
                            onClick={handleIncrement}
                        >
                            <Plus className="w-3.5 h-3.5"/>
                        </Button>
                    </div>
                )}
            </div>
            {/* Resource percentage fill*/}
            <div className="relative h-4 bg-muted/50 rounded-full border border-border">
                <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-300", color)}
                        style={{width: `${percentage}%`}}
                    />
                </div>
                {/* 2. GLASS BARRIER OVERLAYS */}
                {showBarrier && (
                    <div
                        className="absolute inset-[-3px] z-20 transition-all duration-500 pointer-events-none border-[3px] border-cyan-500 rounded-full"
                        style={{
                            width: barrier >= max ? "calc(100% + 6px)" : `calc(${barrierPercentage}% + 20px)`,
                            clipPath: barrier >= max ? 'none' : 'inset(-10px 20px -10px -10px)'
                        }}
                    />
                )}
                {/* If the char is dead then HP should display dead */}
                {isDead && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.3em] transition-colors",
                            "text-foreground/90 dark:text-foreground/90", // Matches the number text color
                            "drop-shadow-[0_1px_1px_rgba(var(--background),0.5)]" // Subtle shadow for legibility
                        )}>
                            DEAD
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

interface ResourceBarsProps {
    hp: { current: number; max: number, min: number }
    barrier: number
    mp: { current: number; max: number }
    ip: { current: number; max: number }
    onHpChange?: (current: number, max: number) => void
    onBarrierChange?: (current: number) => void
    onMpChange?: (current: number, max: number) => void
    onIpChange?: (value: number) => void
    onOpenDamageCalculator?: () => void
    attributes: Record<string, number>
    knownClasses: any[]
}

export function ResourceBars({
                                 hp,
                                 barrier,
                                 mp,
                                 ip,
                                 onHpChange,
                                 onBarrierChange,
                                 onMpChange,
                                 onIpChange,
                                 onOpenDamageCalculator,
                             }: ResourceBarsProps) {

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
                        <Calculator className="h-4 w-4"/>
                        <span className="hidden sm:inline">Damage</span>
                    </Button>
                )}
            </div>

            <ResourceBar
                label="HP"
                current={hp.current}
                max={hp.max}
                min={hp.min}
                color="bg-gradient-to-r from-red-600 to-red-500"
                icon={<Heart className="w-3.5 h-3.5 text-red-600 dark:text-red-400"/>}
                onUpdate={onHpChange}
                barrier={barrier}
            />

            <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm h-8">
                    {/* Matches ResourceBar Label Style */}
                    <div className="flex items-center gap-2 text-muted-foreground overflow-hidden">
                        <Shield className="w-3.5 h-3.5 text-cyan-500"/>
                        <span className="uppercase tracking-wider font-semibold truncate">Barrier</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-destructive/20"
                                onClick={() => onBarrierChange?.(Math.max(0, barrier - 1))}>
                            <Minus className="w-3 h-3"/>
                        </Button>

                        {/* Matching min-w and Font for Alignment */}
                        <div className="min-w-[4rem] flex justify-center">
                            <BarrierEditor
                                value={barrier}
                                onSave={(val) => onBarrierChange?.(val)}
                            />
                        </div>

                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-primary/20"
                                onClick={() => onBarrierChange?.(barrier + 1)}>
                            <Plus className="w-3 h-3"/>
                        </Button>
                    </div>
                </div>
            </div>

            <ResourceBar
                label="MP"
                current={mp.current}
                max={mp.max}
                min={0}
                color="bg-gradient-to-r from-blue-600 to-blue-400"
                icon={<Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"/>}
                onUpdate={onMpChange}
            />

            <ResourceBar
                label="IP"
                current={ip.current}
                max={ip.max}
                min={0}
                color="bg-gradient-to-r from-violet-600 to-violet-400"
                icon={<Droplets className="ww-3.5 h-3.5 text-violet-600 dark:text-violet-400"/>}
                onUpdate={onIpChange}
            />
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

export function CombatStatsPanel({defense, stability, speed, resistances, vulnerabilities}: CombatStatsPanelProps) {
    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4">Combat Stats</h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex justify-center mb-2">
                        <Swords className="w-5 h-5 text-primary"/>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{defense}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Defense</div>
                </div>

                <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex justify-center mb-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stability}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Stability</div>
                </div>

                <div className="text-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex justify-center mb-2">
                        <Footprints className="w-5 h-5 text-sky-600 dark:text-sky-400"/>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{speed}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Speed</div>
                </div>
            </div>

            {/* Resistances & Vulnerabilities */}
            <div className="space-y-3">
                {resistances.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-semibold">Resist:</span>
                        {resistances.map((r) => (
                            <span key={r}
                                  className="text-xs px-2 py-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700/50 dark:text-emerald-300 font-medium">
                {r}
              </span>
                        ))}
                    </div>
                )}
                {vulnerabilities.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="text-xs text-red-700 dark:text-red-400 uppercase tracking-wider font-semibold">Vuln:</span>
                        {vulnerabilities.map((v) => (
                            <span key={v}
                                  className="text-xs px-2 py-1 rounded bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/40 dark:border-red-700/50 dark:text-red-300 font-medium">
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
    onUpdateInspiration: (newCount: number) => void;
}

export function OtherStats({xp, inspiration, victories, onUpdateInspiration}: OtherStatsProps) {
    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4">Progress</h3>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">XP</span>
                    <span className="font-mono font-bold text-foreground text-base">{xp.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
        Inspiration
    </span>
                    <div className="flex gap-1.5">
                        {Array.from({length: 5}).map((_, i) => {
                            // Check if this pip should be filled based on current inspiration count
                            const isFilled = i < inspiration;
                            const isLastFilled = i === inspiration - 1;

                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        // Toggle logic: If clicking the current highest pip, go down 1.
                                        // Otherwise, set to the specific pip index.
                                        const newVal = isLastFilled ? i : i + 1;

                                        // Replace this with your actual update function (e.g., setInspiration)
                                        onUpdateInspiration(newVal);
                                    }}
                                    className={cn(
                                        "w-4 h-4 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                                        isFilled
                                            ? "bg-amber-400 border-amber-600 shadow-sm"
                                            : "bg-muted/30 border-dashed border-muted-foreground/30 hover:border-amber-400/50"
                                    )}
                                />
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span
                        className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Victories</span>
                    <span className="font-mono font-bold text-foreground text-base">{victories}</span>
                </div>
            </div>
        </div>
    )
}

function BarrierEditor({value, onSave}: { value: number, onSave: (val: number) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());

    if (isEditing) {
        return (
            <Input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                    onSave(parseInt(tempValue) || 0);
                    setIsEditing(false);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        onSave(parseInt(tempValue) || 0);
                        setIsEditing(false);
                    }
                    if (e.key === "Escape") setIsEditing(false);
                }}
                className="w-14 h-7 text-sm text-center p-1 font-mono font-bold"
                autoFocus
            />
        );
    }

    return (
        <button
            onClick={() => {
                setTempValue(value.toString());
                setIsEditing(true);
            }}
            className="font-mono font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-base w-full text-center"
        >
            {value}
        </button>
    );
}