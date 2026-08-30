import {
    getItemRule,
    getOccupationRules,
    getRaceRule,
    getRulesClasses,
    getRulesFeats,
    getRulesLanguages,
    getRulesRaces,
    getRulesSkills,
    getRulesSystem,
    getStartingXPPerLevel,
    rulesData,
} from "@/lib/rules-data";
import { sanitizeBondTargetsFromCharacterJson } from "@/logic/character/bonds";
import { emptyAccessories, migrateAccessories } from "@/logic/equipment/accessory-slots";
import {
    getOccupationDefinition,
    type OccupationRule,
    resolveOccupationSkillsCount,
} from "@/logic/classes/occupation";
import {
    CharacterSaveData,
    type InventionModuleConfig,
    type InventionVariant,
    type SpecialInventionSave,
    type WeaponInfusionDamageType,
} from "@/lib/character-data";
import { emptyFairyTamerContracts, type FairyTamerContractsSave } from "@/logic/creatures/fairy-tamer";
import type { Equipment, InventoryEntry } from "@/lib/equipment-data";
import { FeatLevelPick, TraitRef } from "@/lib/baseRefs";
import { CharAttribute } from "@/lib/rules";
import { makeInventoryUid } from "@/logic/equipment/inventory-filters";
import { sanitizeActionLayout } from "@/logic/actions/action-layout";

/** Baseline character used when starting the creator or after full reset. */
export function createEmptyCreatorCharacter(): CharacterSaveData {
    const starting = getStartingXPPerLevel();
    return {
        name: "",
        age: 0,
        gender: "",
        race: "",
        background: "",
        backstory: "",
        classes: [],
        hp: 10,
        barrier: 0,
        mp: 10,
        focus: 0,
        respite: 4,
        attributes: {
            [CharAttribute.Might]: 8,
            [CharAttribute.Dexterity]: 8,
            [CharAttribute.Reason]: 8,
            [CharAttribute.Willpower]: 8,
            [CharAttribute.Presence]: 8,
        },
        speed: 4,
        xp: starting["1"] ?? 100,
        inspiration: 0,
        victories: 0,
        focusFeatures: [],
        reactions: [],
        actions: [],
        traits: [],
        skills: [],
        money: 0,
        ip: 0,
        inventory: [],
        equipment: {
            activeWeapon: null,
            offhand: null,
            armor: null,
            accessories: emptyAccessories(),
        },
        bondTargets: [],
        containers: [],
        cultureEnvironment: null,
        cultureOrganization: null,
        cultureUpbringing: null,
        occupation: null,
        attributeLevelBonuses: {},
        priestDeity: null,
        riderMountType: null,
        riderAdaptableMovement: null,
        mountedCreatureId: null,
        creatures: [],
        conjurerSummonTemplateIds: [],
        druidAnimaTemplateIds: [],
        activeDruidAnimaTemplateId: null,
        equipmentBeforeAnima: null,
        animaBarrierBonus: null,
        fairyTamerContracts: emptyFairyTamerContracts(),
        creatorSkillGrantPicks: {},
    };
}

function parseFairyTamerContractsFromImport(raw: unknown): FairyTamerContractsSave {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyFairyTamerContracts()
    const o = raw as Record<string, unknown>
    const readSlot = (key: string): FairyTamerContractsSave["slot0"] => {
        const v = o[key]
        if (!v || typeof v !== "object" || Array.isArray(v)) return null
        const t = v as Record<string, unknown>
        const templateId = String(t.templateId ?? "").trim()
        const actionCardIds = Array.isArray(t.actionCardIds)
            ? (t.actionCardIds as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
            : []
        if (!templateId) return null
        return { templateId, actionCardIds }
    }
    const lm = o.level5Mode
    const level5Mode = lm === "fourthLesser" || lm === "upgrade" ? lm : null
    const usi = o.upgradedSlotIndex
    const upgradedSlotIndex = usi === 0 || usi === 1 || usi === 2 ? usi : null
    return {
        slot0: readSlot("slot0"),
        slot1: readSlot("slot1"),
        slot2: readSlot("slot2"),
        slot3: readSlot("slot3"),
        level5Mode,
        upgradedSlotIndex,
    }
}

function sanitizeBondedWeaponUids(raw: unknown): string[] {
    if (!Array.isArray(raw)) return []
    const out: string[] = []
    for (const x of raw) {
        const uid = String(x ?? "").trim()
        if (uid && !out.includes(uid)) out.push(uid)
    }
    return out
}

function sanitizeCombatStatDelta(raw: unknown): number {
    const n = Number(raw)
    if (!Number.isFinite(n)) return 0
    return Math.floor(n)
}

function sanitizeCombatDefenseDelta(raw: unknown): number {
    return sanitizeCombatStatDelta(raw)
}

function sanitizeCreatorSkillGrantPicks(raw: unknown): Record<string, string[]> {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (!k || typeof v !== "object" || v === null || !Array.isArray(v)) continue;
        const ids = v.map((x) => String(x ?? "").trim()).filter(Boolean);
        out[k] = ids;
    }
    return out;
}

