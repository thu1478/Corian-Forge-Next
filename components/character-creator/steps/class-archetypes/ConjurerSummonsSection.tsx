"use client"

import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { isConjurerSummonTakenOnOtherSlot } from "@/components/character-creator/logic/class-selection-helpers"

type CreatureTemplates = Record<string, { name?: string } | undefined>

export function ConjurerSummonsSection({
    slotCount,
    schoolTag,
    mastery,
    catalogIdsBySlot,
    summonTemplateIds,
    creatureTemplates,
    onChange,
}: {
    slotCount: number
    schoolTag: string | null
    mastery: number
    catalogIdsBySlot: string[][]
    summonTemplateIds: string[]
    creatureTemplates: CreatureTemplates
    onChange?: (templateIds: string[]) => void
}) {
    if (slotCount <= 0) return null

    return (
        <section className="mt-16 rounded-2xl border border-border bg-card/80 p-6 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                Conjurer summons
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
                Choose one summon or minion per slot here (not on the character sheet). Slots 1–2 use rank-1
                (level 2) creatures only; each creature can fill only one slot. Summon Mastery{" "}
                <span className="font-mono font-semibold text-foreground">{mastery}</span>
                {mastery >= 2
                    ? " — slot 3 also lists level 4 creatures (Great Summoner at Conjurer 5+)."
                    : " — tier 4 unlocks on slot 3 with Great Summoner once class level meets that passive."}
            </p>
            {!schoolTag ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    Select <strong>Golemancy</strong> or <strong>Necromancy</strong> on the Summoner passive
                    above, then assign your creatures.
                </p>
            ) : (
                <div className="space-y-4">
                    {Array.from({ length: slotCount }, (_, i) => (
                        <div key={i} className="space-y-1.5 max-w-md">
                            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                Slot {i + 1} ({schoolTag === "geomancy" ? "Geomancy" : "Necromancy"})
                            </Label>
                            <Select
                                value={summonTemplateIds[i]?.trim() || undefined}
                                onValueChange={(v) => {
                                    if (!onChange) return
                                    const next = [...summonTemplateIds]
                                    while (next.length < slotCount) next.push("")
                                    for (let j = 0; j < slotCount; j++) {
                                        if (j !== i && String(next[j] ?? "").trim() === v) next[j] = ""
                                    }
                                    next[i] = v
                                    onChange(next)
                                }}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue placeholder="Select creature…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(catalogIdsBySlot[i] ?? [])
                                        .filter(
                                            (tid) =>
                                                !isConjurerSummonTakenOnOtherSlot(
                                                    summonTemplateIds,
                                                    i,
                                                    tid
                                                ) ||
                                                String(summonTemplateIds[i] ?? "").trim() === tid
                                        )
                                        .map((tid) => (
                                            <SelectItem key={tid} value={tid}>
                                                {creatureTemplates[tid]?.name ?? tid}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
