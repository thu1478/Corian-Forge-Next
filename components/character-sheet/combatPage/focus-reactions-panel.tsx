"use client"

import { ChargePips } from "@/components/character-sheet/charge-pips"
import {
    lookupChargeDefinition,
    resolveCurrentCharges,
    resolveMaxCharges,
    type RulesWithCharges,
} from "@/lib/charge-helpers"
import {getAttributeModifier} from "@/lib/character-data"
import {
    getReactionResourceCostsForInlineRow,
    ReactionResourceCostBadges,
} from "@/components/reaction-resource-cost-badges"
import {ChevronDown, Lock, Plus, Target, Zap} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {FocusFeature, Reaction, type ActionCard} from "@/lib/rules"
import type {InventoryItem} from "@/lib/equipment-data"
import {
    ActionCardComponent,
    type ActionCostBudget,
    type ActionSpendResourceKind,
    type CombatRuleContext,
} from "@/components/character-sheet/combatPage/action-card-manager";
import { unwrapEmbeddedActionCard } from "@/lib/embedded-action-card";
import { hydrateActionCardById } from "@/lib/action-hydrate";

function startOfTurnFocusGain(adventurerLevel?: number): number {
    const lvl =
        adventurerLevel != null && Number.isFinite(adventurerLevel)
            ? Math.max(1, Math.floor(adventurerLevel))
            : 1;
    if (lvl >= 7) return 3;
    if (lvl >= 4) return 2;
    return 1;
}

function FocusAddButton({
    amount,
    ariaLabel,
    onAddFocus,
}: {
    amount: number;
    ariaLabel: string;
    onAddFocus?: (amount: number) => void;
}) {
    if (!onAddFocus || amount <= 0) return null;
    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-lg border-2 border-orange-400/50 text-orange-600 hover:bg-orange-100 dark:border-orange-500/50 dark:text-orange-400 dark:hover:bg-orange-950/30"
            aria-label={ariaLabel}
            onClick={() => onAddFocus(amount)}
        >
            <Plus className="h-4 w-4" />
        </Button>
    );
}

interface FocusReactionsPanelProps {
    rules: Record<string, any>;
    knownFocusFeats: FocusFeature[]
    onSelectFeat: (index: number, newName: string) => void;
    knownReactions: Reaction[]
    onSelectReaction: (index: number, newName: string) => void;
    attributes: Record<string, number>;
    onUpdateReactionCharges: (reactionId: string, newCount: number) => void;
    actionCostBudget?: ActionCostBudget;
    onSpendActionCost?: (kind: ActionSpendResourceKind, amount: number) => void;
    /** Global catalog entries (e.g. feat/protect) the player can append to their reaction list. */
    catalogReactionOptions?: { id: string; label: string }[];
    onAddCatalogReaction?: (id: string) => void;
    currentWeapon?: InventoryItem | null;
    offhandWeapon?: InventoryItem | null;
    combatRuleContext?: CombatRuleContext;
    /** When set, Start of Turn description includes your current gain by Adventurer level. */
    adventurerLevel?: number;
    onAddFocus?: (amount: number) => void;
}