function sanitizeSkillsFromImport(skillsRaw: unknown): CharacterSaveData["skills"] {
    if (!Array.isArray(skillsRaw)) return [];
    return skillsRaw
        .filter((x) => x && typeof x === "object")
        .map((s: Record<string, unknown>) => ({
            name: String(s.name ?? ""),
            hasExpertise: Boolean(s.hasExpertise),
        }));
}

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence";

const ATTRIBUTE_IDS: ReadonlySet<string> = new Set([
    "might",
    "dexterity",
    "reason",
    "willpower",
    "presence",
]);

function parseAttributeLevelBonuses(raw: unknown): Partial<Record<number, AttributeKey>> {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Partial<Record<number, AttributeKey>> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        const lvl = Number(k);
        if (!Number.isFinite(lvl)) continue;
        const a = String(v ?? "").trim().toLowerCase();
        if (!ATTRIBUTE_IDS.has(a)) continue;
        out[lvl] = a as AttributeKey;
    }
    return out;
}

function subtractLevelBonusesFromAttributes(
    attrs: CharacterSaveData["attributes"],
    lb: Partial<Record<number, AttributeKey>>
): CharacterSaveData["attributes"] {
    const next = { ...attrs };
    for (const attr of Object.values(lb)) {
        if (attr && typeof next[attr] === "number") next[attr] -= 1;
    }
    return next;
}

export type CreatorImportResult = {
    charData: CharacterSaveData;
    adventurerLevel: number;
    classSelections: {
        id: string;
        source: string;
        selectedEffectIndices?: number[];
        fairySpellSlot?: 0 | 1 | 2 | 3;
    }[];
    levelBonuses: Partial<Record<number, AttributeKey>>;
    cultureSkills: string[];
    occupationSkills: string[];
    occupationLanguages: string[];
    selectedFeats: Partial<Record<number, FeatLevelPick>>;
};

export const ATTRIBUTE_BONUS_MILESTONES = [3, 5, 7, 9, 10] as const;
export const FEAT_LEVEL_ORDER = [1, 3, 5, 7, 9, 10] as const;

function resolveRaceKey(raceValue: string): string {
    const r = raceValue?.trim();
    if (!r) return "";
    const races = getRulesRaces(rulesData);
    const lower = r.toLowerCase();
    if (races[lower]) return lower;
    const hit = Object.entries(races).find(
        ([, data]: [string, any]) => data?.name?.toLowerCase() === lower
    );
    return hit ? hit[0] : lower;
}

function getInnateRacialIds(raceKey: string): Set<string> {
    const passives = getRaceRule(raceKey, rulesData)?.passives ?? {};
    return new Set(
        Object.entries(passives)
            .filter(([, p]: [string, any]) => p?.type === "innate")
            .map(([id]) => id)
    );
}

function normalizeSource(s: unknown): string {
    return String(s ?? "").toLowerCase();
}

function normalizeTraitRef(t: any): TraitRef {
    const ref: TraitRef = {
        id: String(t.id),
        source: String(t.source ?? "other"),
    };
    if (Array.isArray(t.selectedEffectIndices) && t.selectedEffectIndices.length > 0) {
        ref.selectedEffectIndices = t.selectedEffectIndices;
    }
    const ch = sanitizeRefCharges(t.charges);
    if (ch !== undefined) ref.charges = ch;
    return ref;
}

function normalizeActionRef(a: unknown): { id: string; charges?: number } {
    if (typeof a === "string") return { id: a };
    const o = a as Record<string, unknown>;
    const row: { id: string; charges?: number } = { id: String(o.id ?? "") };
    const ch = sanitizeRefCharges(o.charges);
    if (ch !== undefined) row.charges = ch;
    return row;
}

