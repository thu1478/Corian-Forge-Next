"use client"

import {useEffect, useLayoutEffect, useMemo, useState} from "react" // Added useState
import {cn} from "@/lib/utils"
import {ChevronDown, Clock, Crosshair, Droplets, Sparkles, Sword, Swords, Target, Wrench, Zap} from "lucide-react" // Added ChevronDown
import {InventoryItem} from "@/lib/equipment-data";
import {ActionCard} from "@/lib/rules";
import { EffectGlossaryTag } from "@/components/effect-glossary-tag"
import {
    PowerRollTierRow,
    type PowerRollDisplayMode,
} from "@/components/power-roll/power-roll-tier-row"
import { resolveWeaponForActionPowerRoll, resolveWeaponForGrantedEquipmentAction } from "@/logic/equipment/weapon-utils"
import {
    computeArcaneTraditionImplementBonus,
    computePowerRollFlatDamageBonus,
    computeShieldSubstituteWeaponDamage,
    resolvePowerRollTierAmountSuffix,
    type CombatRuleBonusInput,
} from "@/logic/combat/power-roll-combat-bonuses"
import {
    actionHasEnhancements,
    getDisplayApCost,
    getDisplayFocusCost,
    getDisplayIpCost,
    getDisplayMpCost,
    getDisplayPowerRoll,
} from "@/logic/actions/action-enhancements"
import { ChargePips } from "@/components/character-sheet/charge-pips"
import {
    hasChargeTracking,
    lookupChargeDefinition,
    resolveCurrentCharges,
    resolveMaxCharges,
    type RulesWithCharges,
} from "@/logic/traits/charge-helpers"
import { rulesData } from "@/lib/rules-data"
import { getActionItemChargeCost } from "@/logic/equipment/item-charges"
import { getActionTypeStyle } from "@/components/character-sheet/combatPage/action-tile-styles"
import { formatActionCardSubtitle } from "@/logic/actions/action-visual-category"
import { formatPowerRollHeaderSimple } from "@/logic/combat/power-roll-stat-display"

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
    /** When set, +Wpn uses this item instead of hand weapon resolution. */
    grantingWeapon?: InventoryItem | null
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
    /** Item charge cost for this equipment-granted action; omit when action does not spend item charges. */
    itemChargeCost?: number | null
    itemChargeCurrent?: number
    itemChargeMax?: number
    onSpendItemCharge?: (newCount: number) => void
}

