"use client"

import { useMemo } from "react"
import { Heart, Plus, Trash2 } from "lucide-react"
import type { BondEmotionType, BondTarget } from "@/lib/rules"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    bondLevelForTarget,
    canAppendEmotionToTarget,
    canReplaceEmotionInTarget,
    isEmotionTypeDisabledForTarget,
    newBondId,
    normalizeBondRules,
} from "@/logic/character/bonds"

interface BondsPanelProps {
    bondTargets: BondTarget[]
    /** `rules.system` — expects `bonds` config from rules.json. */
    rulesSystem: unknown
    onBondTargetsChange: (bondTargets: BondTarget[]) => void
}

function BondLevelHeart({level}: {level: number}) {
    const capped = Math.min(3, level)
    return (
        <div
            className="relative flex h-11 w-11 shrink-0 items-center justify-center"
            title={`Bond level with this target: ${capped}`}
        >
            <Heart
                className="h-11 w-11 fill-rose-500/25 text-rose-500 dark:fill-rose-400/20 dark:text-rose-400"
                strokeWidth={1.5}
            />
            <span className="absolute text-sm font-bold tabular-nums text-foreground">{capped}</span>
        </div>
    )
}

export function BondsPanel({bondTargets, rulesSystem, onBondTargetsChange}: BondsPanelProps) {
    const rules = useMemo(() => normalizeBondRules(rulesSystem), [rulesSystem])

    const setTargets = (next: BondTarget[]) => {
        onBondTargetsChange(next.slice(0, rules.maxTargets))
    }

    const updateTargetName = (targetId: string, name: string) => {
        setTargets(bondTargets.map((t) => (t.id === targetId ? {...t, name} : t)))
    }

    const removeTarget = (targetId: string) => {
        setTargets(bondTargets.filter((t) => t.id !== targetId))
    }

    const addTarget = () => {
        if (bondTargets.length >= rules.maxTargets) return
        setTargets([
            ...bondTargets,
            {id: newBondId(), name: "", emotions: []},
        ])
    }

    const addEmotionToTarget = (targetId: string) => {
        const target = bondTargets.find((t) => t.id === targetId)
        if (!target) return
        if (target.emotions.length >= rules.maxEmotionsPerTarget) return
        const pickType = rules.allTypeIds.find((ty) =>
            canAppendEmotionToTarget(target.emotions, ty as BondEmotionType, rules)
        )
        if (!pickType) return
        setTargets(
            bondTargets.map((t) =>
                t.id === targetId
                    ? {
                          ...t,
                          emotions: [
                              ...t.emotions,
                              {id: newBondId(), type: pickType as BondEmotionType},
                          ],
                      }
                    : t
            )
        )
    }

    const updateEmotionType = (targetId: string, emotionId: string, type: BondEmotionType) => {
        const target = bondTargets.find((t) => t.id === targetId)
        if (!target) return
        const nextEmotions = target.emotions.map((e) => (e.id === emotionId ? {...e, type} : e))
        if (!canReplaceEmotionInTarget(target.emotions, emotionId, type, rules)) return
        setTargets(
            bondTargets.map((t) => (t.id === targetId ? {...t, emotions: nextEmotions} : t))
        )
    }

    const removeEmotion = (targetId: string, emotionId: string) => {
        setTargets(
            bondTargets.map((t) =>
                t.id === targetId
                    ? {...t, emotions: t.emotions.filter((e) => e.id !== emotionId)}
                    : t
            )
        )
    }

    const canAddEmotionTo = (t: BondTarget) => {
        if (t.emotions.length >= rules.maxEmotionsPerTarget) return false
        return rules.allTypeIds.some((ty) =>
            canAppendEmotionToTarget(t.emotions, ty as BondEmotionType, rules)
        )
    }

    return (
        <div className="p-4 bg-card rounded-xl border border-border">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Heart className="w-5 h-5"/>
                    Bonds
                    <span className="text-sm font-normal text-muted-foreground">
                        ({bondTargets.length}/{rules.maxTargets} targets)
                    </span>
                </h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={addTarget}
                    disabled={bondTargets.length >= rules.maxTargets}
                >
                    <Plus className="h-4 w-4"/>
                    Add target
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bondTargets.map((t) => (
                    <div
                        key={t.id}
                        className="rounded-lg border border-border/60 bg-muted/5 overflow-hidden"
                    >
                        <div className="flex flex-wrap items-start gap-3 border-b border-border/50 bg-muted/15 px-3 py-2.5">
                            <BondLevelHeart level={bondLevelForTarget(t)}/>
                            <div className="min-w-0 flex-1 space-y-2">
                                <Input
                                    className="w-full"
                                    placeholder="Target name (NPC, faction, place…)"
                                    value={t.name}
                                    onChange={(e) => updateTargetName(t.id, e.target.value)}
                                    aria-label="Bond target name"
                                />
                                <p className="text-xs leading-snug text-muted-foreground">
                                    Up to {rules.maxEmotionsPerTarget} emotion types per target; each type once;
                                    opposites from the same pair cannot both be chosen for this target.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeTarget(t.id)}
                                aria-label="Remove bond target"
                            >
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </div>

                        <div className="divide-y divide-border/40">
                            {t.emotions.map((em) => (
                                <div
                                    key={em.id}
                                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-end sm:gap-2"
                                >
                                    <Select
                                        value={em.type}
                                        onValueChange={(v) =>
                                            updateEmotionType(t.id, em.id, v as BondEmotionType)
                                        }
                                    >
                                        <SelectTrigger
                                            className="w-full sm:ml-auto sm:w-[12rem]"
                                            size="sm"
                                            aria-label="Bond emotion type"
                                        >
                                            <SelectValue placeholder="Emotion type"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rules.allTypeIds.map((tid) => {
                                                const disabled = isEmotionTypeDisabledForTarget(
                                                    tid,
                                                    em.id,
                                                    em.type,
                                                    t.emotions,
                                                    rules
                                                )
                                                return (
                                                    <SelectItem
                                                        key={tid}
                                                        value={tid}
                                                        disabled={disabled}
                                                    >
                                                        {rules.labels[tid] ?? tid}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 self-end text-muted-foreground hover:text-destructive sm:self-center"
                                        onClick={() => removeEmotion(t.id, em.id)}
                                        aria-label="Remove emotion"
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-border/50 p-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="w-full gap-1.5"
                                onClick={() => addEmotionToTarget(t.id)}
                                disabled={!canAddEmotionTo(t)}
                            >
                                <Plus className="h-4 w-4"/>
                                Add emotion to this target
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {bondTargets.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground text-center py-2">
                    No bond targets yet. Add up to {rules.maxTargets} targets, then add emotions to each.
                </p>
            )}

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Inspiration & bond levels
                </h4>
                <ul className="list-disc space-y-1.5 pl-4 marker:text-muted-foreground/80">
                    <li>
                        <span className="font-medium text-foreground">Level 0</span> (no bond types with this
                        target) — narrative help when you spend Inspiration on the bond.
                    </li>
                    <li>
                        <span className="font-medium text-foreground">Level 1</span> (one bond type) — gain a
                        boon on a power roll.
                    </li>
                    <li>
                        <span className="font-medium text-foreground">Level 2</span> (two bond types) — this is
                        the limit for traits; temporarily increase an attribute modifier when applying potencies;
                        critical damage.
                    </li>
                    <li>
                        <span className="font-medium text-foreground">Level 3</span> (three bond types) — this
                        is the limit for bonds; reroll a power roll; add or erase up to two sections on a clock (DM
                        discretion).
                    </li>
                </ul>
            </div>
        </div>
    )
}