function normalizeReactionRef(r: unknown): { id: string; slotIndex: number; charges: number } {
    const o = (r ?? {}) as Record<string, unknown>;
    const ch = sanitizeRefCharges(o.charges);
    return {
        id: String(o.id ?? ""),
        slotIndex: Number(o.slotIndex ?? -1),
        charges: ch !== undefined ? ch : -1,
    };
}

/** Highest adventurer tier whose starting XP threshold is met by `xp`. */
export function adventurerLevelFromXp(xp: number | undefined, starting: Record<string, number>): number {
    if (xp == null || Number.isNaN(xp)) return 1;
    for (let l = 10; l >= 1; l--) {
        if (starting[String(l)] === xp) return l;
    }
    let best = 1;
    for (let l = 1; l <= 10; l++) {
        if ((starting[String(l)] ?? 0) <= xp) best = l;
    }
    return best;
}

function skillIdByName(name: string): string | null {
    const skills = getRulesSkills(rulesData);
    const n = name?.trim().toLowerCase();
    if (!n) return null;
    if (skills[n]) return n;
    const found = Object.entries(skills).find(([, s]: [string, any]) => s?.name?.toLowerCase() === n);
    return found ? found[0] : null;
}

function skillPickIdsFromImport(skills: any[]): string[] {
    const out: string[] = [];
    for (const s of skills) {
        const id = skillIdByName(String(s?.name ?? s?.id ?? ""));
        if (!id) continue;
        out.push(id);
        if (s?.hasExpertise) out.push(id);
    }
    return out;
}

function languageIdsFromImport(names: unknown): string[] {
    if (!Array.isArray(names)) return ["common"];
    const langs = getRulesLanguages(rulesData);
    const ids = names.map((raw) => {
        const name = String(raw).trim();
        const lower = name.toLowerCase();
        if (langs[lower]) return lower;
        const hit = Object.entries(langs).find(
            ([, l]: [string, any]) => l?.name?.toLowerCase() === lower
        );
        return hit ? hit[0] : lower.replace(/\s+/g, "");
    });
    const withCommon = ids.includes("common") ? ids : ["common", ...ids];
    return [...new Set(withCommon)];
}

function inferClassSelections(json: any): {
    id: string;
    source: string;
    selectedEffectIndices?: number[];
    fairySpellSlot?: 0 | 1 | 2 | 3;
}[] {
    const classes = getRulesClasses(rulesData);
    const out: {
        id: string;
        source: string;
        selectedEffectIndices?: number[];
        fairySpellSlot?: 0 | 1 | 2 | 3;
    }[] = [];
    const seen = new Set<string>();

    const add = (talentId: string, classId: string, indices?: number[], fairySpellSlot?: 0 | 1 | 2 | 3) => {
        const k =
            fairySpellSlot != null
                ? `${classId}::${talentId}::ftSpell::${fairySpellSlot}`
                : `${classId}::${talentId}`;
        if (seen.has(k)) return;
        seen.add(k);
        const row: {
            id: string;
            source: string;
            selectedEffectIndices?: number[];
            fairySpellSlot?: 0 | 1 | 2 | 3;
        } = { id: talentId, source: classId };
        if (indices?.length) row.selectedEffectIndices = indices;
        if (fairySpellSlot != null) row.fairySpellSlot = fairySpellSlot;
        out.push(row);
    };

    const tryAllClasses = (talentId: string, indices?: number[]) => {
        for (const [classId, cdata] of Object.entries(classes)) {
            const cd = cdata as any;
            if (cd.passives?.[talentId]) add(talentId, classId, indices);
            if (cd.actions?.[talentId]) add(talentId, classId);
            if ((cd.reactions || []).some((r: any) => r.id === talentId)) add(talentId, classId);
        }
    };

    for (const t of json.traits || []) {
        if (typeof t !== "object" || !t?.id) continue;
        if (normalizeSource(t.source) !== "class") continue;
        const indices = Array.isArray(t.selectedEffectIndices)
            ? t.selectedEffectIndices.map((n: unknown) => Math.floor(Number(n))).filter((n: number) => Number.isInteger(n))
            : undefined;
        tryAllClasses(String(t.id), indices?.length ? indices : undefined);
    }

    for (const a of json.actions || []) {
        const id = typeof a === "object" ? a?.id : a;
        if (!id) continue;
        tryAllClasses(String(id));
    }

    for (const r of json.reactions || []) {
        const id = typeof r === "object" ? r?.id : r;
        if (!id) continue;
        tryAllClasses(String(id));
    }

    const fc = json.fairyTamerContracts;
    if (fc && typeof fc === "object" && !Array.isArray(fc)) {
        for (const slotIdx of [0, 1, 2, 3] as const) {
            const slot = (fc as Record<string, unknown>)[`slot${slotIdx}`];
            if (!slot || typeof slot !== "object") continue;
            const aids = (slot as { actionCardIds?: unknown }).actionCardIds;
            if (!Array.isArray(aids)) continue;
            for (const raw of aids) {
                const aid = String(raw ?? "").trim();
                if (!aid.startsWith("fairy/")) continue;
                add(aid, "fairytamer", undefined, slotIdx);
            }
        }
    }

    return out;
}

