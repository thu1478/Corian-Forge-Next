"use client"

import {useEffect, useLayoutEffect, useMemo, useState} from "react" // Added useState
import {cn} from "@/lib/utils"
import {ChevronDown, Clock, Crosshair, Droplets, Sword, Swords, Target, Wrench, Zap} from "lucide-react" // Added ChevronDown
import {InventoryItem} from "@/lib/equipment-data";
import {ActionCard} from "@/lib/rules";
import { EffectGlossaryTag } from "@/components/effect-glossary-tag"
import {
    PowerRollTierRow,
    type PowerRollDisplayMode,
} from "@/components/power-roll/power-roll-tier-row"
import { resolveWeaponForActionPowerRoll } from "@/lib/weapon-utils"
import {
    computeArcaneTraditionImplementBonus,
    computePowerRollFlatDamageBonus,
    computeShieldSubstituteWeaponDamage,
    resolvePowerRollTierAmountSuffix,
    type CombatRuleBonusInput,
} from "@/lib/power-roll-combat-bonuses"
import { ChargePips } from "@/components/character-sheet/charge-pips"
import {
    hasChargeTracking,
    lookupChargeDefinition,
    resolveCurrentCharges,
    resolveMaxCharges,
    type RulesWithCharges,
} from "@/lib/charge-helpers"
import rulesData from "@/lib/rules.json"

export type CombatRuleContext = CombatRuleBonusInput

export type ActionSpendResourceKind = "mp" | "focus" | "ip"

/** Combat tab: simple totals vs base + weapon / max mod + potency tier math. */
export type { PowerRollDisplayMode }