export function ActionCardComponent({
                                        action,
                                        attributes,
                                        disabled = false,
                                        currentWeapon,
                                        offhandWeapon = null,
                                        grantingWeapon = null,
                                        forceCollapsed = false,
                                        onSpendActionCost,
                                        actionCostBudget,
                                        powerRollDisplayMode = "simple",
                                        defaultPowerRollExpanded = true,
                                        collapseAllSignal,
                                        combatRuleContext,
                                        onUpdateCharges,
                                        itemChargeCost = null,
                                        itemChargeCurrent = 0,
                                        itemChargeMax = 0,
                                        onSpendItemCharge,
                                    }: ActionCardProps) {
    // Each card maintains its own independent state
    const [isExpanded, setIsExpanded] = useState(true);
    const [isPowerRollExpanded, setIsPowerRollExpanded] = useState(defaultPowerRollExpanded);
    /** Keys of EnhanceAction notes that are expanded (default collapsed). */
    const [openEnhancementKeys, setOpenEnhancementKeys] = useState<Record<string, boolean>>({})

    /** Keep tier visibility aligned with props (new action / reused instance / delayed prop). */
    useLayoutEffect(() => {
        setIsPowerRollExpanded(defaultPowerRollExpanded)
    }, [action.id, defaultPowerRollExpanded])

    const weaponForPowerRollDamage = useMemo(
        () => {
            if (grantingWeapon) {
                return resolveWeaponForGrantedEquipmentAction(
                    grantingWeapon,
                    action.tags,
                    action.powerRoll?.rollStats,
                    { traits: combatRuleContext?.traits }
                )
            }
            return resolveWeaponForActionPowerRoll(
                action.tags,
                action.powerRoll?.rollStats,
                currentWeapon ?? null,
                offhandWeapon ?? null,
                { traits: combatRuleContext?.traits }
            )
        },
        [action.tags, action.powerRoll?.rollStats, currentWeapon, offhandWeapon, grantingWeapon, combatRuleContext?.traits]
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

    useEffect(() => {
        if (forceCollapsed) {
            setIsExpanded(false)
            setIsPowerRollExpanded(false)
            setOpenEnhancementKeys({})
            return
        }
        setIsExpanded(true)
        setIsPowerRollExpanded(defaultPowerRollExpanded)
    }, [forceCollapsed, defaultPowerRollExpanded])

    useEffect(() => {
        if (collapseAllSignal == null || collapseAllSignal < 1) return
        setIsExpanded(false)
        setIsPowerRollExpanded(false)
        setOpenEnhancementKeys({})
    }, [collapseAllSignal])

    const config = getActionTypeStyle(action)
    const TypeIcon = config.icon

    const spendInteractive = Boolean(onSpendActionCost && actionCostBudget && !disabled)
    const apCost = getDisplayApCost(action)
    const mpCost = getDisplayMpCost(action)
    const focusCost = getDisplayFocusCost(action)
    const ipCost = getDisplayIpCost(action)
    const displayPowerRoll = getDisplayPowerRoll(action)
    const pr = displayPowerRoll ?? action.powerRoll
    const weaponForPowerRollHeader = grantingWeapon ?? weaponForPowerRollDamage ?? null
    const powerRollHeaderSimpleLabel = useMemo(() => {
        if (!pr?.rollStats?.length) return null
        return formatPowerRollHeaderSimple(pr.rollStats, attributes, weaponForPowerRollHeader)
    }, [pr?.rollStats, attributes, weaponForPowerRollHeader])
    const addsWeaponDamageToPowerRoll =
        !!pr &&
        (pr.tier1Wpn === true ||
            pr.tier2Wpn === true ||
            pr.tier3Wpn === true ||
            (shieldSubstituteWeaponDamage != null && shieldSubstituteWeaponDamage > 0) ||
            flatPowerRollBonus > 0)

    const isEquipmentGranted = Boolean(action.grantingItemUid)
    const chargeDef = useMemo(() => {
        if (isEquipmentGranted) return undefined
        if (hasChargeTracking(action)) return action
        return lookupChargeDefinition("action", action.id, rulesData as RulesWithCharges)
    }, [action, isEquipmentGranted])
    const maxCharges = useMemo(
        () => resolveMaxCharges(chargeDef, attributes),
        [chargeDef, attributes]
    )
    const currentCharges = useMemo(
        () => resolveCurrentCharges(action.charges, maxCharges),
        [action.charges, maxCharges]
    )
    const showChargePips = !isEquipmentGranted && maxCharges > 0 && Boolean(onUpdateCharges)

    const itemChargeSpendCost = useMemo(() => {
        const resolved =
            itemChargeCost != null ? itemChargeCost : getActionItemChargeCost(action)
        if (resolved == null || resolved <= 0) return 0
        return resolved
    }, [itemChargeCost, action])
    const itemChargeSpendInteractive = Boolean(
        onSpendItemCharge && itemChargeSpendCost > 0 && !disabled
    )
    const showItemChargePool = itemChargeSpendCost > 0 && itemChargeMax > 0

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
                            {actionHasEnhancements(action) ? (
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    Enhanced
                                </span>
                            ) : null}
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
                            {formatActionCardSubtitle(action)}
                        </span>
                        {action.grantingItemName ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                via {action.grantingItemName}
                            </p>
                        ) : null}
                    </div>
                </div>
                {showItemChargePool ? (
                    <div
                        className="shrink-0 pt-1"
                        data-action-no-edit
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ChargePips
                            readOnly
                            showLabel={false}
                            maxCharges={itemChargeMax}
                            currentCharges={itemChargeCurrent}
                        />
                    </div>
                ) : null}
            </div>

            {/* COLLAPSIBLE CONTENT CONTAINER */}
            <div className={cn(
                "transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none overflow-hidden"
            )}>

                {/* Cost Row — MP / Focus / IP clickable on combat sheet; AP is display-only */}
                <div className="flex flex-wrap gap-2 mb-4" data-action-no-edit>
                    {apCost > 0 ? (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40">
                            <Zap className="w-4 h-4 text-primary"/>
                            <span className="text-base font-bold text-primary">{apCost} AP</span>
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
                                    "bg-violet-200 dark:bg-violet-600/35 border-violet-400 dark:border-violet-400/70",
                                    "hover:bg-violet-300/80 dark:hover:bg-violet-600/45 disabled:cursor-not-allowed disabled:opacity-40"
                                )}
                            >
                                <Wrench className="w-4 h-4 shrink-0 text-violet-700 dark:text-violet-400"/>
                                <span className="text-base font-bold text-violet-700 dark:text-violet-400">{ipCost} IP</span>
                            </button>
                        ) : (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-200 dark:bg-violet-600/35 border border-violet-400 dark:border-violet-400/70">
                                <Wrench className="w-4 h-4 text-violet-700 dark:text-violet-400"/>
                                <span
                                    className="text-base font-bold text-violet-700 dark:text-violet-400">{ipCost} IP</span>
                            </div>
                        )
                    )}

                    {itemChargeSpendCost > 0 && (
                        itemChargeSpendInteractive ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (itemChargeCurrent < itemChargeSpendCost) return
                                    onSpendItemCharge?.(itemChargeCurrent - itemChargeSpendCost)
                                }}
                                disabled={itemChargeCurrent < itemChargeSpendCost}
                                title={`Spend ${itemChargeSpendCost} item charge${itemChargeSpendCost === 1 ? "" : "s"}`}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors",
                                    "bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40",
                                    "hover:bg-amber-200/80 dark:hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                )}
                            >
                                <Sparkles className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400"/>
                                <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                                    {itemChargeSpendCost} {itemChargeSpendCost === 1 ? "Charge" : "Charges"}
                                </span>
                            </button>
                        ) : (
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40">
                                <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400"/>
                                <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                                    {itemChargeSpendCost} {itemChargeSpendCost === 1 ? "Charge" : "Charges"}
                                </span>
                            </div>
                        )
                    )}
                </div>

                {showChargePips ? (
                    <div
                        className="mb-4"
                        data-action-no-edit
                        onClick={(e) => e.stopPropagation()}
                    >
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
                <div
                    className="max-h-32 overflow-y-auto pr-2 custom-scrollbar mb-4"
                    data-action-no-edit
                >
                    <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                        {action.description}
                    </p>
                </div>

                {action.enhancements?.notes.length ? (
                    <div className="mb-4 space-y-2" data-action-no-edit>
                        {action.enhancements.notes.map((note, i) => {
                            const key = `${note.sourceLabel}-${i}`
                            const isOpen = openEnhancementKeys[key] === true
                            return (
                                <div
                                    key={key}
                                    className="rounded-lg border border-primary/25 bg-primary/5 overflow-hidden"
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setOpenEnhancementKeys((prev) => ({
                                                ...prev,
                                                [key]: !prev[key],
                                            }))
                                        }}
                                        className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-primary/10 transition-colors"
                                    >
                                        <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                                            {note.sourceLabel}
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                "w-4 h-4 shrink-0 text-primary/60 transition-transform duration-200",
                                                !isOpen && "-rotate-90",
                                            )}
                                        />
                                    </button>
                                    {isOpen ? (
                                        <div className="px-3 pb-2.5">
                                            <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">
                                                {note.appendDescription}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>
                ) : null}

                {/* Power Roll (Collapsible) */}
                {pr && (
                    <div
                        data-action-no-edit
                        className={cn(
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
                                {powerRollDisplayMode === "formula" ? (
                                    pr.rollStats.map((stat, i) => (
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
                                    ))
                                ) : powerRollHeaderSimpleLabel ? (
                                    <div
                                        className="flex h-7 min-w-7 px-1 items-center justify-center rounded bg-foreground/5 border border-foreground/10 shadow-sm">
                                        <span
                                            className={cn("text-base font-black font-mono leading-none tabular-nums", config.accent)}>
                                            {powerRollHeaderSimpleLabel}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </button>

                        {/* Tier Rows - Animated visibility */}
                        <div className={cn(
                            "transition-all duration-200",
                            isPowerRollExpanded ? "p-2 space-y-1 block opacity-100" : "hidden opacity-0"
                        )}>
                            <PowerRollTierRow
                                label="<=11"
                                roll={pr}
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
                                roll={pr}
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
                                roll={pr}
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
                <div
                    className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border dark:border-white/10"
                    data-action-no-edit
                >
                    {(action.tags ?? []).map((tag) => (
                        <EffectGlossaryTag key={tag} tag={tag} />
                    ))}
                </div>

            </div>
        </div>
    )
}