function inferSelectedFeats(traits: any[]): Partial<Record<number, FeatLevelPick>> {
    const featRefs = traits.filter(
        (t: any) => normalizeSource(t?.source) === "feat" && t?.id
    );
    const featsDef = getRulesFeats(rulesData);
    const out: Partial<Record<number, FeatLevelPick>> = {};
    const used = new Set<number>();

    const nextFreeSlot = (preferred: number): number => {
        let i = FEAT_LEVEL_ORDER.findIndex((s) => s >= preferred);
        if (i < 0) i = 0;
        for (let j = i; j < FEAT_LEVEL_ORDER.length; j++) {
            const s = FEAT_LEVEL_ORDER[j];
            if (!used.has(s)) return s;
        }
        let s = FEAT_LEVEL_ORDER[FEAT_LEVEL_ORDER.length - 1] + 2;
        while (used.has(s)) s += 2;
        return s;
    };

    for (const t of featRefs) {
        const id = String(t.id);
        const def = featsDef[id];
        const minL = Number(def?.minLevel) || 1;
        const slot = nextFreeSlot(minL);
        used.add(slot);
        const pick: FeatLevelPick = { id };
        if (Array.isArray(t.selectedEffectIndices) && t.selectedEffectIndices.length > 0) {
            pick.selectedEffectIndices = t.selectedEffectIndices;
        }
        out[slot] = pick;
    }
    return out;
}

