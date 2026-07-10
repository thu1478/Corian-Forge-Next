import { rulesData } from "@/lib/rules-data"
import type { ActionCard, PowerRoll } from "@/lib/rules"
import { unwrapEmbeddedActionCard } from "@/logic/actions/embedded-action-card"
import type { InventoryItem } from "@/lib/equipment-data"
import type { ClassBonusRule } from "@/lib/character-data"
import { formatModifier, getAttributeModifier } from "@/logic/character/stats"
import { classStatBonusEntries } from "@/logic/character/stats"
import {
    type CreatureDefinition,
    resolveCreatureTraitEntries,
} from "@/logic/creatures/roster"
import { FAIRY_ACTIONS_BY_TEMPLATE } from "@/logic/creatures/fairy-tamer"
import { MARTIAL_PROFICIENCY_ROWS } from "@/logic/equipment/proficiency"
import { formatTraitEffectChoiceLabel } from "@/logic/traits/selection"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { memo } from "react"
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible"
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import { EffectGlossaryTag } from "@/components/effect-glossary-tag"
import { hydrateActionCardById } from "@/logic/actions/hydrate"
import {
    resolveNaturalWeaponForAction,
    getNaturalWeaponSystemDefaults,
    normalizeNaturalWeapon,
    type RulesWithNaturalWeapons,
} from "@/logic/equipment/natural-weapons"

export const RULES = rulesData as Record<string, any>

export const DEMO_ATTRIBUTES = {
    might: 10,
    dexterity: 10,
    reason: 10,
    willpower: 10,
    presence: 10,
}

export const PREVIEW_WEAPON_OPTIONS: { value: string; label: string }[] = [
    { value: "__none__", label: "No weapon" },
    { value: "wp_fist", label: "Fist (brawling)" },
    { value: "wp_dagger", label: "Dagger (melee)" },
    { value: "wp_hand_crossbow", label: "Hand crossbow (ranged)" },
]

export const RIDER_MOUNT_ACTIONS_BY_TEMPLATE: Record<string, readonly string[]> = {
    mount_swift: ["cycloneStarter"],
    mount_tough: ["seismicStep"],
    mount_adaptable: ["amphibiousEscape"],
}

export function catalogToPreviewWeapon(catalogId: string): InventoryItem | null {
    if (!catalogId || catalogId === "__none__") return null
    const def = RULES.items?.[catalogId]
    if (!def || def.type !== "weapon") return null
    return {
        ...def,
        id: catalogId,
        uid: `library-preview-${catalogId}`,
        name: def.name ?? catalogId,
        quantity: def.quantity ?? 1,
        description: def.description ?? "",
        tags: Array.isArray(def.tags) ? def.tags : [],
        type: "weapon",
        damage: def.damage ?? 0,
        damageType: def.damageType ?? "",
        range: typeof def.range === "number" ? def.range : 1,
        attributes: Array.isArray(def.attributes) ? def.attributes : [],
    } as InventoryItem
}

export function itemDefToPreviewWeapon(itemId: string, def: Record<string, any>): InventoryItem | null {
    if (!def || def.type !== "weapon") return null
    return {
        ...def,
        id: itemId,
        uid: `library-item-${itemId}`,
        name: def.name ?? itemId,
        quantity: def.quantity ?? 1,
        description: def.description ?? "",
        tags: Array.isArray(def.tags) ? def.tags : [],
        type: "weapon",
        damage: def.damage ?? 0,
        damageType: def.damageType ?? "",
        range: typeof def.range === "number" ? def.range : 1,
        attributes: Array.isArray(def.attributes) ? def.attributes : [],
    } as InventoryItem
}

export function buildClassActionCard(classId: string, actionKey: string, wrapper: Record<string, any>): ActionCard | null {
    const ac = wrapper?.actionCard
    if (!ac || typeof ac !== "object") return null
    return {
        ...ac,
        id: actionKey,
        source: classId,
        tags: (ac.tags as string[]) ?? [],
    } as ActionCard
}

export function reactionEmbeddedToActionCard(reactionId: string, raw: Record<string, unknown> | undefined): ActionCard | null {
    const unwrapped = unwrapEmbeddedActionCard(raw)
    if (!unwrapped) return null
    const name = unwrapped.name
    if (typeof name !== "string") return null
    const rawType = String(unwrapped.type ?? "reaction").toLowerCase()
    const type: ActionCard["type"] =
        rawType === "freereaction" ? "freeReaction" : rawType === "action" ? "action" : "reaction"
    return {
        ...unwrapped,
        id: reactionId,
        name,
        type,
        description: String(unwrapped.description ?? ""),
        tags: Array.isArray(unwrapped.tags) ? (unwrapped.tags as string[]) : [],
        source: String(unwrapped.source ?? "class"),
    } as ActionCard
}

