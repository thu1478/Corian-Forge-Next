"use client"

import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import { hydrateActionCardById } from "@/lib/action-hydrate"
import rulesData from "@/lib/rules.json"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    FAIRY_ACTIONS_BY_TEMPLATE,
    FAIRY_GREATER_TO_LESSER,
    FAIRY_LESSER_TEMPLATE_IDS,
    changeFairyUpgradeTargetSlot,
    getFairySlot,
    isFairyGreaterTemplate,
    isFairyLesserTemplate,
    isFairySpellAllowedForContractSlot,
    isLesserFairyTemplateAllowedAtSlot,
    resolveUpgradedFairySlotIndex,
    setFairySlotAt,
    type FairyTamerContractsSave,
} from "@/lib/fairy-tamer"

type CreatorAttributes = {
    might: number
    dexterity: number
    reason: number
    willpower: number
    presence: number
}

export function FairyTamerContractsSection({
    contracts,
    ftLevel,
    creatureTemplates,
    attributes,
    onChange,
    onToggleFairySpell,
    isFairySpellSelected,
    canSelectFairySpell,
}: {
    contracts: FairyTamerContractsSave
    ftLevel: number
    creatureTemplates: Record<string, { name?: string }>
    attributes: CreatorAttributes
    onChange: (next: FairyTamerContractsSave) => void
    onToggleFairySpell: (cardId: string, slot: 0 | 1 | 2 | 3) => void
    isFairySpellSelected: (cardId: string, slot: 0 | 1 | 2 | 3) => boolean
    canSelectFairySpell: (cardId: string, slot: 0 | 1 | 2 | 3) => boolean
}) {
    const patchSlot = (idx: 0 | 1 | 2 | 3, slot: { templateId: string; actionCardIds: string[] } | null) => {
        onChange(setFairySlotAt(contracts, idx, slot))
    }

    const spellPairForTemplate = (templateId: string): readonly [string, string] | undefined =>
        FAIRY_ACTIONS_BY_TEMPLATE[templateId]

    const renderSpellPickCard = (
        aid: string,
        slotIdx: 0 | 1 | 2 | 3,
        roleLabel: string
    ) => {
        const ac = hydrateActionCardById(aid, rulesData as any)
        const selected = isFairySpellSelected(aid, slotIdx)
        const inTemplate = isFairySpellAllowedForContractSlot(contracts, slotIdx, aid)
        const allowed = selected || (inTemplate && canSelectFairySpell(aid, slotIdx))
        return (
            <div
                key={aid}
                role="button"
                tabIndex={allowed ? 0 : -1}
                aria-disabled={!allowed}
                aria-pressed={selected}
                onClick={() => {
                    if (allowed) onToggleFairySpell(aid, slotIdx)
                }}
                onKeyDown={(e) => {
                    if (!allowed) return
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onToggleFairySpell(aid, slotIdx)
                    }
                }}
                className={cn(
                    "min-w-0 rounded-xl border-2 bg-card/60 overflow-hidden shadow-sm text-left w-full transition-[box-shadow,border-color,opacity]",
                    selected
                        ? "border-primary ring-2 ring-primary/80 ring-offset-2 ring-offset-background"
                        : "border-border ring-1 ring-emerald-500/15",
                    !allowed && "opacity-45 cursor-not-allowed",
                    allowed && "cursor-pointer"
                )}
            >
                <div className="px-3 py-2 border-b border-border/70 bg-muted/40 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {roleLabel}
                        {selected ? (
                            <span className="text-primary ml-1 normal-case">— selected (class XP)</span>
                        ) : null}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/90">{aid}</span>
                </div>
                <div className="p-2 max-h-[min(70vh,520px)] overflow-y-auto pointer-events-none">
                    {ac ? (
                        <ActionCardComponent
                            action={ac}
                            attributes={attributes}
                            currentWeapon={null}
                            offhandWeapon={null}
                            forceCollapsed={false}
                            powerRollDisplayMode="simple"
                            defaultPowerRollExpanded={true}
                        />
                    ) : (
                        <p className="text-sm text-destructive p-3">Missing action card in rules: {aid}</p>
                    )}
                </div>
            </div>
        )
    }

    const renderFairyActionCards = (templateId: string, slotIdx: 0 | 1 | 2 | 3) => {
        const pair = spellPairForTemplate(templateId)
        if (!pair) return null
        const [a, b] = pair
        return (
            <div className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                    Each contract spell costs <strong className="text-foreground">one Fairy Tamer class XP pick</strong>,
                    same budget as your other class actions. Click a card to take or clear that spell. Preview AP, Focus,
                    MP, range, tags, and power rolls below—these are the cards you use when this assistant is deployed.
                </p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                    {renderSpellPickCard(a, slotIdx, "Contract spell 1")}
                    {renderSpellPickCard(b, slotIdx, "Contract spell 2")}
                </div>
            </div>
        )
    }

    const renderUpgradedSlotCombinedSpells = (
        greaterTid: string,
        lesserTid: string,
        slotIdx: 0 | 1 | 2 | 3
    ) => {
        const lesserPair = spellPairForTemplate(lesserTid)
        const greaterPair = spellPairForTemplate(greaterTid)
        if (!lesserPair || !greaterPair) return null
        return (
            <div className="mt-4 space-y-6">
                <p className="text-xs leading-relaxed text-muted-foreground">
                    After upgrading, you keep your <strong className="text-foreground">lesser fairy&apos;s spells</strong>{" "}
                    (still selected if you already bought them) and gain two{" "}
                    <strong className="text-foreground">greater fairy spells</strong> to buy with class XP. Each greater
                    spell needs a <strong className="text-foreground">tier 5 or higher</strong> packet (you only get one
                    tier-5 pick at Fairy Tamer 5—take the second greater spell at level 6 or above).
                </p>
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Lesser fairy — {creatureTemplates[lesserTid]?.name ?? lesserTid} (kept)
                    </p>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        {renderSpellPickCard(lesserPair[0], slotIdx, "Lesser spell 1")}
                        {renderSpellPickCard(lesserPair[1], slotIdx, "Lesser spell 2")}
                    </div>
                </div>
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                        Greater fairy — {creatureTemplates[greaterTid]?.name ?? greaterTid} (new)
                    </p>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                        {renderSpellPickCard(greaterPair[0], slotIdx, "Greater spell 1")}
                        {renderSpellPickCard(greaterPair[1], slotIdx, "Greater spell 2")}
                    </div>
                </div>
            </div>
        )
    }

    const renderLesserSlot = (idx: 0 | 1 | 2 | 3, title: string, lockedGreater: boolean) => {
        const slot = getFairySlot(contracts, idx)
        const tid = slot?.templateId ?? ""
        const lesserTidForUpgradeRow =
            tid && isFairyGreaterTemplate(tid) ? FAIRY_GREATER_TO_LESSER[tid] ?? tid : tid
        return (
            <div key={idx} className="rounded-xl border border-border/80 bg-background/40 p-4 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</Label>
                {lockedGreater && slot && isFairyGreaterTemplate(slot.templateId) ? (
                    <Select value={tid} disabled>
                        <SelectTrigger className="h-10 text-sm opacity-100">
                            <SelectValue aria-label="Lesser fairy being upgraded (contract becomes greater)">
                                {creatureTemplates[lesserTidForUpgradeRow]?.name ?? lesserTidForUpgradeRow}
                                <span className="text-muted-foreground font-normal">
                                    {" "}
                                    (upgrading — lesser spells stay; add greater spells below)
                                </span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={tid}>
                                {creatureTemplates[lesserTidForUpgradeRow]?.name ?? lesserTidForUpgradeRow}{" "}
                                <span className="text-muted-foreground">→ {creatureTemplates[tid]?.name ?? tid}</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                ) : (
                    <Select
                        value={tid || undefined}
                        onValueChange={(v) => {
                            patchSlot(idx, {
                                templateId: v,
                                actionCardIds: [],
                            })
                        }}
                    >
                        <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Lesser fairy…" />
                        </SelectTrigger>
                        <SelectContent>
                            {FAIRY_LESSER_TEMPLATE_IDS.map((id) => {
                                const keepCurrent = id === tid
                                const allowed =
                                    keepCurrent || isLesserFairyTemplateAllowedAtSlot(contracts, idx, id)
                                if (!allowed) return null
                                return (
                                    <SelectItem key={id} value={id}>
                                        {creatureTemplates[id]?.name ?? id}
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                )}
                {tid ? (
                    <div key={`fairy-contract-spells-${idx}-${tid}`} className="space-y-2">
                        {lockedGreater && lesserTidForUpgradeRow && isFairyGreaterTemplate(tid)
                            ? renderUpgradedSlotCombinedSpells(tid, lesserTidForUpgradeRow, idx)
                            : renderFairyActionCards(tid, idx)}
                    </div>
                ) : null}
            </div>
        )
    }

    const resolvedUpgradeSlot = resolveUpgradedFairySlotIndex(contracts)
    const lockedGreater = (idx: 0 | 1 | 2) =>
        ftLevel >= 5 &&
        contracts.level5Mode === "upgrade" &&
        resolvedUpgradeSlot === idx &&
        Boolean(
            getFairySlot(contracts, idx)?.templateId &&
                isFairyGreaterTemplate(getFairySlot(contracts, idx)!.templateId)
        )

    return (
        <section className="mt-16 rounded-2xl border border-border bg-card/80 p-6 space-y-6">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-foreground">Fairy contracts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
                At Fairy Tamer levels 1, 2, and 3, contract one lesser fairy each (class XP). You cannot contract two
                fairies of the same element (e.g. Sylph and Flugel are both air—only one air contract across your slots).
                Each fairy has two contract spells; taking a spell spends a Fairy Tamer class XP pick like any other
                class action. At level 5, either add a fourth lesser whose element is still free, or upgrade one lesser
                to its greater counterpart (same element in the bestiary). Your lesser spells stay; add that greater
                fairy&apos;s two spells with class XP.
            </p>
            <div className="space-y-4">
                {ftLevel >= 1 ? renderLesserSlot(0, "Level 1 — lesser fairy", lockedGreater(0)) : null}
                {ftLevel >= 2 ? renderLesserSlot(1, "Level 2 — lesser fairy", lockedGreater(1)) : null}
                {ftLevel >= 3 ? renderLesserSlot(2, "Level 3 — lesser fairy", lockedGreater(2)) : null}
            </div>

            {ftLevel >= 5 ? (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Level 5 — pick one</p>
                    <label className="flex gap-2 items-start text-sm cursor-pointer">
                        <input
                            type="radio"
                            name="ft-l5"
                            className="mt-1"
                            checked={contracts.level5Mode === "fourthLesser"}
                            onChange={() => {
                                let next: FairyTamerContractsSave = {
                                    ...contracts,
                                    level5Mode: "fourthLesser",
                                    upgradedSlotIndex: null,
                                }
                                if (contracts.level5Mode === "upgrade" && contracts.upgradedSlotIndex != null) {
                                    const i = contracts.upgradedSlotIndex
                                    const s = getFairySlot(contracts, i)
                                    if (s && isFairyGreaterTemplate(s.templateId)) {
                                        const lesser = FAIRY_GREATER_TO_LESSER[s.templateId]
                                        if (lesser)
                                            next = setFairySlotAt(next, i, {
                                                templateId: lesser,
                                                actionCardIds: [],
                                            })
                                    }
                                }
                                onChange(next)
                            }}
                        />
                        <span>Contract a fourth lesser fairy</span>
                    </label>
                    <label className="flex gap-2 items-start text-sm cursor-pointer">
                        <input
                            type="radio"
                            name="ft-l5"
                            className="mt-1"
                            checked={contracts.level5Mode === "upgrade"}
                            onChange={() => {
                                onChange(
                                    setFairySlotAt(
                                        { ...contracts, level5Mode: "upgrade", upgradedSlotIndex: null },
                                        3,
                                        null
                                    )
                                )
                            }}
                        />
                        <span>Upgrade one lesser fairy you already have to its greater equivalent</span>
                    </label>

                    {contracts.level5Mode === "upgrade" ? (
                        <div className="space-y-2 max-w-md">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">
                                Slot to upgrade
                            </Label>
                            <Select
                                value={
                                    resolvedUpgradeSlot != null ? String(resolvedUpgradeSlot) : undefined
                                }
                                onValueChange={(v) =>
                                    onChange(changeFairyUpgradeTargetSlot(contracts, Number(v) as 0 | 1 | 2))
                                }
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue placeholder="Which fairy to upgrade?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {([0, 1, 2] as const)
                                        .filter((i) => {
                                            if (i === 1 && ftLevel < 2) return false
                                            if (i === 2 && ftLevel < 3) return false
                                            const s = getFairySlot(contracts, i)
                                            if (!s?.templateId) return false
                                            if (isFairyLesserTemplate(s.templateId)) return true
                                            return Boolean(
                                                contracts.level5Mode === "upgrade" &&
                                                    resolvedUpgradeSlot === i &&
                                                    isFairyGreaterTemplate(s.templateId)
                                            )
                                        })
                                        .map((i) => {
                                            const s = getFairySlot(contracts, i)!
                                            const isGreaterLocked =
                                                contracts.level5Mode === "upgrade" &&
                                                resolvedUpgradeSlot === i &&
                                                isFairyGreaterTemplate(s.templateId)
                                            const labelTid =
                                                isGreaterLocked && isFairyGreaterTemplate(s.templateId)
                                                    ? FAIRY_GREATER_TO_LESSER[s.templateId] ?? s.templateId
                                                    : s.templateId
                                            return (
                                                <SelectItem key={i} value={String(i)}>
                                                    Slot {i + 1}: {creatureTemplates[labelTid]?.name ?? labelTid}
                                                    {isGreaterLocked ? " (upgrading)" : ""}
                                                </SelectItem>
                                            )
                                        })}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    {contracts.level5Mode === "fourthLesser"
                        ? renderLesserSlot(3, "Level 5 — fourth lesser fairy", false)
                        : null}
                </div>
            ) : null}
        </section>
    )
}