function mergeImportedCharData(json: any, empty: CharacterSaveData): CharacterSaveData {
    const starting = getStartingXPPerLevel();
    const classesRaw = Array.isArray(json.classes) ? json.classes : [];
    const classes = classesRaw
        .map((c: any) => ({ id: String(c.id), level: Math.max(0, Number(c.level) || 0) }))
        .filter((c: { level: number }) => c.level > 0);

    const attributeLevelBonuses = parseAttributeLevelBonuses(json.attributeLevelBonuses);
    const mergedAttrsFromJson = { ...empty.attributes, ...(json.attributes || {}) };
    const attrs =
        Object.keys(attributeLevelBonuses).length > 0
            ? subtractLevelBonusesFromAttributes(mergedAttrsFromJson, attributeLevelBonuses)
            : mergedAttrsFromJson;

    const { bonds: _omitLegacyBonds, bondTargets: _omitRawTargets, ...jsonRest } = json as Record<string, unknown> & {
        bonds?: unknown
        bondTargets?: unknown
    }

    return {
        ...empty,
        ...jsonRest,
        name: String(json.name ?? empty.name),
        age: Number(json.age ?? empty.age) || 0,
        gender: String(json.gender ?? empty.gender),
        race: resolveRaceKey(String(json.race ?? "")),
        background: String(json.theme ?? json.background ?? empty.background),
        backstory: String(json.backstory ?? empty.backstory),
        profileImage: json.profileImage ?? empty.profileImage,
        classes,
        attributes: attrs,
        hp: Number(json.hp ?? empty.hp),
        barrier: Number(json.barrier ?? empty.barrier),
        mp: Number(json.mp ?? empty.mp),
        focus: Number(json.focus ?? empty.focus),
        respite: (() => {
            const n = Number(json.respite ?? empty.respite)
            return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : empty.respite
        })(),
        speed: Number(json.speed ?? empty.speed),
        xp: Number(json.xp ?? starting["1"] ?? empty.xp),
        inspiration: Number(json.inspiration ?? empty.inspiration),
        victories: Number(json.victories ?? empty.victories),
        focusFeatures: Array.isArray(json.focusFeatures) ? json.focusFeatures : empty.focusFeatures,
        reactions: Array.isArray(json.reactions)
            ? (json.reactions as unknown[]).map(normalizeReactionRef)
            : empty.reactions,
        actions: Array.isArray(json.actions)
            ? (json.actions as unknown[]).map(normalizeActionRef)
            : empty.actions,
        actionLayout: sanitizeActionLayout(json.actionLayout),
        skills: sanitizeSkillsFromImport(Array.isArray(json.skills) ? json.skills : empty.skills),
        creatorSkillGrantPicks: sanitizeCreatorSkillGrantPicks(json.creatorSkillGrantPicks),
        money: Number(json.money ?? empty.money),
        ip: Number(json.ip ?? empty.ip),
        inventory: Array.isArray(json.inventory)
            ? (json.inventory
                  .map((entry: any) => {
                      if (!entry || entry.id == null || entry.uid == null) return null;
                      const row: InventoryEntry = {
                          id: String(entry.id),
                          uid: String(entry.uid),
                      };
                      if (entry.quantity != null) row.quantity = Number(entry.quantity);
                      if (entry.containerId !== undefined)
                          row.containerId = entry.containerId === null ? null : String(entry.containerId);
                      if (typeof entry.customName === "string" && entry.customName.trim())
                          row.customName = entry.customName.trim();
                      if (typeof entry.rank === "string" && entry.rank.trim())
                          row.rank = entry.rank.trim();
                      if (Array.isArray(entry.inventionModules)) {
                          row.inventionModules = entry.inventionModules
                              .map((x: unknown) => String(x ?? "").trim())
                              .filter(Boolean);
                      }
                      const imc = sanitizeInventionModuleConfig(entry.inventionModuleConfig);
                      if (imc) row.inventionModuleConfig = imc;
                      const ch = sanitizeRefCharges(entry.charges);
                      if (ch !== undefined) row.charges = ch;
                      return row;
                  })
                  .filter(Boolean) as InventoryEntry[])
            : empty.inventory,
        equipment: {
            ...empty.equipment,
            ...(json.equipment || {}),
            accessories: migrateAccessories({
                ...empty.equipment.accessories,
                ...(json.equipment?.accessories || {}),
            }),
        },
        bondTargets: sanitizeBondTargetsFromCharacterJson(
            json as Record<string, unknown>,
            getRulesSystem(rulesData)
        ),
        traits: [],
        containers: Array.isArray(json.containers)
            ? json.containers
                  .filter((c: any) => c && c.id != null && c.name != null)
                  .map((c: any) => ({
                      id: String(c.id),
                      name: String(c.name),
                  }))
            : empty.containers,
        cultureEnvironment:
            json.cultureEnvironment != null && json.cultureEnvironment !== ""
                ? String(json.cultureEnvironment)
                : empty.cultureEnvironment,
        cultureOrganization:
            json.cultureOrganization != null && json.cultureOrganization !== ""
                ? String(json.cultureOrganization)
                : empty.cultureOrganization,
        cultureUpbringing:
            json.cultureUpbringing != null && json.cultureUpbringing !== ""
                ? String(json.cultureUpbringing)
                : empty.cultureUpbringing,
        occupation:
            json.occupation != null && json.occupation !== ""
                ? String(json.occupation)
                : empty.occupation,
        attributeLevelBonuses,
        priestDeity:
            json.priestDeity != null && String(json.priestDeity).trim() !== ""
                ? String(json.priestDeity).trim().toLowerCase()
                : empty.priestDeity ?? null,
        riderMountType:
            json.riderMountType != null && String(json.riderMountType).trim() !== ""
                ? String(json.riderMountType).trim().toLowerCase()
                : empty.riderMountType ?? null,
        riderAdaptableMovement:
            json.riderAdaptableMovement === "swimming" || json.riderAdaptableMovement === "climbing"
                ? json.riderAdaptableMovement
                : empty.riderAdaptableMovement ?? null,
        mountedCreatureId:
            json.mountedCreatureId != null && String(json.mountedCreatureId).trim() !== ""
                ? String(json.mountedCreatureId).trim()
                : empty.mountedCreatureId ?? null,
        conjurerSummonTemplateIds: Array.isArray(json.conjurerSummonTemplateIds)
            ? (json.conjurerSummonTemplateIds as unknown[]).map((x) => String(x ?? "").trim())
            : empty.conjurerSummonTemplateIds ?? [],
        druidAnimaTemplateIds: Array.isArray(json.druidAnimaTemplateIds)
            ? (json.druidAnimaTemplateIds as unknown[]).map((x) => String(x ?? "").trim())
            : empty.druidAnimaTemplateIds ?? [],
        activeDruidAnimaTemplateId:
            json.activeDruidAnimaTemplateId != null && String(json.activeDruidAnimaTemplateId).trim() !== ""
                ? String(json.activeDruidAnimaTemplateId).trim()
                : null,
        equipmentBeforeAnima:
            json.equipmentBeforeAnima && typeof json.equipmentBeforeAnima === "object"
                ? (json.equipmentBeforeAnima as Equipment)
                : null,
        animaBarrierBonus:
            json.animaBarrierBonus != null && Number.isFinite(Number(json.animaBarrierBonus))
                ? Math.max(0, Math.floor(Number(json.animaBarrierBonus)))
                : null,
        fairyTamerContracts:
            json.fairyTamerContracts != null
                ? parseFairyTamerContractsFromImport(json.fairyTamerContracts)
                : empty.fairyTamerContracts ?? emptyFairyTamerContracts(),
        creatures: Array.isArray(json.creatures)
            ? (json.creatures as any[])
                  .filter((c) => c && typeof c.id === "string" && typeof c.templateId === "string")
                  .map((c) => {
                      const kindRaw = c.kind
                      const kind =
                          kindRaw === "summon"
                              ? ("summon" as const)
                              : kindRaw === "minion"
                                ? ("minion" as const)
                                : ("assistant" as const)
                      const rosterSource =
                          typeof c.rosterSource === "string" ? String(c.rosterSource) : undefined
                      const pickedActionCardIds = Array.isArray(c.pickedActionCardIds)
                          ? (c.pickedActionCardIds as unknown[])
                                .map((x) => String(x ?? "").trim())
                                .filter(Boolean)
                          : undefined
                      return {
                          id: String(c.id),
                          templateId: String(c.templateId),
                          kind,
                          deployed: Boolean(c.deployed),
                          unlockFeatId: typeof c.unlockFeatId === "string" ? c.unlockFeatId : undefined,
                          rosterSource:
                              rosterSource === "feat" ||
                              rosterSource === "conjurer" ||
                              rosterSource === "fairyTamer" ||
                              rosterSource === "rider" ||
                              rosterSource === "inventory" ||
                              rosterSource === "druidAnima"
                                  ? rosterSource
                                  : undefined,
                          sourceItemUid: typeof c.sourceItemUid === "string" ? c.sourceItemUid : undefined,
                          pickedActionCardIds,
                          customName: typeof c.customName === "string" ? c.customName : undefined,
                          notes: typeof c.notes === "string" ? c.notes : undefined,
                          currentHp: typeof c.currentHp === "number" ? c.currentHp : undefined,
                          maxHp: typeof c.maxHp === "number" ? c.maxHp : undefined,
                          currentMp: typeof c.currentMp === "number" ? c.currentMp : undefined,
                          maxMp: typeof c.maxMp === "number" ? c.maxMp : undefined,
                      }
                  })
            : empty.creatures ?? [],
        bondedWeaponUids: sanitizeBondedWeaponUids(json.bondedWeaponUids),
        combatDefenseDelta: sanitizeCombatDefenseDelta(json.combatDefenseDelta),
        combatStabilityDelta: sanitizeCombatStatDelta(json.combatStabilityDelta),
        combatSpeedDelta: sanitizeCombatStatDelta(json.combatSpeedDelta),
        maintainActive: Boolean(json.maintainActive),
        specialInvention: sanitizeSpecialInvention(json.specialInvention),
    };
}