export interface ActionCostBudget {
    mp: number
    focus: number
    ip: number
}

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
    /** Main hand (active weapon slot). */
    currentWeapon?: InventoryItem | null
    /** Off hand; only weapons contribute to +Wpn resolution (shields ignored). */
    offhandWeapon?: InventoryItem | null
    forceCollapsed: boolean
    /** When set with `actionCostBudget`, cost chips spend that resource on click (e.g. combat tab). */
    onSpendActionCost?: (kind: ActionSpendResourceKind, amount: number) => void
    actionCostBudget?: ActionCostBudget
    /** Default `simple`: final damage & potency DC. `formula`: show sums (e.g. 2 + 1 DMG, 4 + (−1) potency). */
    powerRollDisplayMode?: PowerRollDisplayMode
    /** When false, power roll tier rows start collapsed (e.g. rules library). Default true for character sheet. */
    defaultPowerRollExpanded?: boolean
    /** Increment (e.g. library "Collapse all") to collapse card body and power-roll tiers. */
    collapseAllSignal?: number
    /** When set, power rolls include Shield Master / Arcane Tradition / Reward for Faith math. */
    combatRuleContext?: CombatRuleContext
    onUpdateCharges?: (newCount: number) => void
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
                                        offhandWeapon = null,
                                        forceCollapsed = false,
                                        onSpendActionCost,
                                        actionCostBudget,
                                        powerRollDisplayMode = "simple",
                                        defaultPowerRollExpanded = true,
                                        collapseAllSignal,
                                        combatRuleContext,
                                        onUpdateCharges,
                                    }: ActionCardProps) {
    // Each card maintains its own independent state
    const [isExpanded, setIsExpanded] = useState(true);
    const [isPowerRollExpanded, setIsPowerRollExpanded] = useState(defaultPowerRollExpanded);

    /** Keep tier visibility aligned with props (new action / reused instance / delayed prop). */
    useLayoutEffect(() => {
        setIsPowerRollExpanded(defaultPowerRollExpanded)
    }, [action.id, defaultPowerRollExpanded])

    const weaponForPowerRollDamage = useMemo(
        () =>
            resolveWeaponForActionPowerRoll(
                action.tags,
                action.powerRoll?.rollStats,
                currentWeapon ?? null,
                offhandWeapon ?? null,
                { traits: combatRuleContext?.traits }
            ),
        [action.tags, action.powerRoll?.rollStats, currentWeapon, offhandWeapon, combatRuleContext?.traits]
    );

    const shieldSubstituteWeaponDamage = useMemo(
        () => computeShieldSubstituteWeaponDamage(action, combatRuleContext),
        [action, combatRuleContext]
    );

    const flatPowerRollBonus = useMemo(() => {
        const fromCards = computePowerRollFlatDamageBonus(action, combatRuleContext)
        const arcane = computeArcaneTraditionImplementBonus(action, combatRuleContext)
        return fromCards + arcane
    }, [action, combatRuleContext])

    const weaponDamageContext = useMemo(
        () =>
            combatRuleContext
                ? {
                      traits: combatRuleContext.traits,
                      activeWeapon: combatRuleContext.activeWeapon ?? null,
                      offhandWeapon: combatRuleContext.offhandWeapon ?? null,
                  }
                : undefined,
        [combatRuleContext]
    )

    const tierAmountSuffix = useMemo(
        () => resolvePowerRollTierAmountSuffix(action.hiddenTags),
        [action.hiddenTags]
    )

    // Effect to listen to the "Global Collapse" button from parent
    useEffect(() => {
        setIsExpanded(!forceCollapsed);
    }, [forceCollapsed]);

    useEffect(() => {
        if (collapseAllSignal == null || collapseAllSignal < 1) return
        setIsExpanded(false)
        setIsPowerRollExpanded(false)
    }, [collapseAllSignal])

    const config = typeConfig[action.type] || typeConfig.action
    const TypeIcon = config.icon

    const pr = action.powerRoll
    const addsWeaponDamageToPowerRoll =
        !!pr &&
        (pr.tier1Wpn === true ||
            pr.tier2Wpn === true ||
            pr.tier3Wpn === true ||
            (shieldSubstituteWeaponDamage != null && shieldSubstituteWeaponDamage > 0) ||
            flatPowerRollBonus > 0)

    const spendInteractive = Boolean(onSpendActionCost && actionCostBudget && !disabled)
    const mpCost = action.mpCost ?? 0
    const focusCost = action.focusCost ?? 0
    const ipCost = action.ipCost ?? 0

    const chargeDef = useMemo(() => {
        if (hasChargeTracking(action)) return action
        return lookupChargeDefinition("action", action.id, rulesData as RulesWithCharges)
    }, [action])
    const maxCharges = useMemo(
        () => resolveMaxCharges(chargeDef, attributes),
        [chargeDef, attributes]
    )
    const currentCharges = useMemo(
        () => resolveCurrentCharges(action.charges, maxCharges),
        [action.charges, maxCharges]
    )
    const showChargePips = maxCharges > 0 && Boolean(onUpdateCharges)

    const trySpend = (kind: ActionSpendResourceKind, amount: number) => {
        if (!spendInteractive || amount <= 0) return
        onSpendActionCost?.(kind, amount)
    }

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
                            {addsWeaponDamageToPowerRoll ? (
                                <span
                                    className="inline-flex shrink-0 text-foreground/55 hover:text-foreground/80"
                                    title="Weapon or implement damage is included in the power roll (tiers and/or equipment bonuses)"
                                >
                                    <Sword className="h-4 w-4" aria-hidden />
                                    <span className="sr-only">
                                        Weapon or implement damage is included in the power roll
                                    </span>
                                </span>
                            ) : null}
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

                {/* Cost Row — MP / Focus / IP clickable on combat sheet; AP is display-only */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {action.apCost ? (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40">
                            <Zap className="w-4 h-4 text-primary"/>
                            <span className="text-base font-bold text-primary">{action.apCost} AP</span>
                        </div>
                    ) : null}

                    {mpCost > 0 && (
                        spendInteractive ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    trySpend("mp", mpCost)
                                }}
                                disabled={(actionCostBudget?.mp ?? 0) < mpCost}
                                title={`Spend ${mpCost} MP`}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                                    "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/40",
                                    "hover:bg-blue-200/80 dark:hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                )}
                            >
                                <Droplets className="w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400"/>
                                <span className="text-base font-bold text-blue-700 dark:text-blue-400">{mpCost} MP</span>
                            </button>
                        ) : (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40">
                                <Droplets className="w-4 h-4 text-blue-700 dark:text-blue-400"/>
                                <span
                                    className="text-base font-bold text-blue-700 dark:text-blue-400">{mpCost} MP</span>
                            </div>
                        )
                    )}

                    {focusCost > 0 && (
                        spendInteractive ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    trySpend("focus", focusCost)
                                }}
                                disabled={(actionCostBudget?.focus ?? 0) < focusCost}
                                title={`Spend ${focusCost} Focus`}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                                    "bg-orange-100 dark:bg-orange-500/20 border-orange-300 dark:border-orange-500/40",
                                    "hover:bg-orange-200/80 dark:hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                )}
                            >
                                <Target className="w-4 h-4 shrink-0 text-orange-700 dark:text-orange-400"/>
                                <span className="text-base font-bold text-orange-700 dark:text-orange-400">{focusCost} Focus</span>
                            </button>
                        ) : (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40">
                                <Target className="w-4 h-4 text-orange-700 dark:text-orange-400"/>
                                <span
                                    className="text-base font-bold text-orange-700 dark:text-orange-400">{focusCost} Focus</span>
                            </div>
                        )
                    )}

                    {ipCost > 0 && (
                        spendInteractive ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    trySpend("ip", ipCost)
                                }}
                                disabled={(actionCostBudget?.ip ?? 0) < ipCost}
                                title={`Spend ${ipCost} IP`}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                                    "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40",
                                    "hover:bg-emerald-200/80 dark:hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                )}
                            >
                                <Wrench className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400"/>
                                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{ipCost} IP</span>
                            </button>
                        ) : (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40">
                                <Wrench className="w-4 h-4 text-emerald-700 dark:text-emerald-400"/>
                                <span
                                    className="text-base font-bold text-emerald-700 dark:text-emerald-400">{ipCost} IP</span>
                            </div>
                        )
                    )}
                </div>

                {showChargePips ? (
                    <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                        <ChargePips
                            maxCharges={maxCharges}
                            currentCharges={currentCharges}
                            label={
                                chargeDef?.fixedMaxCharges != null
                                    ? "Charges"
                                    : chargeDef?.chargeStat
                                      ? `${chargeDef.chargeStat} Charges`
                                      : "Charges"
                            }
                            onChange={(n) => onUpdateCharges?.(n)}
                        />
                    </div>
                ) : null}

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
                    <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
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
                            <PowerRollTierRow
                                label="<=11"
                                roll={action.powerRoll}
                                tier={1}
                                badgeStyle={config.badge}
                                attributes={attributes}
                                weaponForPowerRoll={weaponForPowerRollDamage}
                                shieldSubstituteWeaponDamage={shieldSubstituteWeaponDamage}
                                flatDamageBonus={flatPowerRollBonus}
                                tierAmountSuffix={tierAmountSuffix}
                                powerRollDisplayMode={powerRollDisplayMode}
                                weaponDamageContext={weaponDamageContext}
                            />
                            <PowerRollTierRow
                                label="12-16"
                                roll={action.powerRoll}
                                tier={2}
                                badgeStyle={config.badge}
                                attributes={attributes}
                                weaponForPowerRoll={weaponForPowerRollDamage}
                                shieldSubstituteWeaponDamage={shieldSubstituteWeaponDamage}
                                flatDamageBonus={flatPowerRollBonus}
                                tierAmountSuffix={tierAmountSuffix}
                                powerRollDisplayMode={powerRollDisplayMode}
                                weaponDamageContext={weaponDamageContext}
                            />
                            <PowerRollTierRow
                                label=">=17"
                                roll={action.powerRoll}
                                tier={3}
                                badgeStyle={config.badge}
                                attributes={attributes}
                                weaponForPowerRoll={weaponForPowerRollDamage}
                                shieldSubstituteWeaponDamage={shieldSubstituteWeaponDamage}
                                flatDamageBonus={flatPowerRollBonus}
                                tierAmountSuffix={tierAmountSuffix}
                                powerRollDisplayMode={powerRollDisplayMode}
                                weaponDamageContext={weaponDamageContext}
                            />
                        </div>
                    </div>
                )}

                {/* Tags (glossary popover per tag) */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border dark:border-white/10">
                    {(action.tags ?? []).map((tag) => (
                        <EffectGlossaryTag key={tag} tag={tag} />
                    ))}
                </div>

            </div>
        </div>
    )
}