/** Ids referenced by `GrantActionCard` feat/trait effects (e.g. Trusty Companion). */
export function collectGrantActionCardIds(effects: unknown): string[] {
    if (!Array.isArray(effects)) return []
    const ids: string[] = []
    for (const e of effects) {
        if (!e || typeof e !== "object") continue
        const rec = e as Record<string, unknown>
        if (rec.type !== "GrantActionCard") continue
        const v = String(rec.value ?? "").trim()
        if (v) ids.push(v)
    }
    return [...new Set(ids)]
}

export function matchesQuery(text: string, q: string): boolean {
    if (!q) return true
    return text.toLowerCase().includes(q)
}

const EXTRA_PROFICIENCY_LABELS: Record<string, string> = {
    firearms: "Firearms",
    brawling: "Brawling weapons",
}

const STAT_BONUS_LABELS: Record<string, string> = {
    hp: "Max HP",
    mp: "Max MP",
    ip: "Max IP",
    defense: "Defense",
    stability: "Stability",
    speed: "Speed",
}

export function classProficiencyLabel(id: string): string {
    const martial = MARTIAL_PROFICIENCY_ROWS.find((row) => row.id === id)
    if (martial) return martial.label
    if (EXTRA_PROFICIENCY_LABELS[id]) return EXTRA_PROFICIENCY_LABELS[id]
    return id
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (c) => c.toUpperCase())
}

export function formatClassStatBonusRule(rule: ClassBonusRule): string {
    const statLabel = STAT_BONUS_LABELS[rule.stat] ?? rule.stat
    if (rule.once) {
        return `+${rule.amount} ${statLabel} (once, from 1st class level)`
    }
    const freq = typeof rule.frequency === "number" && rule.frequency > 1 ? rule.frequency : 1
    if (freq === 1) {
        return `+${rule.amount} ${statLabel} per class level`
    }
    return `+${rule.amount} ${statLabel} every ${freq} class levels`
}