/** Map an exported / sheet-style character JSON into creator UI state. */
export function parseCreatorImportJson(
    raw: unknown,
    emptyTemplate: CharacterSaveData
): CreatorImportResult | { error: string } {
    if (raw === null || typeof raw !== "object") {
        return { error: "Invalid JSON: expected an object." };
    }
    const json = raw as any;

    const merged = mergeImportedCharData(json, emptyTemplate);
    const raceKey = merged.race;
    const innateIds = raceKey ? getInnateRacialIds(raceKey) : new Set<string>();

    const traitsRaw = Array.isArray(json.traits) ? json.traits : [];
    merged.traits = traitsRaw
        .filter(
            (t: any) =>
                normalizeSource(t?.source) === "racial" &&
                t?.id &&
                !innateIds.has(String(t.id))
        )
        .map(normalizeTraitRef);

    const starting = getStartingXPPerLevel();
    const adventurerLevel = adventurerLevelFromXp(merged.xp, starting);

    const picks = skillPickIdsFromImport(Array.isArray(json.skills) ? json.skills : []);
    const cultureSkills = picks.slice(0, 3);
    const occRoot = getOccupationRules(rulesData);
    const occDef = getOccupationDefinition(occRoot, merged.occupation);
    const occCount = resolveOccupationSkillsCount(occDef);
    const occupationSkills = picks.slice(3, 3 + occCount);

    return {
        charData: merged,
        adventurerLevel,
        classSelections: inferClassSelections(json),
        levelBonuses: merged.attributeLevelBonuses ?? {},
        cultureSkills,
        occupationSkills,
        occupationLanguages: languageIdsFromImport(json.languages),
        selectedFeats: inferSelectedFeats(traitsRaw),
    };
}

