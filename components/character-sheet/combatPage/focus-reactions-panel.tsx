"use client"

import {getAttributeModifier} from "@/lib/character-data"
import {ChevronDown, Lock, Plus, Target, Zap} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {FocusFeature, Reaction} from "@/lib/rules";
import {
    ActionCardComponent,
    type ActionCostBudget,
    type ActionSpendResourceKind,
} from "@/components/character-sheet/combatPage/action-card-manager";
import { unwrapEmbeddedActionCard } from "@/lib/embedded-action-card";

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
                                    }: FocusReactionsPanelProps) {
    // Get the default focus feat start of turn
    const globalFocus = rules?.system?.defaults?.focusFeat
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
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-foreground text-base">{globalFocus?.name}</span>
                            <Lock className="w-3 h-3 text-blue-400/50"/>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed italic whitespace-pre-line">{globalFocus?.description}</p>
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

                        // 1. Calculate the "Live" Max based on current Attributes
                        const statKey = currentReaction?.chargeStat;
                        const hasStatCharges = statKey && statKey.trim() !== "";

                        // 2. Determine how many pips to show and fill
                        const maxCharges = hasStatCharges
                            ? Math.max(0, getAttributeModifier(attributes[statKey] || 10))
                            : 0;
                        const currentCharges = Math.min(currentReaction?.charges ?? maxCharges, maxCharges);

                        // 3. Extract action card data
                        const actionCardData = currentReaction?.actionCard
                            ? (unwrapEmbeddedActionCard(
                                  currentReaction.actionCard as Record<string, unknown>
                              ) as Record<string, unknown> | null)
                            : null;

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
                                        {hasStatCharges && (
                                            <div
                                                className="flex items-center justify-between bg-white/40 dark:bg-black/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                            <span className="text-[10px] font-bold uppercase text-orange-800 dark:text-orange-400">
                                {statKey} Charges
                            </span>
                                                <div className="flex gap-1.5">
                                                    {Array.from({length: maxCharges}).map((_, i) => {
                                                        const isFilled = i < currentCharges;
                                                        const isLastFilled = i === currentCharges - 1;

                                                        return (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => {
                                                                    // If clicking the last filled pip, decrease by 1 (toggle off)
                                                                    // Otherwise, set charges to the clicked index + 1
                                                                    const newVal = isLastFilled ? i : i + 1;
                                                                    console.log(newVal);
                                                                    onUpdateReactionCharges(currentReaction.id, newVal);
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
                                        )}
                                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700/40 whitespace-pre-line">
                                            Trigger: {currentReaction.trigger}
                                        </p>
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
                                                    actionCostBudget={actionCostBudget}
                                                    onSpendActionCost={onSpendActionCost}
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
