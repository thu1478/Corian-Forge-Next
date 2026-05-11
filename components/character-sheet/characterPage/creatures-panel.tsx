"use client"

import { useMemo, useState } from "react"
import { PawPrint, PanelRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import { hydrateActionCardById } from "@/lib/action-hydrate"
import type { CharacterStats } from "@/lib/character-data"
import { formatModifier, getAttributeModifier } from "@/lib/character-data"
import type { TraitRef } from "@/lib/baseRefs"
import type { CharacterClass } from "@/lib/rules"
import {
    type CreatureDefinition,
    type CreatureRosterEntry,
    type RulesWithBestiary,
    getCreatureTemplates,
    countDeployedFeatAssistantsAndMinions,
    countDeployedSummons,
    countDeployedConjurerMinions,
    getConjurerSummonOrMinionDeploySlotUsed,
    MAX_DEPLOYED_ASSISTANTS,
    MAX_DEPLOYED_SUMMONS,
    getActionCardIdsForCreatureEntry,
    isAssistantOrMinionKind,
    characterHasSummonerPassive,
    getConjurerSummonSchoolTag,
    resolveCreatureTraitEntries,
    getSummonMastery,
    getMaxConjurerMinionsByMastery,
    isConjurerRosterEntry,
    isCreatureDeployBlocked,
} from "@/lib/creature-roster"
import type { InventoryItem } from "@/lib/equipment-data"

function formatVulnerabilityBrief(v: { stat: string; value?: string }): string {
    const vu = v.value != null && v.value !== "" ? ` (+${v.value} VU)` : ""
    return `${v.stat}${vu}`
}

function CreatureTemplateStatStrip({ tmpl }: { tmpl: CreatureDefinition }) {
    const hasRes = tmpl.resistances && tmpl.resistances.length > 0
    const hasImm = tmpl.immunities && tmpl.immunities.length > 0
    const hasVul = tmpl.vulnerabilities && tmpl.vulnerabilities.length > 0
    const hasDef = tmpl.defense != null && Number.isFinite(tmpl.defense)
    if (!hasRes && !hasImm && !hasVul && !hasDef) return null
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-snug text-foreground/90">
            {hasRes ? (
                <span>
                    <span className="font-semibold text-muted-foreground">Res </span>
                    <span className="capitalize">{tmpl.resistances!.join(", ")}</span>
                </span>
            ) : null}
            {hasImm ? (
                <span>
                    <span className="font-semibold text-muted-foreground">Imm </span>
                    <span className="capitalize">{tmpl.immunities!.join(", ")}</span>
                </span>
            ) : null}
            {hasVul ? (
                <span>
                    <span className="font-semibold text-muted-foreground">Vul </span>
                    <span className="capitalize">
                        {tmpl.vulnerabilities!.map(formatVulnerabilityBrief).join(", ")}
                    </span>
                </span>
            ) : null}
            {hasDef ? (
                <span>
                    <span className="font-semibold text-muted-foreground">Def </span>
                    <span className="font-mono tabular-nums">{tmpl.defense}</span>
                </span>
            ) : null}
        </div>
    )
}

function OpportunityAttackNote({ tmpl }: { tmpl: CreatureDefinition }) {
    const n = tmpl.opportunityAttack
    if (n == null || !Number.isFinite(n) || n <= 0) return null
    return (
        <p className="text-[11px] text-muted-foreground">
            This creature&apos;s opportunity attack deals{" "}
            <span className="font-mono font-semibold text-foreground">{n}</span> damage.
        </p>
    )
}

