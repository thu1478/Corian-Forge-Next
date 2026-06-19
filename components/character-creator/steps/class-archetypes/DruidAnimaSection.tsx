"use client"

import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { DruidAnimaSlot } from "@/logic/creatures/druid-anima"

type CreatureTemplates = Record<string, { name?: string } | undefined>

export function DruidAnimaSection({
    slots,
    catalogIdsBySlot,
    selectedTemplateIds,
    creatureTemplates,
    hasCatalog,
    onChange,
}: {
    slots: DruidAnimaSlot[]
    catalogIdsBySlot: string[][]
    selectedTemplateIds: string[]
    creatureTemplates: CreatureTemplates
    hasCatalog: boolean
    onChange?: (templateIds: string[]) => void
}) {
    if (slots.length === 0) return null

    return (
        <section className="rounded-2xl border border-border bg-card/80 p-6 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground">
                Anima forms
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
                Choose your Anima forms here. Druid level 3 grants two level 2-or-lower forms; Druid level 5
                adds one level 4-or-lower form. These forms appear in the creature list and can be activated
                from the sheet.
            </p>
            {!hasCatalog ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                    No Anima creature templates are available yet. Add future bestiary templates with the{" "}
                    <span className="font-mono text-xs">Anima</span> tag and level metadata to populate these
                    slots.
                </p>
            ) : (
                <div className="space-y-4">
                    {slots.map((slot, i) => {
                        const catalog = catalogIdsBySlot[i] ?? []
                        const current = selectedTemplateIds[slot.slotIndex] ?? ""
                        return (
                            <div key={slot.slotIndex} className="space-y-1.5 max-w-md">
                                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                    Slot {slot.slotIndex + 1} (level {slot.maxCatalogLevel} or lower)
                                </Label>
                                <Select
                                    value={current || undefined}
                                    disabled={catalog.length === 0}
                                    onValueChange={(v) => {
                                        if (!onChange) return
                                        const next = [...selectedTemplateIds]
                                        while (next.length < slots.length) next.push("")
                                        for (let j = 0; j < next.length; j++) {
                                            if (j !== slot.slotIndex && String(next[j] ?? "").trim() === v) {
                                                next[j] = ""
                                            }
                                        }
                                        next[slot.slotIndex] = v
                                        onChange(next)
                                    }}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder={catalog.length ? "Select Anima..." : "No forms"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {catalog
                                            .filter(
                                                (tid) =>
                                                    !selectedTemplateIds.some(
                                                        (raw, idx) =>
                                                            idx !== slot.slotIndex &&
                                                            String(raw ?? "").trim() === tid
                                                    ) || current === tid
                                            )
                                            .map((tid) => (
                                                <SelectItem key={tid} value={tid}>
                                                    {creatureTemplates[tid]?.name ?? tid}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
