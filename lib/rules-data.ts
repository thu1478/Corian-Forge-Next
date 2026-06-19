import rulesJson from "./rules.json"
import type { ActionCard, PowerRoll } from "./rules"
import type { OccupationRule } from "@/logic/classes/occupation"
import type { ItemRankDefinition } from "@/logic/equipment/item-rank-display"

/** Catalog row under `system.skills`. */
export type SkillCatalogEntry = {
    name?: string
    description?: string
    categories?: string[]
    powerRoll?: PowerRoll
}

export type LanguageCatalogEntry = {
    name?: string
    description?: string
}

export type CultureChoiceEntry = {
    name?: string
    description?: string
    skillCategories?: string[]
}

export type RulesCulture = {
    environment?: Record<string, CultureChoiceEntry>
    organization?: Record<string, CultureChoiceEntry>
    upbringing?: Record<string, CultureChoiceEntry>
}

export type ActionCardRule = Omit<ActionCard, "id"> & { id?: string }

export type FeatRule = {
    name?: string
    description?: string
    selectAmount?: number
    effects?: unknown[]
    minLevel?: number
    prerequisites?: unknown
}

export type ClassRule = {
    name?: string
    passives?: Record<string, unknown>
    actions?: Record<string, unknown>
    proficiencies?: string[]
    specialInvention?: unknown
    [key: string]: unknown
}

export type RaceRule = {
    name?: string
    passives?: Record<string, unknown>
    [key: string]: unknown
}

export type RulesSystem = {
    pointBuy?: Record<string, number>
    startingXPPerLvl?: Record<string, number>
    xpCostPerLvl?: Record<string, number>
    occupation?: Record<string, OccupationRule>
    skills?: Record<string, SkillCatalogEntry>
    languages?: Record<string, LanguageCatalogEntry>
    feats?: Record<string, FeatRule>
    damageTypes?: string[]
    culture?: RulesCulture
    itemRanks?: Record<string, ItemRankDefinition>
    defaults?: Record<string, unknown>
    bonds?: unknown
    [key: string]: unknown
}

export type RulesGlossary = {
    effectDictionary?: Record<string, Record<string, unknown>>
}

/** Top-level rules bundle shape (pragmatic — not exhaustive). */
export type RulesRoot = {
    system: RulesSystem
    classes: Record<string, ClassRule>
    races: Record<string, RaceRule>
    items: Record<string, Record<string, unknown>>
    actionCards: Record<string, ActionCardRule>
    passives: Record<string, unknown>
    bestiary?: Record<string, unknown>
    glossary?: RulesGlossary
}

/** Bundled rules — prefer this import over `@/lib/rules.json` in app code. */
export const rulesData = rulesJson as unknown as RulesRoot

function resolveRules(rules?: RulesRoot): RulesRoot {
    return rules ?? rulesData
}

export function getRulesSystem(rules?: RulesRoot): RulesSystem {
    return resolveRules(rules).system
}

export function getRulesClasses(rules?: RulesRoot): Record<string, ClassRule> {
    return resolveRules(rules).classes
}

export function getClassRule(classId: string, rules?: RulesRoot): ClassRule | undefined {
    const id = String(classId ?? "").trim()
    if (!id) return undefined
    return getRulesClasses(rules)[id]
}

export function getRulesRaces(rules?: RulesRoot): Record<string, RaceRule> {
    return resolveRules(rules).races
}

export function getRaceRule(raceId: string, rules?: RulesRoot): RaceRule | undefined {
    const key = String(raceId ?? "").trim().toLowerCase()
    if (!key) return undefined
    return getRulesRaces(rules)[key]
}

/** Global passive registry (`rules.passives`). For full trait resolution use `resolvePassiveById`. */
export function getRulesPassives(rules?: RulesRoot): Record<string, unknown> {
    return resolveRules(rules).passives ?? {}
}

export function getGlobalPassive(passiveId: string, rules?: RulesRoot): Record<string, unknown> | undefined {
    const p = getRulesPassives(rules)[passiveId]
    return p && typeof p === "object" ? (p as Record<string, unknown>) : undefined
}

/** @deprecated Prefer `getGlobalPassive` — name kept for roadmap parity. */
export const getPassive = getGlobalPassive

export function getRulesActionCards(rules?: RulesRoot): Record<string, ActionCardRule> {
    return resolveRules(rules).actionCards ?? {}
}

export function getActionCard(actionId: string, rules?: RulesRoot): ActionCardRule | undefined {
    return getRulesActionCards(rules)[actionId]
}

export function getRulesItems(rules?: RulesRoot): Record<string, Record<string, unknown>> {
    return resolveRules(rules).items ?? {}
}

export function getItemRule(itemId: string, rules?: RulesRoot): Record<string, unknown> | undefined {
    const id = String(itemId ?? "").trim()
    if (!id) return undefined
    return getRulesItems(rules)[id]
}

export function getRulesSkills(rules?: RulesRoot): Record<string, SkillCatalogEntry> {
    return getRulesSystem(rules).skills ?? {}
}

export function getRulesFeats(rules?: RulesRoot): Record<string, FeatRule> {
    return getRulesSystem(rules).feats ?? {}
}

export function getFeatRule(featId: string, rules?: RulesRoot): FeatRule | undefined {
    return getRulesFeats(rules)[featId]
}

export function getRulesLanguages(rules?: RulesRoot): Record<string, LanguageCatalogEntry> {
    return getRulesSystem(rules).languages ?? {}
}

export function getRulesBestiary(rules?: RulesRoot): Record<string, unknown> {
    return resolveRules(rules).bestiary ?? {}
}

export function getRulesGlossary(rules?: RulesRoot): RulesGlossary | undefined {
    return resolveRules(rules).glossary
}

export function getPointBuy(rules?: RulesRoot): Record<string, number> {
    return getRulesSystem(rules).pointBuy ?? {}
}

export function getStartingXPPerLevel(rules?: RulesRoot): Record<string, number> {
    return getRulesSystem(rules).startingXPPerLvl ?? {}
}

export function getXPCostPerLevel(rules?: RulesRoot): Record<string, number> {
    return getRulesSystem(rules).xpCostPerLvl ?? {}
}

export function getOccupationRules(rules?: RulesRoot): Record<string, OccupationRule> {
    return getRulesSystem(rules).occupation ?? {}
}

export function getRulesCulture(rules?: RulesRoot): RulesCulture | undefined {
    return getRulesSystem(rules).culture
}

export function getDamageTypes(rules?: RulesRoot): string[] {
    return getRulesSystem(rules).damageTypes ?? []
}

export function listClassIds(rules?: RulesRoot): string[] {
    return Object.keys(getRulesClasses(rules))
}

export function listRaceIds(rules?: RulesRoot): string[] {
    return Object.keys(getRulesRaces(rules))
}
