"use client"

import {useEffect, useState} from "react" // Added useState
import {cn} from "@/lib/utils"
import {ChevronDown, Clock, Crosshair, Droplets, Swords, Target, Wrench, Zap} from "lucide-react" // Added ChevronDown
import {InventoryItem} from "@/lib/equipment-data";
import {ActionCard, CharAttribute, PotencyEffect, PowerRoll} from "@/lib/rules";
import {getAttributeModifier} from "@/lib/character-data";

interface ActionCardProps {
    action: ActionCard
    attributes: {
        might: number;
        dexterity: number;
        reason: number;
        willpower: number;
        presence: number;
    }
    disabled?: boolean
    currentWeapon?: InventoryItem | null
    forceCollapsed: boolean
}

const typeConfig = {
    action: {
        icon: Swords,
        bg: "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-950/50 dark:to-red-900/30",
        border: "border-red-300 dark:border-red-800/60",
        accent: "text-red-700 dark:text-red-400",
        badge: "bg-red-200 text-red-800 dark:bg-red-900/80 dark:text-red-200"
    },
    reaction: {
        icon: Zap,
        bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/50 dark:to-amber-900/30",
        border: "border-amber-300 dark:border-amber-800/60",
        accent: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-200 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200"
    },
    freeReaction: {
        icon: Zap,
        bg: "bg-gradient-to-br from-sky-100 to-sky-50 dark:from-sky-950/50 dark:to-sky-900/30",
        border: "border-sky-300 dark:border-sky-800/60",
        accent: "text-sky-700 dark:text-sky-400",
        badge: "bg-sky-200 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200"
    }
}