export function CreaturesPanel({
    creatures,
    traits,
    classes,
    rules,
    attributes,
    currentWeapon,
    offhandWeapon,
    onPatchCreature,
}: {
    creatures: CreatureRosterEntry[]
    traits: TraitRef[]
    classes: CharacterClass[]
    rules: RulesWithBestiary & { actionCards?: Record<string, { type?: string; name?: string }> }
    attributes: CharacterStats
    currentWeapon: InventoryItem | null
    offhandWeapon: InventoryItem | null
    onPatchCreature: (id: string, patch: Partial<CreatureRosterEntry>) => void
}) {
    const templates = useMemo(() => getCreatureTemplates(rules), [rules])
    const [openId, setOpenId] = useState<string | null>(null)

    const schoolTag = useMemo(() => getConjurerSummonSchoolTag(traits, rules), [traits, rules])
    const conjurerEligible = characterHasSummonerPassive(traits, classes)
    const summonMastery = useMemo(() => getSummonMastery(traits, classes, rules), [traits, classes, rules])
    const maxConjurerMinions = getMaxConjurerMinionsByMastery(summonMastery)

    const openEntry = openId ? creatures.find((c) => c.id === openId) : null
    const openTemplate = openEntry ? templates[openEntry.templateId] : null
    const openTraitEntries = useMemo(
        () => resolveCreatureTraitEntries(rules, openTemplate?.traitRefs),
        [rules, openTemplate?.traitRefs]
    )

    if (creatures.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-foreground">
                    <PawPrint className="w-5 h-5 text-primary" />
                    Creatures
                </div>
                {conjurerEligible ? (
                    <p className="text-sm text-muted-foreground">
                        No creatures on your roster yet. Conjurer summons and minions are chosen in the{" "}
                        <strong>Character creator</strong> (Class step): one slot when you take Summoner, plus one per
                        additional Conjurer level. Re-export from the creator or edit{" "}
                        <span className="font-mono text-xs">conjurerSummonTemplateIds</span> in your save if needed.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No assistants, minions, or summons yet. Unlock them with feats (e.g. Trusty Companion) or the
                        Conjurer Summoner passive (configured in the creator).
                    </p>
                )}
                {conjurerEligible && !schoolTag ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        Choose <strong>Golemancy (Geomancy)</strong> or <strong>Necromancy</strong> on Summoner in your
                        exported traits / creator so conjurer picks apply.
                    </p>
                ) : null}
            </div>
        )
    }

    const trySetDeployed = (entry: CreatureRosterEntry, deployed: boolean) => {
        if (!deployed) {
            onPatchCreature(entry.id, { deployed: false })
            return
        }
        if (isCreatureDeployBlocked(entry, creatures, maxConjurerMinions)) return
        onPatchCreature(entry.id, { deployed: true })
    }

    const depAssistants = countDeployedFeatAssistantsAndMinions(creatures)
    const conjurerSummonMinionSlot = getConjurerSummonOrMinionDeploySlotUsed(creatures)

    return (
        <>
            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-2 font-bold text-foreground">
                    <PawPrint className="w-5 h-5 text-primary" />
                    Creatures
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    <span className="rounded-md bg-muted/60 px-2 py-1 border border-border">
                        Assistants ({depAssistants}/{MAX_DEPLOYED_ASSISTANTS})
                    </span>
                    {conjurerEligible ? (
                        <>
                            <span className="rounded-md bg-muted/60 px-2 py-1 border border-border">
                                Summons/Minions ({conjurerSummonMinionSlot}/{MAX_DEPLOYED_SUMMONS})
                            </span>
                            <span className="rounded-md bg-muted/60 px-2 py-1 border border-border">
                                Minion count {maxConjurerMinions}
                            </span>
                        </>
                    ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                    Summons track HP/MP below. A conjurer cannot have summons and conjurer minions deployed together.
                    Deployed creatures add actions on the Combat tab.
                </p>
                {conjurerEligible && !schoolTag ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        Conjurer: choose <strong>Golemancy (Geomancy)</strong> or <strong>Necromancy</strong> on your
                        Summoner passive (in exported traits / creator) so conjurer roster slots resolve.
                    </p>
                ) : null}
                {conjurerEligible && schoolTag ? (
                    <p className="text-xs text-muted-foreground">
                        Conjurer companions are assigned in the <strong>Character creator</strong> (Class step), not
                        here.
                    </p>
                ) : null}
                <div className="space-y-2">
                    {creatures.map((c) => {
                        const tmpl = templates[c.templateId]
                        const defaultName = tmpl?.name || c.templateId
                        const rest = creatures.filter((x) => x.id !== c.id)
                        const deployCapBlocked = !c.deployed && isCreatureDeployBlocked(c, creatures, maxConjurerMinions)
                        const featCapBlocked =
                            isAssistantOrMinionKind(c.kind) &&
                            !isConjurerRosterEntry(c) &&
                            !c.deployed &&
                            countDeployedFeatAssistantsAndMinions(rest) >= MAX_DEPLOYED_ASSISTANTS
                        const conjurerMinionCapBlocked =
                            isConjurerRosterEntry(c) &&
                            c.kind === "minion" &&
                            !c.deployed &&
                            (countDeployedConjurerMinions(rest) >= maxConjurerMinions ||
                                countDeployedSummons(rest) > 0)
                        const summonCapBlocked =
                            c.kind === "summon" &&
                            !c.deployed &&
                            (countDeployedSummons(rest) >= MAX_DEPLOYED_SUMMONS ||
                                countDeployedConjurerMinions(rest) > 0)

                        return (
                            <div
                                key={c.id}
                                className="rounded-lg border border-border/80 bg-background/60 p-3 space-y-2"
                            >
                                <div className="flex flex-wrap items-center gap-2 justify-between">
                                    <div className="min-w-0 space-y-1 flex-1">
                                        <Label className="text-[10px] text-muted-foreground">Name</Label>
                                        <Input
                                            className="h-8 text-xs"
                                            placeholder={defaultName}
                                            value={c.customName ?? ""}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                onPatchCreature(c.id, {
                                                    customName: v.trim() === "" ? undefined : v,
                                                })
                                            }}
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="secondary" className="text-[10px] capitalize">
                                                {c.kind}
                                            </Badge>
                                            {c.deployed ? (
                                                <Badge variant="default" className="text-[10px]">
                                                    Deployed
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => setOpenId(c.id)}
                                        >
                                            <PanelRight className="w-3.5 h-3.5" />
                                            Details
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-muted/30 dark:bg-muted/20 px-3 py-2 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <Switch
                                            id={`deploy-${c.id}`}
                                            className="h-5 w-9 border border-border/60 data-[state=unchecked]:bg-muted-foreground/30"
                                            checked={c.deployed}
                                            disabled={deployCapBlocked}
                                            onCheckedChange={(v) => trySetDeployed(c, v)}
                                        />
                                        <Label
                                            htmlFor={`deploy-${c.id}`}
                                            className="text-xs font-semibold text-foreground cursor-pointer"
                                        >
                                            Deploy to combat
                                        </Label>
                                    </div>
                                    {featCapBlocked ? (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                            Max {MAX_DEPLOYED_ASSISTANTS} feat companions deployed
                                        </span>
                                    ) : null}
                                    {conjurerMinionCapBlocked ? (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                            {countDeployedSummons(rest) > 0
                                                ? "Dismiss summons before deploying conjurer minions"
                                                : `Max ${maxConjurerMinions} conjurer minions (Summon Mastery ${summonMastery})`}
                                        </span>
                                    ) : null}
                                    {summonCapBlocked ? (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                            {countDeployedConjurerMinions(rest) > 0
                                                ? "Dismiss conjurer minions before deploying a summon"
                                                : `Max ${MAX_DEPLOYED_SUMMONS} summon deployed`}
                                        </span>
                                    ) : null}
                                    </div>
                                </div>

                                {c.kind === "summon" ? (
                                    <div className="space-y-2 pt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="space-y-0.5 min-w-0">
                                                <Label className="text-[10px] text-muted-foreground">HP</Label>
                                                <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                                                    <div className="flex gap-1 items-center shrink-0">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-xs w-[4.5rem]"
                                                            value={c.currentHp ?? ""}
                                                            onChange={(e) =>
                                                                onPatchCreature(c.id, {
                                                                    currentHp: Math.max(
                                                                        0,
                                                                        Math.floor(Number(e.target.value) || 0)
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                        <span className="text-muted-foreground text-xs">/</span>
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-xs w-[4.5rem]"
                                                            value={c.maxHp ?? ""}
                                                            onChange={(e) =>
                                                                onPatchCreature(c.id, {
                                                                    maxHp: Math.max(
                                                                        1,
                                                                        Math.floor(Number(e.target.value) || 1)
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    {tmpl ? <CreatureTemplateStatStrip tmpl={tmpl} /> : null}
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">MP</Label>
                                                <div className="flex gap-1 items-center">
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-xs w-[4.5rem]"
                                                        value={c.currentMp ?? ""}
                                                        onChange={(e) =>
                                                            onPatchCreature(c.id, {
                                                                currentMp: Math.max(
                                                                    0,
                                                                    Math.floor(Number(e.target.value) || 0)
                                                                ),
                                                            })
                                                        }
                                                    />
                                                    <span className="text-muted-foreground text-xs">/</span>
                                                    <Input
                                                        type="number"
                                                        className="h-8 text-xs w-[4.5rem]"
                                                        value={c.maxMp ?? ""}
                                                        onChange={(e) =>
                                                            onPatchCreature(c.id, {
                                                                maxMp: Math.max(
                                                                    0,
                                                                    Math.floor(Number(e.target.value) || 0)
                                                                ),
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {tmpl ? <OpportunityAttackNote tmpl={tmpl} /> : null}
                                    </div>
                                ) : tmpl?.opportunityAttack != null &&
                                  Number.isFinite(tmpl.opportunityAttack) &&
                                  tmpl.opportunityAttack > 0 ? (
                                    <OpportunityAttackNote tmpl={tmpl} />
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </div>

            <Sheet open={openId != null} onOpenChange={(o) => !o && setOpenId(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
                    {openEntry && openTemplate ? (
                        <>
                            <SheetHeader className="p-4 border-b border-border shrink-0 text-left">
                                <SheetTitle>
                                    {openEntry.customName?.trim() || openTemplate.name}
                                </SheetTitle>
                                <SheetDescription className="capitalize">
                                    {openTemplate.role}
                                    {openTemplate.creatureTypes?.length
                                        ? ` · ${openTemplate.creatureTypes.join(", ")}`
                                        : ""}
                                </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="p-4 space-y-4">
                                    {openTemplate.description ? (
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                            {openTemplate.description}
                                        </p>
                                    ) : null}

                                    <div className="space-y-1">
                                        <Label className="text-xs">Creature name</Label>
                                        <Input
                                            className="h-9"
                                            placeholder={openTemplate.name}
                                            value={openEntry.customName ?? ""}
                                            onChange={(e) => {
                                                const v = e.target.value
                                                onPatchCreature(openEntry.id, {
                                                    customName: v.trim() === "" ? undefined : v,
                                                })
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground">
                                            Leave blank to use the default name from rules.
                                        </p>
                                    </div>

                                    {openTemplate.attributes &&
                                    Object.keys(openTemplate.attributes).length > 0 ? (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                Attributes
                                            </h4>
                                            <div className="grid grid-cols-5 gap-1 text-xs">
                                                {(
                                                    ["might", "dexterity", "reason", "willpower", "presence"] as const
                                                ).map((k) => {
                                                    const raw = openTemplate.attributes?.[k]
                                                    const score =
                                                        typeof raw === "number" && Number.isFinite(raw)
                                                            ? raw
                                                            : null
                                                    const modText =
                                                        score != null
                                                            ? formatModifier(getAttributeModifier(score))
                                                            : "—"
                                                    return (
                                                        <div
                                                            key={k}
                                                            className="rounded-md bg-muted/40 px-2 py-1 text-center"
                                                        >
                                                            <div className="text-[10px] text-muted-foreground uppercase">
                                                                {k.slice(0, 3)}
                                                            </div>
                                                            <div className="font-mono font-semibold tabular-nums">
                                                                {score ?? "—"}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
                                                                {modText}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ) : null}

                                    {openTemplate.speed != null ||
                                    openTemplate.stability != null ||
                                    openTemplate.size ||
                                    (openTemplate.defense != null && Number.isFinite(openTemplate.defense)) ? (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                Profile
                                            </h4>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {openTemplate.size ? (
                                                    <Badge variant="outline">Size {openTemplate.size}</Badge>
                                                ) : null}
                                                {openTemplate.speed != null ? (
                                                    <Badge variant="outline">Speed {openTemplate.speed}</Badge>
                                                ) : null}
                                                {openTemplate.stability != null ? (
                                                    <Badge variant="outline">Stability {openTemplate.stability}</Badge>
                                                ) : null}
                                                {openTemplate.defense != null && Number.isFinite(openTemplate.defense) ? (
                                                    <Badge variant="outline">Def {openTemplate.defense}</Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}

                                    {openTemplate.resistances && openTemplate.resistances.length > 0 ? (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                                Resistances
                                            </h4>
                                            <div className="flex flex-wrap gap-1">
                                                {openTemplate.resistances.map((r) => (
                                                    <Badge key={r} variant="secondary" className="text-[10px] capitalize">
                                                        {r}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {openTemplate.immunities && openTemplate.immunities.length > 0 ? (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                                Immunities
                                            </h4>
                                            <div className="flex flex-wrap gap-1">
                                                {openTemplate.immunities.map((r) => (
                                                    <Badge key={r} variant="outline" className="text-[10px] capitalize">
                                                        {r}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {openTemplate.vulnerabilities && openTemplate.vulnerabilities.length > 0 ? (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                                Vulnerabilities
                                            </h4>
                                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                                {openTemplate.vulnerabilities.map((v, i) => (
                                                    <li key={`${v.stat}-${i}`} className="capitalize">
                                                        {v.stat}
                                                        {v.value != null && v.value !== "" ? ` (+${v.value} VU)` : ""}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {openTraitEntries.length > 0 ? (
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                Passives
                                            </h4>
                                            <div className="space-y-2">
                                                {openTraitEntries.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className="rounded-md border border-border/80 bg-muted/20 px-2 py-1.5"
                                                    >
                                                        <div className="text-xs font-semibold">{t.name ?? t.id}</div>
                                                        {t.description ? (
                                                            <p className="text-[11px] text-muted-foreground whitespace-pre-line mt-0.5">
                                                                {t.description}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

                                    {openEntry.kind === "summon" ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1 min-w-0">
                                                <Label className="text-xs">HP</Label>
                                                <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                                                    <div className="flex gap-1 items-center shrink-0">
                                                        <Input
                                                            type="number"
                                                            className="h-9 w-[4.5rem]"
                                                            value={openEntry.currentHp ?? ""}
                                                            onChange={(e) =>
                                                                onPatchCreature(openEntry.id, {
                                                                    currentHp: Math.max(
                                                                        0,
                                                                        Math.floor(Number(e.target.value) || 0)
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                        <span className="text-muted-foreground">/</span>
                                                        <Input
                                                            type="number"
                                                            className="h-9 w-[4.5rem]"
                                                            value={openEntry.maxHp ?? ""}
                                                            onChange={(e) =>
                                                                onPatchCreature(openEntry.id, {
                                                                    maxHp: Math.max(
                                                                        1,
                                                                        Math.floor(Number(e.target.value) || 1)
                                                                    ),
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <CreatureTemplateStatStrip tmpl={openTemplate} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">MP</Label>
                                                <div className="flex gap-1 items-center">
                                                    <Input
                                                        type="number"
                                                        className="h-9 w-[4.5rem]"
                                                        value={openEntry.currentMp ?? ""}
                                                        onChange={(e) =>
                                                            onPatchCreature(openEntry.id, {
                                                                currentMp: Math.max(
                                                                    0,
                                                                    Math.floor(Number(e.target.value) || 0)
                                                                ),
                                                            })
                                                        }
                                                    />
                                                    <span className="text-muted-foreground">/</span>
                                                    <Input
                                                        type="number"
                                                        className="h-9 w-[4.5rem]"
                                                        value={openEntry.maxMp ?? ""}
                                                        onChange={(e) =>
                                                            onPatchCreature(openEntry.id, {
                                                                maxMp: Math.max(
                                                                    0,
                                                                    Math.floor(Number(e.target.value) || 0)
                                                                ),
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="rounded-lg border border-border bg-muted/30 dark:bg-muted/20 px-3 py-2 shadow-sm">
                                        <div className="flex items-center gap-2.5">
                                            <Switch
                                                id={`sheet-deploy-${openEntry.id}`}
                                                className="h-5 w-9 border border-border/60 data-[state=unchecked]:bg-muted-foreground/30"
                                                checked={openEntry.deployed}
                                                disabled={
                                                    !openEntry.deployed &&
                                                    isCreatureDeployBlocked(openEntry, creatures, maxConjurerMinions)
                                                }
                                                onCheckedChange={(v) => trySetDeployed(openEntry, v)}
                                            />
                                            <Label
                                                htmlFor={`sheet-deploy-${openEntry.id}`}
                                                className="text-sm font-semibold text-foreground cursor-pointer"
                                            >
                                                Deploy to combat
                                            </Label>
                                        </div>
                                    </div>

                                    <OpportunityAttackNote tmpl={openTemplate} />

                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                            Actions
                                        </h4>
                                        <div className="space-y-3">
                                            {getActionCardIdsForCreatureEntry(openEntry, traits, rules)
                                                .filter((aid) => (rules.actionCards?.[aid]?.type ?? "action") === "action")
                                                .map((aid) => {
                                                    const ac = hydrateActionCardById(aid, rules)
                                                    if (!ac) {
                                                        return (
                                                            <p key={aid} className="text-sm text-destructive">
                                                                Missing action: {aid}
                                                            </p>
                                                        )
                                                    }
                                                    return (
                                                        <ActionCardComponent
                                                            key={aid}
                                                            action={ac}
                                                            attributes={attributes}
                                                            currentWeapon={currentWeapon}
                                                            offhandWeapon={offhandWeapon}
                                                            forceCollapsed={false}
                                                            powerRollDisplayMode="simple"
                                                            defaultPowerRollExpanded={false}
                                                        />
                                                    )
                                                })}
                                        </div>
                                        {(() => {
                                            const rx = getActionCardIdsForCreatureEntry(openEntry, traits, rules).filter(
                                                (aid) => {
                                                    const t = rules.actionCards?.[aid]?.type
                                                    return t === "reaction" || t === "freeReaction"
                                                }
                                            )
                                            if (rx.length === 0) return null
                                            return (
                                                <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                                                    <span className="font-bold uppercase tracking-wider text-foreground">
                                                        Reactions (Combat tab)
                                                    </span>
                                                    <p>
                                                        When deployed: {rx.map((id) => rules.actionCards?.[id]?.name ?? id).join(", ")} — assign in the Reactions section (fixed charges where noted).
                                                    </p>
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Notes</Label>
                                        <Input
                                            value={openEntry.notes ?? ""}
                                            placeholder="Player notes…"
                                            onChange={(e) =>
                                                onPatchCreature(openEntry.id, { notes: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </ScrollArea>
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>
        </>
    )
}