export type SpecialInventionRulesConfig = {
    variants?: Record<
        string,
        {
            grants?: string[];
            modulePick?: number;
            moduleItemId?: string;
        }
    >;
    weaponInfusionDamageTypes?: string[];
    modules?: Record<
        string,
        { passiveId?: string; passiveIdPrefix?: string; grantItemId?: string }
    >;
};

export function sanitizeRefCharges(raw: unknown): number | undefined {
    const n = Number(raw)
    if (!Number.isFinite(n)) return undefined
    return Math.max(-1, Math.floor(n))
}

function getArtificerSpecialInventionRules(rules?: {
    classes?: { artificer?: { specialInvention?: SpecialInventionRulesConfig } };
}): SpecialInventionRulesConfig {
    const r = rules ?? rulesData;
    return (r.classes as { artificer?: { specialInvention?: SpecialInventionRulesConfig } } | undefined)
        ?.artificer?.specialInvention ?? {};
}

function getSpecialInventionRules(): SpecialInventionRulesConfig {
    return getArtificerSpecialInventionRules();
}

function inventionModulePoolForItem(itemId: string): string[] {
    const item = getItemRule(itemId, rulesData) as { inventionModulePool?: string[] } | undefined;
    return Array.isArray(item?.inventionModulePool) ? item.inventionModulePool : [];
}

function allowedModulesForVariant(variant: InventionVariant): string[] {
    const cfg = getSpecialInventionRules().variants?.[variant];
    const itemId = cfg?.moduleItemId;
    return itemId ? inventionModulePoolForItem(itemId) : [];
}

export function formatWeaponInfusionDamageLabel(dt: WeaponInfusionDamageType): string {
    return dt.charAt(0).toUpperCase() + dt.slice(1);
}

export function getWeaponInfusionDamageTypes(): WeaponInfusionDamageType[] {
    const raw = getSpecialInventionRules().weaponInfusionDamageTypes ?? [];
    const allowed = new Set(["volt", "water", "fire", "earth"]);
    return raw.filter((d): d is WeaponInfusionDamageType => allowed.has(String(d)));
}

export function sanitizeInventionModuleConfig(raw: unknown): InventionModuleConfig | undefined {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const wi = (raw as Record<string, unknown>).weaponInfusion;
    if (wi == null || typeof wi !== "object" || Array.isArray(wi)) return undefined;
    const dt = (wi as Record<string, unknown>).damageType;
    if (
        typeof dt !== "string" ||
        !getWeaponInfusionDamageTypes().includes(dt as WeaponInfusionDamageType)
    ) {
        return undefined;
    }
    return { weaponInfusion: { damageType: dt as WeaponInfusionDamageType } };
}

export function sanitizeSpecialInvention(raw: unknown): SpecialInventionSave | undefined {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
    const o = raw as Record<string, unknown>;
    const variant = o.variant;
    const variants = getSpecialInventionRules().variants ?? {};
    if (typeof variant !== "string" || !variants[variant]) return undefined;

    const pickModules = (arr: unknown, allowed: readonly string[]) => {
        if (!Array.isArray(arr)) return undefined;
        const out: string[] = [];
        for (const x of arr) {
            const id = String(x ?? "").trim();
            if (allowed.includes(id) && !out.includes(id)) out.push(id);
        }
        return out.length ? out : undefined;
    };

    const v = variant as InventionVariant;
    const armorModules =
        v === "modularArmor" ? pickModules(o.armorModules, allowedModulesForVariant(v)) : undefined;
    const backpackModules =
        v === "supportBackpack"
            ? pickModules(o.backpackModules, allowedModulesForVariant(v))
            : undefined;

    let weaponInfusionDamageType: WeaponInfusionDamageType | undefined;
    const rawDt = o.weaponInfusionDamageType;
    if (
        typeof rawDt === "string" &&
        getWeaponInfusionDamageTypes().includes(rawDt as WeaponInfusionDamageType)
    ) {
        weaponInfusionDamageType = rawDt as WeaponInfusionDamageType;
    }

    return {
        variant: v,
        armorModules,
        backpackModules,
        weaponInfusionDamageType,
    };
}