export function FocusReactionsPanel({
                                        rules,
                                        knownFocusFeats,
                                        onSelectFeat,
                                        knownReactions,
                                        onSelectReaction,
                                        attributes,
                                        onUpdateReactionCharges,
                                        actionCostBudget,
                                        onSpendActionCost,
                                        catalogReactionOptions = [],
                                        onAddCatalogReaction,
                                        currentWeapon = null,
                                        offhandWeapon = null,
                                        combatRuleContext,
                                        adventurerLevel,
                                        onAddFocus,
                                    }: FocusReactionsPanelProps) {
    // Get the default focus feat start of turn
    const globalFocus = rules?.system?.defaults?.focusFeat
    const startOfTurnGain = startOfTurnFocusGain(adventurerLevel)
    const startOfTurnDescription = `Gain ${startOfTurnGain} Focus at the start of your turn`
    // Get the default opp atk reaction
    const globalReaction = rules?.system?.defaults?.reactions[0]

    return (
        <div className="space-y-4">
            {/* Focus Features */}
            <div className="p-4 bg-card rounded-xl border border-border">
                <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5"/>
                    Focus Features
                </h3>

                {/* --- SLOT 0: SYSTEM DEFAULT (Fixed) --- */}
                {
                    <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 opacity-90">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-bold text-foreground text-base">{globalFocus?.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                                <FocusAddButton
                                    amount={startOfTurnGain}
                                    ariaLabel={`Add ${startOfTurnGain} Focus (Start of Turn)`}
                                    onAddFocus={onAddFocus}
                                />
                                <Lock className="w-3 h-3 text-blue-400/50"/>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed italic whitespace-pre-line">
                            {startOfTurnDescription}
                        </p>
                    </div>
                }

                {/* --- SLOTS 1 & 2: PLAYER CHOICES --- */}
                {[0, 1].map((slotIndex) => {
                    // We strictly look at index 0 and 1 of the library for the UI
                    const currentFeat = knownFocusFeats.find(f => f.slotIndex === slotIndex);
                    const currentFeatRule = rules?.classes?.[currentFeat?.classSrc || ""]?.focusFeat;
                    const currentFeatName = currentFeatRule?.name || "";

                    return (
                        <div key={slotIndex} className="space-y-2">
                            {/* Dropdown option to select focus feature */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-between bg-muted/20 border-border hover:border-primary/50 transition-colors text-sm font-bold h-10"
                                    >
                                        <span>
                                        {currentFeatName || "-- No Selection --"}
                                    </span>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[250px]">
                                    {/* Option to unequip */}
                                    <DropdownMenuItem
                                        onClick={() => onSelectFeat(slotIndex, "")}
                                        className="text-muted-foreground italic"
                                    >
                                        No Selection
                                    </DropdownMenuItem>

                                    {/* Mapping your available feats */}
                                    {knownFocusFeats.map((feat) => {
                                        const thisOptionRule = rules?.classes?.[feat.classSrc || ""]?.focusFeat;
                                        const thisOptionName = thisOptionRule?.name || "Unknown Feat";

                                        const isDisabled = feat.slotIndex >= 0;

                                        return (
                                            <DropdownMenuItem
                                                key={feat.classSrc}
                                                onClick={() => onSelectFeat(slotIndex, feat.classSrc)}
                                                disabled={isDisabled}
                                            >
                                                {thisOptionName}
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {/* Display description if a valid feat is selected */}
                            {(currentFeat?.slotIndex ?? -1) >= 0 && (
                                <div
                                    className="p-4 rounded-lg border transition-all bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/50">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="font-bold text-foreground text-base">
                                            {currentFeatName}
                                        </span>
                                        <FocusAddButton
                                            amount={1}
                                            ariaLabel={`Add 1 Focus (${currentFeatName})`}
                                            onAddFocus={onAddFocus}
                                        />
                                    </div>
                                    <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                                        {currentFeatRule?.description || "No description available."}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- REACTIONS SECTION --- */}
            <div className="p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h3 className="text-base font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                        <Zap className="w-5 h-5 shrink-0"/>
                        Reactions
                    </h3>
                    {onAddCatalogReaction && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shrink-0 text-[10px] font-black uppercase tracking-widest gap-1"
                                    title="Add a reaction from global rules (all non-monster reaction cards)"
                                >
                                    <Plus className="w-3 h-3"/>
                                    Add
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                                {catalogReactionOptions.length === 0 ? (
                                    <DropdownMenuItem disabled>No catalog reactions</DropdownMenuItem>
                                ) : (
                                    catalogReactionOptions.map((opt) => {
                                        const already = knownReactions.some((r) => r.id === opt.id);
                                        return (
                                            <DropdownMenuItem
                                                key={opt.id}
                                                disabled={already}
                                                onClick={() => onAddCatalogReaction(opt.id)}
                                            >
                                                {opt.label}
                                                {already ? " (owned)" : ""}
                                            </DropdownMenuItem>
                                        );
                                    })
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Default Slot */}
                <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 opacity-90 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-foreground text-base">{globalReaction?.name}</span>
                        <Lock className="w-3 h-3 text-blue-400/50"/>
                    </div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1 whitespace-pre-line">Trigger: {globalReaction?.trigger}</p>
                    <p className="text-sm text-muted-foreground italic whitespace-pre-line">{globalReaction?.description}</p>
                </div>

                {/* Choices Slots */}
                <div className="space-y-4">
                    {[0, 1].map((slotIndex) => {
                        const currentReaction = knownReactions.find(f => f.slotIndex === slotIndex);

                        const chargeDef = currentReaction?.id
                            ? lookupChargeDefinition(
                                  "reaction",
                                  currentReaction.id,
                                  rules as RulesWithCharges
                              )
                            : undefined
                        const maxCharges = resolveMaxCharges(chargeDef, attributes as Record<string, number>)
                        const currentCharges = resolveCurrentCharges(
                            currentReaction?.charges,
                            maxCharges
                        )
                        const showChargePips = maxCharges > 0
                        const statKey = chargeDef?.chargeStat ?? currentReaction?.chargeStat
                        const fixedMax = chargeDef?.fixedMaxCharges
                        const reactionChargesDepleted = showChargePips && currentCharges <= 0

                        // 3. Extract action card data (embedded class wrapper, or global card by id e.g. feat/protect)
                        let actionCardData: ActionCard | null = null
                        if (currentReaction?.actionCard) {
                            const unwrapped = unwrapEmbeddedActionCard(
                                currentReaction.actionCard as unknown as Record<string, unknown>,
                            )
                            actionCardData = unwrapped ? (unwrapped as unknown as ActionCard) : null
                        } else if (currentReaction?.id) {
                            actionCardData = hydrateActionCardById(currentReaction.id, rules as any)
                        }

                        const resourceCostsInline = currentReaction
                            ? getReactionResourceCostsForInlineRow(
                                  currentReaction as unknown as Record<string, unknown>,
                                  actionCardData ? (actionCardData as unknown as Record<string, unknown>) : null,
                              )
                            : null

                        return (
                            <div key={slotIndex}
                                 className="p-4 rounded-lg border bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/50 space-y-3">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline"
                                                className="w-full justify-between bg-background border-orange-300 dark:border-orange-700/50 text-sm font-bold h-10">
                                            <span>{currentReaction?.name || "-- Select Reaction --"}</span>
                                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-[250px]">
                                        <DropdownMenuItem onClick={() => onSelectReaction(slotIndex, "")}
                                                          className="italic text-muted-foreground">
                                            No Selection
                                        </DropdownMenuItem>
                                        {knownReactions.map((rx) => {
                                            // const rule = knownReactions.find(r => r.id === rx.id);
                                            const isDisabled = rx.slotIndex >= 0 && rx.slotIndex !== slotIndex;
                                            return (
                                                <DropdownMenuItem key={rx.id}
                                                                  onClick={() => onSelectReaction(slotIndex, rx.id)}
                                                                  disabled={isDisabled}>
                                                    {rx?.name || "Unknown Reaction"}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {currentReaction && (
                                    <div className="space-y-2 border-t border-orange-200 dark:border-orange-800 pt-2">
                                        {/* CHARGE PIPS */}
                                        {showChargePips && currentReaction ? (
                                            <ChargePips
                                                className="bg-white/40 dark:bg-black/20 p-2 rounded border border-orange-200 dark:border-orange-800"
                                                maxCharges={maxCharges}
                                                currentCharges={currentCharges}
                                                label={
                                                    fixedMax != null
                                                        ? "Charges"
                                                        : statKey
                                                          ? `${statKey} Charges`
                                                          : "Charges"
                                                }
                                                onChange={(newVal) =>
                                                    onUpdateReactionCharges(currentReaction.id, newVal)
                                                }
                                            />
                                        ) : null}
                                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700/40 whitespace-pre-line">
                                            Trigger: {currentReaction.trigger}
                                        </p>
                                        {resourceCostsInline ? (
                                            <ReactionResourceCostBadges
                                                className="px-2"
                                                costs={resourceCostsInline}
                                                actionCostBudget={actionCostBudget}
                                                onSpendActionCost={onSpendActionCost}
                                            />
                                        ) : null}
                                        <p className="text-base text-foreground/80 leading-relaxed italic whitespace-pre-line">
                                            {currentReaction.description || "No description available."}
                                        </p>
                                        {/* --- ACTION CARD INTEGRATION --- */}
                                        {actionCardData && (
                                            <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-orange-800/50 dark:text-orange-400/50 mb-2 ml-1">
                                                </div>
                                                <ActionCardComponent
                                                    action={actionCardData}
                                                    attributes={attributes as any}
                                                    forceCollapsed={false}
                                                    disabled={reactionChargesDepleted}
                                                    actionCostBudget={actionCostBudget}
                                                    onSpendActionCost={onSpendActionCost}
                                                    currentWeapon={currentWeapon}
                                                    offhandWeapon={offhandWeapon}
                                                    combatRuleContext={combatRuleContext}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}
