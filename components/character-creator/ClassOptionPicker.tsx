"use client"

import type { ClassOptionConfig, ClassOptionEntry } from "@/lib/class-options"
import { getClassOptionPassiveEntries, getClassOptionPreviewStats } from "@/lib/class-options"

type ClassOptionPickerProps = {
    config: ClassOptionConfig
    rulesData: { classes?: Record<string, unknown> }
    label: string
    options: ClassOptionEntry[]
    value: string | null
    onChange: (value: string | null) => void
    previewLevel?: number
    subLabel?: string
    subValue?: "swimming" | "climbing" | null
    onSubChange?: (value: "swimming" | "climbing" | null) => void
    showSubWhen?: (optionId: string | null) => boolean
}

export function ClassOptionPicker({
    config,
    rulesData,
    label,
    options,
    value,
    onChange,
    previewLevel = 3,
    subLabel,
    subValue = null,
    onSubChange,
    showSubWhen,
}: ClassOptionPickerProps) {
    const selected = options.find((o) => o.id === value) ?? null
    const l3Passives =
        value && previewLevel >= 3
            ? getClassOptionPassiveEntries(rulesData, config.classId, config.optionsKey, value)
            : []

    const previewStats = selected ? getClassOptionPreviewStats(selected) : []
    const showSub = showSubWhen?.(value) ?? false

    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                {label}
            </label>
            <select
                className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value ? e.target.value : null)}
            >
                <option value="">— Select —</option>
                {options.map((d) => (
                    <option key={d.id} value={d.id}>
                        {d.name}
                    </option>
                ))}
            </select>
            {selected?.description ? (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{selected.description}</p>
            ) : null}
            {previewStats.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {previewStats.map((line) => (
                        <span
                            key={line}
                            className="text-[10px] font-semibold rounded-md bg-muted/60 px-2 py-0.5 border border-border"
                        >
                            {line}
                        </span>
                    ))}
                </div>
            ) : null}
            {showSub && onSubChange ? (
                <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                        {subLabel ?? "Sub-choice"}
                    </label>
                    <select
                        className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium"
                        value={subValue ?? ""}
                        onChange={(e) => {
                            const v = e.target.value
                            onSubChange(v === "swimming" || v === "climbing" ? v : null)
                        }}
                    >
                        <option value="">— Choose —</option>
                        <option value="swimming">Swimming</option>
                        <option value="climbing">Climbing</option>
                    </select>
                </div>
            ) : null}
            {l3Passives.length > 0 ? (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Level {previewLevel} option passive
                    </p>
                    {l3Passives.map((p) => (
                        <div key={p.slug}>
                            <p className="text-sm font-bold text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                {p.description}
                            </p>
                        </div>
                    ))}
                </div>
            ) : value && previewLevel >= 3 ? (
                <p className="text-xs text-muted-foreground italic">No passive data for this option in rules.</p>
            ) : null}
        </div>
    )
}