export function artificerHasSpecialInventionPassive(
    classSelections: readonly { id: string; source: string }[],
    classes: readonly { id: string; level: number }[]
): boolean {
    const artificerLevel = classes.find((c) => c.id === "artificer")?.level ?? 0;
    if (artificerLevel < 3) return false;
    return classSelections.some((s) => s.source === "artificer" && s.id === "specialInvention");
}

export function isSpecialInventionSaveComplete(
    save: SpecialInventionSave | undefined | null
): boolean {
    if (!save?.variant) return false;
    const variantCfg = getSpecialInventionRules().variants?.[save.variant];
    if (!variantCfg) return false;

    const pickCount = variantCfg.modulePick ?? 0;
    if (save.variant === "modularArmor") {
        const mods = save.armorModules ?? [];
        const allowed = allowedModulesForVariant("modularArmor");
        if (mods.length !== pickCount) return false;
        if (!mods.every((m) => allowed.includes(m))) return false;
    }

    if (save.variant === "supportBackpack") {
        const mods = save.backpackModules ?? [];
        const allowed = allowedModulesForVariant("supportBackpack");
        if (mods.length !== pickCount) return false;
        if (!mods.every((m) => allowed.includes(m))) return false;
        if (mods.includes("weaponInfusion") && !save.weaponInfusionDamageType) return false;
    }

    return true;
}

export function specialInventionIncompleteMessage(
    save: SpecialInventionSave | undefined | null,
    needsPassive: boolean
): string | null {
    if (needsPassive && !save) {
        return "Complete your Special Invention choice on the Classes step.";
    }
    if (!save) return null;
    if (!isSpecialInventionSaveComplete(save)) {
        if (save.variant === "modularArmor") {
            return "Modular Armor requires exactly two module picks.";
        }
        if (save.variant === "supportBackpack") {
            if ((save.backpackModules ?? []).includes("weaponInfusion") && !save.weaponInfusionDamageType) {
                return "Weapon Infusion requires a damage type (volt, water, fire, or earth).";
            }
            return "Support Backpack requires exactly two module picks.";
        }
        return "Complete your Special Invention choice on the Classes step.";
    }
    return null;
}

function makeInventionInventoryEntry(
    itemId: string,
    extra?: Partial<InventoryEntry>
): InventoryEntry {
    return { id: itemId, uid: makeInventoryUid(itemId), ...extra };
}

/** Append invention items to inventory; does not duplicate ids already present. */
export function applySpecialInventionGrants(char: CharacterSaveData): CharacterSaveData {
    const save = char.specialInvention;
    if (!save || !isSpecialInventionSaveComplete(save)) return char;

    const variantCfg = getSpecialInventionRules().variants?.[save.variant];
    const grantIds = variantCfg?.grants ?? [];
    const siModules = getSpecialInventionRules().modules ?? {};

    const existingIds = new Set((char.inventory ?? []).map((e) => e.id));
    const toAdd: InventoryEntry[] = [];

    const push = (itemId: string, extra?: Partial<InventoryEntry>) => {
        if (existingIds.has(itemId)) return;
        toAdd.push(makeInventionInventoryEntry(itemId, extra));
        existingIds.add(itemId);
    };

    for (const itemId of grantIds) {
        if (save.variant === "modularArmor" && itemId === "arm_artificer_armor") {
            push(itemId, { inventionModules: [...(save.armorModules ?? [])] });
        } else if (save.variant === "supportBackpack" && itemId === "gear_support_backpack") {
            const config: InventionModuleConfig | undefined = save.weaponInfusionDamageType
                ? { weaponInfusion: { damageType: save.weaponInfusionDamageType } }
                : undefined;
            push(itemId, {
                inventionModules: [...(save.backpackModules ?? [])],
                inventionModuleConfig: config,
            });
        } else {
            push(itemId);
        }
    }

    if (save.variant === "modularArmor" && (save.armorModules ?? []).includes("robotTail")) {
        const tailId = siModules.robotTail?.grantItemId ?? "wp_robot_tail";
        push(tailId);
    }

    if (!toAdd.length) return char;
    return {
        ...char,
        specialInvention: save,
        inventory: [...(char.inventory ?? []), ...toAdd],
    };
}