export function ClassLibraryGrantsSummary({ classData }: { classData: Record<string, any> }) {
    const proficiencies = Array.isArray(classData.proficiencies)
        ? (classData.proficiencies as string[]).filter(Boolean)
        : []
    const statBonuses = classStatBonusEntries(classData)
    const freeFeaturesNote =
        typeof classData.freeFeaturesNote === "string" ? classData.freeFeaturesNote.trim() : ""

    if (proficiencies.length === 0 && statBonuses.length === 0 && !freeFeaturesNote) {
        return null
    }

    return (
        <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4">
            {proficiencies.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Proficiencies</h4>
                    <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                        {proficiencies.map((id) => (
                            <li key={id}>{classProficiencyLabel(id)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {statBonuses.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Innate bonuses</h4>
                    <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                        {statBonuses.map((rule, i) => (
                            <li key={`${rule.stat}-${rule.amount}-${i}`}>{formatClassStatBonusRule(rule)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
            {freeFeaturesNote ? (
                <div className="space-y-2">
                    {proficiencies.length === 0 && statBonuses.length === 0 ? (
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Class features</h4>
                    ) : null}
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line border-l-2 border-primary/40 pl-3">
                        {freeFeaturesNote}
                    </p>
                </div>
            ) : null}
        </div>
    )
}

export const EQUIPMENT_TYPE_ORDER = [
    "weapon",
    "armor",
    "shield",
    "accessory",
    "consumable",
    "misc",
    "container",
] as const

export function tocSlug(s: string): string {
    return (
        s
            .trim()
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase() || "section"
    )
}

export function sortedRacePassives(
    passives: Record<string, unknown> | undefined,
    type: "innate" | "selectable"
): { pid: string; passive: Record<string, any> }[] {
    return Object.entries(passives ?? {})
        .map(([pid, p]) => ({ pid, passive: p as Record<string, any> }))
        .filter(({ passive }) => (passive.type === "selectable" ? "selectable" : "innate") === type)
        .sort((a, b) =>
            String(a.passive.name ?? a.pid).localeCompare(String(b.passive.name ?? b.pid), undefined, {
                sensitivity: "base",
            })
        )
}

export function LibraryRacePassiveCard({
    pid,
    passive,
    previewWeapon,
    collapseAllSignal,
}: {
    pid: string
    passive: Record<string, any>
    previewWeapon: InventoryItem | null
    collapseAllSignal: number
}) {
    return (
        <div className="rounded-lg border border-border bg-card/50 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{passive.name}</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                    {pid}
                </Badge>
                {passive.type === "selectable" && typeof passive.ptCost === "number" ? (
                    <Badge variant={passive.ptCost < 0 ? "destructive" : "secondary"}>
                        {passive.ptCost > 0 ? `+${passive.ptCost}` : passive.ptCost} pt
                    </Badge>
                ) : passive.type === "innate" ? (
                    <Badge variant="secondary">Innate</Badge>
                ) : null}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{passive.description}</p>
            {typeof passive.selectAmount === "number" &&
            passive.selectAmount > 0 &&
            Array.isArray(passive.effects) &&
            passive.effects.length > passive.selectAmount ? (
                <div className="space-y-1 text-sm">
                    <span className="font-medium">Choose {passive.selectAmount}</span>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                        {passive.effects.map((eff: Record<string, unknown>, i: number) => (
                            <li key={i}>{formatTraitEffectChoiceLabel(eff as any, RULES)}</li>
                        ))}
                    </ul>
                </div>
            ) : Array.isArray(passive.effects) && passive.effects.length > 0 ? (
                <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                    {passive.effects.map((eff: Record<string, unknown>, i: number) => (
                        <li key={i}>{formatTraitEffectChoiceLabel(eff as any, RULES)}</li>
                    ))}
                </ul>
            ) : null}
            {passive.powerRoll ? (
                <TraitPowerRollCollapsible
                    roll={passive.powerRoll as PowerRoll}
                    attributes={DEMO_ATTRIBUTES}
                    currentWeapon={previewWeapon}
                    offhandWeapon={null}
                    powerRollDisplayMode="formula"
                    defaultExpanded={false}
                    collapseAllSignal={collapseAllSignal}
                />
            ) : null}
        </div>
    )
}

export function formatCreatureVuln(v: { stat: string; value?: string }): string {
    const vu = v.value != null && v.value !== "" ? ` (+${v.value} VU)` : ""
    return `${v.stat}${vu}`
}

/**
 * Rules library only: show preview-only cards for bestiary ids even when `actionIDs` is empty.
 * Character sheet still uses {@link getActionCardIdsForCreatureEntry} and creator picks — unchanged.
 */
export function getLibraryCreatureActionDisplayIds(id: string, def: Pick<CreatureDefinition, "actionIDs">): string[] {
    const base = [...(def.actionIDs ?? [])].map((s) => String(s).trim()).filter(Boolean)
    const seen = new Set(base)
    const out = [...base]

    for (const previewIds of [FAIRY_ACTIONS_BY_TEMPLATE[id], RIDER_MOUNT_ACTIONS_BY_TEMPLATE[id]]) {
        for (const raw of previewIds ?? []) {
            const aid = String(raw).trim()
            if (!aid || seen.has(aid)) continue
            seen.add(aid)
            out.push(aid)
        }
    }

    return out
}

export const LibraryCreatureCard = memo(function LibraryCreatureCard({
    id,
    def,
    rules,
    previewWeapon,
    collapseAllSignal,
}: {
    id: string
    def: CreatureDefinition
    rules: Record<string, any>
    previewWeapon: InventoryItem | null
    collapseAllSignal: number
}) {
    const traitEntries = resolveCreatureTraitEntries(rules, def.traitRefs)
    const actionIds = getLibraryCreatureActionDisplayIds(id, def)
    const attrKeys = ["might", "dexterity", "reason", "willpower", "presence"] as const
    const oa = def.opportunityAttack
    const naturalWeaponEntries = def.naturalWeapons
        ? Object.entries(def.naturalWeapons).map(([key, raw]) => {
              const merged = normalizeNaturalWeapon(raw, getNaturalWeaponSystemDefaults(rules as RulesWithNaturalWeapons))
              return { key, merged }
          })
        : []

    return (
        <div className="min-w-0 space-y-3 rounded-lg border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold leading-tight">{def.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                            {id}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                            {def.role}
                        </Badge>
                        {typeof def.catalogLevel === "number" ? (
                            <Badge variant="outline" className="text-[10px]">
                                Lv {def.catalogLevel}
                            </Badge>
                        ) : null}
                        {(def.tags ?? []).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] capitalize">
                                {t}
                            </Badge>
                        ))}
                        {def.creatureTypes?.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] capitalize">
                                {t}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>
            {def.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{def.description}</p>
            ) : null}

            {def.attributes && Object.keys(def.attributes).length > 0 ? (
                <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Attributes
                    </p>
                    <div className="grid grid-cols-5 gap-1 text-xs">
                        {attrKeys.map((k) => {
                            const raw = def.attributes?.[k]
                            const score =
                                typeof raw === "number" && Number.isFinite(raw) ? raw : null
                            return (
                                <div key={k} className="rounded-md bg-muted/40 px-1.5 py-1 text-center">
                                    <div className="text-[9px] text-muted-foreground uppercase">{k.slice(0, 3)}</div>
                                    <div className="font-mono font-semibold tabular-nums">{score ?? "—"}</div>
                                    <div className="text-[9px] font-mono text-muted-foreground tabular-nums">
                                        {score != null ? formatModifier(getAttributeModifier(score)) : "—"}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 text-xs text-muted-foreground">
                {def.size ? (
                    <span>
                        <span className="font-medium text-foreground">Size</span> {def.size}
                    </span>
                ) : null}
                {def.speed != null ? (
                    <span>
                        <span className="font-medium text-foreground">Speed</span> {def.speed}
                    </span>
                ) : null}
                {def.stability != null ? (
                    <span>
                        <span className="font-medium text-foreground">Stability</span> {def.stability}
                    </span>
                ) : null}
                {def.defense != null && Number.isFinite(def.defense) ? (
                    <span>
                        <span className="font-medium text-foreground">Def</span> {def.defense}
                    </span>
                ) : null}
                {def.role === "summon" && (def.defaultMaxHp != null || def.defaultMaxMp != null) ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-3 rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-muted-foreground">
                        {def.defaultMaxHp != null ? (
                            <span className="tabular-nums">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    HP{" "}
                                </span>
                                <span className="font-mono text-sm font-semibold text-foreground">{def.defaultMaxHp}</span>
                            </span>
                        ) : null}
                        {def.defaultMaxMp != null ? (
                            <span className="tabular-nums">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    MP{" "}
                                </span>
                                <span className="font-mono text-sm font-semibold text-foreground">{def.defaultMaxMp}</span>
                            </span>
                        ) : null}
                    </span>
                ) : null}
            </div>

            {naturalWeaponEntries.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Natural weapons
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                        {naturalWeaponEntries.map(({ key, merged }) => (
                            <li key={key} className="font-mono tabular-nums">
                                <span className="font-semibold text-foreground">{merged.name}</span>
                                <span className="text-muted-foreground"> ({key})</span>
                                {" — "}
                                {merged.damage} {merged.damageType}, range {merged.range ?? "—"}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {def.resistances && def.resistances.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Resistances
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {def.resistances.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[10px] capitalize">
                                {r}
                            </Badge>
                        ))}
                    </div>
                </div>
            ) : null}
            {def.immunities && def.immunities.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Immunities
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {def.immunities.map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px] capitalize">
                                {r}
                            </Badge>
                        ))}
                    </div>
                </div>
            ) : null}
            {def.vulnerabilities && def.vulnerabilities.length > 0 ? (
                <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Vulnerabilities
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground capitalize">
                        {def.vulnerabilities.map((v, i) => (
                            <li key={`${v.stat}-${i}`}>{formatCreatureVuln(v)}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {oa != null && Number.isFinite(oa) && oa > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                    Opportunity attack:{" "}
                    <span className="font-mono font-semibold text-foreground">{oa}</span> damage.
                </p>
            ) : null}

            {traitEntries.length > 0 ? (
                <div className="space-y-2 border-t border-border/60 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Passives</p>
                    {traitEntries.map((t) => (
                        <div key={t.id} className="rounded-md border border-border/60 bg-muted/15 px-2 py-1.5">
                            <div className="text-xs font-semibold">{t.name ?? t.id}</div>
                            {t.description ? (
                                <p className="mt-0.5 text-[11px] text-muted-foreground whitespace-pre-line">
                                    {t.description}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}

            {actionIds.length > 0 ? (
                <div className="space-y-3 border-t border-border/60 pt-2">
                    <span className="text-sm font-semibold">Actions</span>
                    <div className="space-y-4">
                        {actionIds.map((aid) => {
                            const ac = hydrateActionCardById(aid, rules)
                            if (!ac) {
                                return (
                                    <p key={aid} className="text-sm text-destructive">
                                        Missing action: {aid}
                                    </p>
                                )
                            }
                            const cardWeapon =
                                resolveNaturalWeaponForAction(
                                    def,
                                    rules as RulesWithNaturalWeapons,
                                    ac.tags,
                                    ac.hiddenTags
                                ) ?? previewWeapon
                            return (
                                <div key={aid} className="space-y-2">
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                        {aid}
                                    </Badge>
                                    <ActionCardComponent
                                        action={ac}
                                        attributes={DEMO_ATTRIBUTES}
                                        currentWeapon={cardWeapon}
                                        offhandWeapon={null}
                                        forceCollapsed={false}
                                        powerRollDisplayMode="formula"
                                        defaultPowerRollExpanded={false}
                                        collapseAllSignal={collapseAllSignal}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                    No action cards to preview (<span className="font-mono">actionIDs</span> empty and no
                    library-only preview mapping).
                </p>
            )}
        </div>
    )
})
