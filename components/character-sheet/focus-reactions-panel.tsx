"use client"

import {FocusFeature, Reaction} from "@/lib/character-data"
import {cn} from "@/lib/utils"
import {Target, Zap, Lock, Unlock, ChevronDown} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";

interface FocusReactionsPanelProps {
    rules: Record<string, any>;
    knownFocusFeats: FocusFeature[]
    onSelectFeat: (index: number, newName: string) => void;
    reactions: Reaction[]
    onToggleReaction?: (id: string) => void
}

export function FocusReactionsPanel({
                                        rules,
                                        knownFocusFeats,
                                        onSelectFeat,
                                        reactions,
                                        onToggleReaction
                                    }: FocusReactionsPanelProps) {
    // Get the default focus feat start of turn
    const globalFocus = rules?.system?.defaults?.focusFeat

    // Get all the available focus feats in the rules
    const availableFeats = Object.values(rules?.classes || {})
        .map((c: any) => c.focusFeat)
        .filter(Boolean);
    // Get the character's equipped feats
    const equippedReactions = reactions.filter(r => r.equipped)

    return (
        <div className="space-y-4">
            {/* Focus Features */}
            <div className="p-4 bg-card rounded-xl border border-border">
                <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5"/>
                    Focus Features
                    <span className="text-sm text-muted-foreground font-normal">({knownFocusFeats.length}/3)</span>
                </h3>

                {/* --- SLOT 0: SYSTEM DEFAULT (Fixed) --- */}
                {
                    <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 opacity-90">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-foreground text-base">{globalFocus?.name}</span>
                            <Lock className="w-3 h-3 text-blue-400/50"/>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed italic">{globalFocus?.description}</p>
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
                            {(currentFeat?.slotIndex ?? -1 ) >= 0 && (
                                <div
                                    className="p-4 rounded-lg border transition-all bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/50">
                                    <p className="text-base text-foreground/80 leading-relaxed">
                                        {currentFeatRule?.description || "No description available."}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/*<div className="space-y-3">*/}
                {/*    {focusFeatures.map((feature) => {*/}
                {/*        const focusFeats = [rules?.system?.defaults?.focusFeat, ...rules?.classes?.[feature.classSrc]?.focusFeat];*/}

                {/*        const featName = focusFeats?.name;*/}
                {/*        const description = focusFeats?.description;*/}

                {/*        return (*/}
                {/*        <div*/}
                {/*            key={feature.name}*/}
                {/*            className={cn(*/}
                {/*                "p-4 rounded-lg border transition-all",*/}
                {/*                feature.equipped*/}
                {/*                    ? "bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700/50"*/}
                {/*                    : "bg-muted/10 border-border/50 opacity-50"*/}
                {/*            )}*/}
                {/*        >*/}
                {/*            <div className="flex items-start justify-between gap-2">*/}
                {/*                <div className="flex-1">*/}
                {/*                    <div className="flex items-center gap-2 mb-2">*/}
                {/*                        <span className="font-bold text-foreground text-base">{featName}</span>*/}
                {/*                        {feature.isDefault && (*/}
                {/*                            <span*/}
                {/*                                className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase font-medium">*/}
                {/*        Default*/}
                {/*      </span>*/}
                {/*                        )}*/}
                {/*                    </div>*/}
                {/*                    <p className="text-base text-foreground/80 leading-relaxed">{description}</p>*/}
                {/*                </div>*/}
                {/*                {!feature.isDefault && onToggleFocusFeature && (*/}
                {/*                    <button*/}
                {/*                        onClick={() => onToggleFocusFeature(feature.name)}*/}
                {/*                        className={cn(*/}
                {/*                            "p-2 rounded-lg transition-colors",*/}
                {/*                            feature.equipped*/}
                {/*                                ? "bg-orange-200 dark:bg-orange-600/30 text-orange-700 dark:text-orange-400 hover:bg-orange-300 dark:hover:bg-orange-600/50"*/}
                {/*                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"*/}
                {/*                        )}*/}
                {/*                    >*/}
                {/*                        {feature.equipped ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}*/}
                {/*                    </button>*/}
                {/*                )}*/}
                {/*            </div>*/}
                {/*        </div>*/}
                {/*        )})}*/}
                {/*</div>*/}
            </div>

            {/* Reactions */}
            <div className="p-4 bg-card rounded-xl border border-border">
                <h3 className="text-base font-semibold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5"/>
                    Reactions
                    <span className="text-sm text-muted-foreground font-normal">({equippedReactions.length}/3)</span>
                </h3>

                <div className="space-y-3">
                    {reactions.map((reaction) => (
                        <div
                            key={reaction.id}
                            className={cn(
                                "p-4 rounded-lg border transition-all",
                                reaction.equipped
                                    ? "bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50"
                                    : "bg-muted/10 border-border/50 opacity-50"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-foreground text-base">{reaction.name}</span>
                                        {reaction.isDefault && (
                                            <span
                                                className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase font-medium">
                        Default
                      </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700/40">
                                        Trigger: {reaction.trigger}
                                    </p>
                                    <p className="text-base text-foreground/80 leading-relaxed">{reaction.effect}</p>
                                </div>
                                {!reaction.isDefault && onToggleReaction && (
                                    <button
                                        onClick={() => onToggleReaction(reaction.id)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            reaction.equipped
                                                ? "bg-amber-200 dark:bg-amber-600/30 text-amber-700 dark:text-amber-400 hover:bg-amber-300 dark:hover:bg-amber-600/50"
                                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        {reaction.equipped ? <Unlock className="w-4 h-4"/> :
                                            <Lock className="w-4 h-4"/>}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
