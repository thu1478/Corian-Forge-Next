import rulesData from "@/lib/rules.json";
import { sanitizeBondTargetsFromCharacterJson } from "@/lib/bonds";
import {
    getOccupationDefinition,
    type OccupationRule,
    resolveOccupationSkillsCount,
} from "@/lib/occupation";
import { CharacterSaveData } from "@/lib/character-data";
import type { InventoryEntry } from "@/lib/equipment-data";
import { FeatLevelPick, TraitRef } from "@/lib/baseRefs";
import { CharAttribute } from "@/lib/rules";

/** Baseline character used when starting the creator or after full reset. */
export function createEmptyCreatorCharacter(): CharacterSaveData {
    const starting = rulesData.system.startingXPPerLvl as Record<string, number>;
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
            accessories: {
                head: null,
                face: null,
                ears: null,
                neck: null,
                back: null,
                hands: null,
                ringLeft: null,
                ringRight: null,
                waist: null,
                feet: null,
            },
        },
        bondTargets: [],
        containers: [],
        cultureEnvironment: null,
        cultureOrganization: null,
        cultureUpbringing: null,
        occupation: null,
        attributeLevelBonuses: {},
        priestDeity: null,
    };
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
    classSelections: { id: string; source: string }[];
    levelBonuses: Partial<Record<number, AttributeKey>>;
    cultureSkills: string[];
    occupationSkills: string[];
    occupationLanguages: string[];
    selectedFeats: Partial<Record<number, FeatLevelPick>>;
};

const FEAT_LEVEL_ORDER = [1, 3, 5, 7, 9, 10] as const;

function resolveRaceKey(raceValue: string): string {
    const r = raceValue?.trim();
    if (!r) return "";
    const races = rulesData.races as Record<string, any>;
    const lower = r.toLowerCase();
    if (races[lower]) return lower;
    const hit = Object.entries(races).find(
        ([, data]: [string, any]) => data?.name?.toLowerCase() === lower
    );
    return hit ? hit[0] : lower;
}

function getInnateRacialIds(raceKey: string): Set<string> {
    const passives = (rulesData.races as Record<string, any>)?.[raceKey]?.passives || {};
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
    return ref;
}

function adventurerLevelFromXp(xp: number | undefined, starting: Record<string, number>): number {
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
    const skills = rulesData.system.skills as Record<string, any>;
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
    const langs = rulesData.system.languages as Record<string, any>;
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

function inferClassSelections(json: any): { id: string; source: string }[] {
    const classes = rulesData.classes as Record<string, any>;
    const out: { id: string; source: string }[] = [];
    const seen = new Set<string>();

    const add = (talentId: string, classId: string) => {
        const k = `${classId}::${talentId}`;
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ id: talentId, source: classId });
    };

    const tryAllClasses = (talentId: string) => {
        for (const [classId, cdata] of Object.entries(classes)) {
            const cd = cdata as any;
            if (cd.passives?.[talentId]) add(talentId, classId);
            if (cd.actions?.[talentId]) add(talentId, classId);
            if ((cd.reactions || []).some((r: any) => r.id === talentId)) add(talentId, classId);
        }
    };

    for (const t of json.traits || []) {
        if (typeof t !== "object" || !t?.id) continue;
        if (normalizeSource(t.source) !== "class") continue;
        tryAllClasses(String(t.id));
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

    return out;
}

function inferSelectedFeats(traits: any[]): Partial<Record<number, FeatLevelPick>> {
    const featRefs = traits.filter(
        (t: any) => normalizeSource(t?.source) === "feat" && t?.id
    );
    const featsDef = rulesData.system.feats as Record<string, any>;
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
    const starting = rulesData.system.startingXPPerLvl as Record<string, number>;
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
        reactions: Array.isArray(json.reactions) ? json.reactions : empty.reactions,
        actions: Array.isArray(json.actions) ? json.actions : empty.actions,
        skills: Array.isArray(json.skills) ? json.skills : empty.skills,
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
                      return row;
                  })
                  .filter(Boolean) as InventoryEntry[])
            : empty.inventory,
        equipment: {
            ...empty.equipment,
            ...(json.equipment || {}),
            accessories: {
                ...empty.equipment.accessories,
                ...(json.equipment?.accessories || {}),
            },
        },
        bondTargets: sanitizeBondTargetsFromCharacterJson(
            json as Record<string, unknown>,
            rulesData.system
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

    const starting = rulesData.system.startingXPPerLvl as Record<string, number>;
    const adventurerLevel = adventurerLevelFromXp(merged.xp, starting);

    const picks = skillPickIdsFromImport(Array.isArray(json.skills) ? json.skills : []);
    const cultureSkills = picks.slice(0, 3);
    const occRoot = (rulesData.system as { occupation?: Record<string, OccupationRule> }).occupation;
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