export function ActionCardComponent({
                                        action,
                                        attributes,
                                        disabled = false,
                                        currentWeapon,
                                        forceCollapsed = false
                                    }: ActionCardProps) {
    // Each card maintains its own independent state
    const [isExpanded, setIsExpanded] = useState(true);
    const [isPowerRollExpanded, setIsPowerRollExpanded] = useState(true);

    // Effect to listen to the "Global Collapse" button from parent
    useEffect(() => {
        setIsExpanded(!forceCollapsed);
    }, [forceCollapsed]);

    const config = typeConfig[action.type] || typeConfig.action
    const TypeIcon = config.icon

    return (
        <div className={cn(
            "relative rounded-xl border-2 p-5 transition-all duration-200",
            config.bg, config.border,
            disabled ? "opacity-50 grayscale" : "hover:scale-[1.02] hover:shadow-lg hover:shadow-black/30 cursor-pointer"
        )}>
            {/* Header */}
            <div
                className="flex items-start justify-between gap-2 mb-4 group/header select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.badge)}>
                        <TypeIcon className="w-5 h-5"/>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground leading-tight text-lg">{action.name}</h3>
                            <ChevronDown className={cn(
                                "w-5 h-5 transition-transform duration-300 opacity-30 group-hover/header:opacity-100",
                                !isExpanded && "-rotate-90"
                            )}/>
                        </div>
                        <span className={cn("text-sm uppercase tracking-wider font-medium", config.accent)}>
                            {action.type}
                        </span>
                    </div>
                </div>
            </div>

            {/* COLLAPSIBLE CONTENT CONTAINER */}
            <div className={cn(
                "transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none overflow-hidden"
            )}>

                {/* Cost Row */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {action.apCost && (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40">
                            <Zap className="w-4 h-4 text-primary"/>
                            <span className="text-base font-bold text-primary">{action.apCost} AP</span>
                        </div>
                    )}

                    {action.mpCost !== undefined && action.mpCost > 0 && (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40">
                            <Droplets className="w-4 h-4 text-blue-700 dark:text-blue-400"/>
                            <span
                                className="text-base font-bold text-blue-700 dark:text-blue-400">{action.mpCost} MP</span>
                        </div>
                    )}

                    {action.focusCost !== undefined && action.focusCost > 0 && (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40">
                            <Target className="w-4 h-4 text-orange-700 dark:text-orange-400"/>
                            <span
                                className="text-base font-bold text-orange-700 dark:text-orange-400">{action.focusCost} Focus</span>
                        </div>
                    )}

                    {action.ipCost !== undefined && action.ipCost > 0 && (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40">
                            <Wrench className="w-4 h-4 text-emerald-700 dark:text-emerald-400"/>
                            <span
                                className="text-base font-bold text-emerald-700 dark:text-emerald-400">{action.ipCost} IP</span>
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4 text-sm text-foreground/70">
                    {action.range && (
                        <div className="flex items-center gap-1.5">
                            <Crosshair className="w-4 h-4"/>
                            <span>{action.range}</span>
                        </div>
                    )}
                    {action.duration && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4"/>
                            <span>{action.duration}</span>
                        </div>
                    )}
                </div>

                {/* Effect Description */}
                <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar mb-4">
                    <p className="text-base text-foreground/80 leading-relaxed">
                        {action.description}
                    </p>
                </div>

                {/* Power Roll (Collapsible) */}
                {action.powerRoll && (
                    <div className={cn(
                        "mb-5 rounded-lg border-l-4 bg-muted/20 dark:bg-white/5 overflow-hidden transition-all",
                        config.border.replace('border-', 'border-l-')
                    )}>
                        {/* Header - Toggle Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPowerRollExpanded(!isPowerRollExpanded);
                            }}
                            className="w-full px-3 py-2 flex items-center justify-between border-b border-border/20 hover:bg-foreground/5 transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <ChevronDown className={cn(
                                    "w-4 h-4 opacity-30 transition-transform duration-200",
                                    !isPowerRollExpanded && "-rotate-90"
                                )}/>
                                <span
                                    className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100">
                                Power Roll
                            </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {action.powerRoll.rollStats.map((stat, i) => (
                                    <div key={stat} className="flex items-center gap-1.5">
                                        {i > 0 && <span className="font-bold text-sm opacity-30">or</span>}
                                        <div
                                            className="flex h-7 w-7 items-center justify-center rounded bg-foreground/5 border border-foreground/10 shadow-sm">
                                        <span
                                            className={cn("text-base font-black uppercase font-mono leading-none", config.accent)}>
                                            {stat[0]}
                                        </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </button>

                        {/* Tier Rows - Animated visibility */}
                        <div className={cn(
                            "transition-all duration-200",
                            isPowerRollExpanded ? "p-2 space-y-1 block opacity-100" : "hidden opacity-0"
                        )}>
                            <TierRow
                                label="<=11"
                                roll={action.powerRoll}
                                tier={1}
                                badgeStyle={config.badge}
                                attributes={attributes}
                                currentWeapon={currentWeapon} // Pass it here
                            />
                            <TierRow
                                label="12-16"
                                roll={action.powerRoll}
                                tier={2}
                                badgeStyle={config.badge}
                                attributes={attributes}
                                currentWeapon={currentWeapon} // Pass it here
                            />
                            <TierRow
                                label=">=17"
                                roll={action.powerRoll}
                                tier={3}
                                badgeStyle={config.badge}
                                attributes={attributes}
                                currentWeapon={currentWeapon} // Pass it here
                            />
                        </div>
                    </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border dark:border-white/10">
                    {action.tags.map((tag) => (
                        <span key={tag}
                              className="text-xs px-2.5 py-1 rounded-full bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-foreground/70 uppercase tracking-wider font-medium">
                        {tag}
                    </span>
                    ))}
                </div>

            </div>
        </div>
    )
}

function TierRow({label, roll, tier, badgeStyle, attributes, currentWeapon}: {
    label: string,
    roll: PowerRoll,
    tier: number,
    badgeStyle: string,
    attributes: ActionCardProps['attributes'],
    currentWeapon?: InventoryItem | null
}) {
    const baseDmg = roll[`tier${tier}Dmg` as keyof PowerRoll] as number || 0;
    const hasWpn = roll[`tier${tier}Wpn` as keyof PowerRoll] as boolean || false;
    const potency = roll[`tier${tier}Effect` as keyof PowerRoll] as PotencyEffect | undefined;

    // 2. Weapon Damage Matching Logic
    let weaponBonus = 0;
    if (currentWeapon && currentWeapon.type === "weapon" && currentWeapon.attributes) {
        // Check if weapon attributes overlap with card's rollStats
        const isCompatible = currentWeapon.attributes.some((attr) =>
            roll.rollStats.includes(attr as CharAttribute)
        );

        if (isCompatible) {
            weaponBonus = currentWeapon.damage || 0;
        }
    }

    // 3. Final Damage = (Tier Scaling ? Highest Mod : 0) + Base + Weapon Bonus
    const finalDmg = (hasWpn ? weaponBonus : 0) + baseDmg;

    const getPotencyThreshold = (p: PotencyEffect) => {
        if (p.type === 'Special' || p.strength === undefined || !p.srcStats) return null;
        const modifiers = p.srcStats.map(stat => getAttributeModifier(attributes[stat as keyof typeof attributes]));
        return Math.max(...modifiers) + p.strength;
    };

    const threshold = potency ? getPotencyThreshold(potency) : null;
    const shouldShowDmg = hasWpn || finalDmg > 0;

    return (
        <div
            className="flex flex-col rounded-lg bg-muted/50 dark:bg-black/30 border border-border dark:border-white/10 overflow-hidden">
            {/* Top Row: Label and Damage */}
            <div className="flex items-center justify-between px-3 py-2 bg-foreground/[0.03] border-b border-border/30">
                <span className="text-xs font-black opacity-50 italic uppercase tracking-tighter">
                    {label}
                </span>
                {shouldShowDmg && (
                    <span className="font-mono font-bold text-foreground text-lg leading-none">
                        {finalDmg} <span className="text-[10px] opacity-40 uppercase ml-0.5">dmg</span>
                    </span>
                )}
            </div>

            {/* Bottom Row: Potency/Effects (Full Width) */}
            {potency && (
                <div className="px-3 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {/* Math Requirement */}
                    {threshold !== null && potency.type !== 'Special' && potency.targetStats && (
                        <div className="flex items-center gap-2">
                             <span
                                 className="text-sm font-mono font-black text-muted-foreground uppercase tracking-tight">
                                {potency.targetStats.map(s => s[0]).join("/")}
                            </span>
                            <span className="text-base font-black text-primary flex items-center gap-1">
                                <span className="text-xs opacity-50">&lt;</span>
                                [{threshold}]
                            </span>
                        </div>
                    )}

                    {/* The Badge */}
                    <span
                        className={cn("text-sm px-2.5 py-1 rounded font-extrabold uppercase tracking-tight leading-none shadow-sm", badgeStyle)}>
                        {potency.type === 'ForcedMovement' ? `${potency.effect} ${potency.distance}` : potency.effect}
                    </span>

                    {/* Duration */}
                    {potency.type !== 'ForcedMovement' && !!potency.duration && (
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"/>
                            <span className="text-xs text-muted-foreground lowercase font-bold italic leading-none">
                                {potency.duration}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}