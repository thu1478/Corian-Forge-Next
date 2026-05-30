import React, { useMemo } from "react";
import rulesData from "@/lib/rules.json";
import {
  CharacterSaveData,
  computeMaxHP,
  computeMaxMP,
  computeSpeed,
  getCharacterLevelForStats,
  sumClassStatBonus,
  sumGearStatBonus,
  sumTraitStatChangeEffects,
} from "@/lib/character-data";
import {
  reconcileCreatureRoster,
  getCreatureTemplates,
  getActionCardIdsForCreatureEntry,
} from "@/lib/creature-roster";
import { FeatLevelPick } from "@/lib/baseRefs";
import { discoverAllTraitRefs } from "@/components/character-sheet/hooks/DataLoader";
import { hydrateTraitRefs } from "@/components/character-sheet/hooks/statCalculator";
import { TraitPowerRollCollapsible } from "@/components/power-roll/trait-power-roll-collapsible";
import type { PowerRoll } from "@/lib/rules";
import { ChevronLeftIcon, DownloadIcon, RotateCcwIcon, Heart, Droplets, Footprints, Swords } from "lucide-react";
import {
  applySpecialInventionGrants,
  artificerHasSpecialInventionPassive,
  specialInventionIncompleteMessage,
} from "@/lib/creator-import";
import {
  initialChargesForNewEntry,
  lookupChargeDefinition,
  type RulesWithCharges,
} from "@/lib/charge-helpers";

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence";

interface CharacterReviewProps {
  charData: CharacterSaveData;
  adventurerLevel: number;
  levelBonuses: Partial<Record<number, AttributeKey>>;
  classSelections: {
    id: string;
    source: string;
    selectedEffectIndices?: number[];
    fairySpellSlot?: 0 | 1 | 2 | 3;
  }[];
  selectedFeats: Partial<Record<number, FeatLevelPick>>;
  selectedSkillIds: string[];
  occupationLanguages: string[];
  skillGrantsComplete?: boolean;
  onUpdateField: (field: string, value: string | number) => void;
  onStartOver: () => void;
  onBack: () => void;
}

const ATTRS: { id: AttributeKey; name: string }[] = [
  { id: "might", name: "Might" },
  { id: "dexterity", name: "Dexterity" },
  { id: "reason", name: "Reason" },
  { id: "willpower", name: "Willpower" },
  { id: "presence", name: "Presence" }
];

export function CharacterReview({
  charData,
  adventurerLevel,
  levelBonuses,
  classSelections,
  selectedFeats,
  selectedSkillIds,
  occupationLanguages,
  skillGrantsComplete = true,
  onUpdateField,
  onStartOver,
  onBack
}: CharacterReviewProps) {
  const finalAttributes = useMemo(() => {
    const attrs = { ...charData.attributes };
    Object.values(levelBonuses).forEach((attr) => {
      if (attr) attrs[attr] += 1;
    });
    return attrs;
  }, [charData.attributes, levelBonuses]);

  /** Same trait refs as export JSON so review stats match the character sheet after import. */
  const traitsAlignedWithExport = useMemo(() => {
    const raceKey = charData.race?.toLowerCase?.();
    const innateRefs =
      raceKey && (rulesData.races as Record<string, any>)[raceKey]?.passives
        ? Object.entries((rulesData.races as Record<string, any>)[raceKey].passives)
            .filter(([, passive]: [string, any]) => passive.type === "innate")
            .map(([id]) => ({ id, source: "racial" as const }))
        : [];
    const classTraits: { id: string; source: string; selectedEffectIndices?: number[] }[] = [];
    classSelections.forEach((sel) => {
      const classData = (rulesData.classes as Record<string, any>)[sel.source];
      if (classData?.passives?.[sel.id]) {
        const row: { id: string; source: "class"; selectedEffectIndices?: number[] } = {
          id: sel.id,
          source: "class",
        };
        if (sel.selectedEffectIndices?.length) {
          row.selectedEffectIndices = sel.selectedEffectIndices;
        }
        classTraits.push(row);
      }
    });
    const featTraits = Object.entries(selectedFeats)
      .filter(([, p]) => p?.id)
      .map(([_, p]) => ({
        id: p!.id,
        source: "feat" as const,
        ...(p!.selectedEffectIndices?.length
          ? { selectedEffectIndices: p!.selectedEffectIndices }
          : {}),
      }));
    return [...innateRefs, ...charData.traits, ...classTraits, ...featTraits];
  }, [charData.race, charData.traits, classSelections, selectedFeats]);

  const charForDerivedStats = useMemo(() => {
    const base = { ...charData, traits: traitsAlignedWithExport };
    return applySpecialInventionGrants(base);
  }, [charData, traitsAlignedWithExport]);

  const creaturesPreview = useMemo(
    () =>
      reconcileCreatureRoster(charData.creatures ?? [], traitsAlignedWithExport, rulesData as any, {
        classes: charData.classes,
        inventory: charData.inventory,
        conjurerSummonTemplateIds: charData.conjurerSummonTemplateIds,
        druidAnimaTemplateIds: charData.druidAnimaTemplateIds,
        fairyTamerContracts: charData.fairyTamerContracts,
        riderMountType: charData.riderMountType ?? null,
      }),
    [charData.creatures, charData.classes, charData.conjurerSummonTemplateIds, charData.druidAnimaTemplateIds, charData.fairyTamerContracts, charData.riderMountType, traitsAlignedWithExport]
  );

  const creatureTemplates = useMemo(
    () => getCreatureTemplates(rulesData as any),
    []
  );

  const specialInventionNeeded = artificerHasSpecialInventionPassive(
    classSelections,
    charData.classes
  );
  const specialInventionBlockMessage = specialInventionIncompleteMessage(
    charData.specialInvention,
    specialInventionNeeded
  );
  const exportReady = skillGrantsComplete && !specialInventionBlockMessage;

  const exportCharacter = () => {
    if (!exportReady) return;
    const raceData = (rulesData.races as Record<string, any>)[charData.race];
    const raceKey = charData.race?.toLowerCase?.();
    const innateTraitRefs =
      raceKey && (rulesData.races as Record<string, any>)[raceKey]?.passives
        ? Object.entries((rulesData.races as Record<string, any>)[raceKey].passives)
            .filter(([, passive]: [string, any]) => passive.type === "innate")
            .map(([id]) => ({ id, source: "racial" as const }))
        : [];
    const attrsForCharges = finalAttributes;
    const classTraits: { id: string; source: string; selectedEffectIndices?: number[]; charges?: number }[] = [];
    const actions: { id: string; charges?: number }[] = [];
    const reactions: { id: string; slotIndex: number; charges: number }[] = [];
    const pushAction = (id: string) => {
      const def = lookupChargeDefinition("action", id, rulesData as RulesWithCharges);
      const ch = initialChargesForNewEntry(def, attrsForCharges);
      actions.push(ch >= 0 ? { id, charges: ch } : { id });
    };
    const pushReaction = (id: string) => {
      const def = lookupChargeDefinition("reaction", id, rulesData as RulesWithCharges);
      const ch = initialChargesForNewEntry(def, attrsForCharges);
      reactions.push({ id, slotIndex: -1, charges: ch });
    };
    const pushTrait = (row: { id: string; source: string; selectedEffectIndices?: number[] }) => {
      const def = lookupChargeDefinition("trait", row.id, rulesData as RulesWithCharges);
      const ch = initialChargesForNewEntry(def, attrsForCharges);
      classTraits.push(ch >= 0 ? { ...row, charges: ch } : row);
    };
    classSelections.forEach((sel) => {
      const classData = (rulesData.classes as Record<string, any>)[sel.source];
      if (classData?.passives?.[sel.id]) {
        const row: { id: string; source: "class"; selectedEffectIndices?: number[] } = {
          id: sel.id,
          source: "class",
        };
        if (sel.selectedEffectIndices?.length) row.selectedEffectIndices = sel.selectedEffectIndices;
        pushTrait(row);
      }
      if (classData?.actions?.[sel.id]) pushAction(sel.id);
      if (
        sel.source === "fairytamer" &&
        sel.fairySpellSlot != null &&
        String(sel.id).startsWith("fairy/")
      ) {
        const card = (rulesData as Record<string, any>).actionCards?.[sel.id];
        const cardType =
          typeof card?.type === "string" ? String(card.type).toLowerCase() : "";
        if (cardType === "reaction") {
          pushReaction(sel.id);
        } else {
          pushAction(sel.id);
        }
      }
      if ((classData?.reactions || []).some((r: any) => r.id === sel.id)) {
        pushReaction(sel.id);
      }
    });

    const featTraits = Object.entries(selectedFeats)
      .filter(([, p]) => p?.id)
      .map(([_, p]) => {
        const row = {
          id: p!.id,
          source: "feat" as const,
          ...(p!.selectedEffectIndices?.length
            ? { selectedEffectIndices: p!.selectedEffectIndices }
            : {}),
        };
        const def = lookupChargeDefinition("trait", row.id, rulesData as RulesWithCharges);
        const ch = initialChargesForNewEntry(def, attrsForCharges);
        return ch >= 0 ? { ...row, charges: ch } : row;
      });

    const skillCounts: Record<string, number> = {};
    selectedSkillIds.forEach((skillId) => {
      skillCounts[skillId] = (skillCounts[skillId] || 0) + 1;
    });
    const skills = Object.entries(skillCounts).map(([id, count]) => {
      const skill = (rulesData.system.skills as Record<string, any>)[id];
      return {
        name: skill?.name ?? id,
        hasExpertise: count > 1
      };
    });

    const languageNames = occupationLanguages
      .map((id) => (rulesData.system.languages as Record<string, any>)[id]?.name ?? id)
      .filter(Boolean);

    const allExportTraits = [
      ...innateTraitRefs.map((t) => {
        const def = lookupChargeDefinition("trait", t.id, rulesData as RulesWithCharges);
        const ch = initialChargesForNewEntry(def, attrsForCharges);
        return ch >= 0 ? { ...t, charges: ch } : t;
      }),
      ...charData.traits.map((t) => {
        const def = lookupChargeDefinition("trait", t.id, rulesData as RulesWithCharges);
        const ch = initialChargesForNewEntry(def, attrsForCharges);
        return ch >= 0 ? { ...t, charges: ch } : t;
      }),
      ...classTraits,
      ...featTraits,
    ];
    const withInvention = applySpecialInventionGrants({
      ...charData,
      attributes: finalAttributes,
      attributeLevelBonuses: levelBonuses,
      traits: allExportTraits,
    });
    const output = {
      ...withInvention,
      occupation: charData.occupation ?? null,
      theme: charData.background,
      race: raceData?.name ?? charData.race,
      xp: charData.xp,
      actions,
      reactions,
      conjurerSummonTemplateIds: charData.conjurerSummonTemplateIds ?? [],
      druidAnimaTemplateIds: charData.druidAnimaTemplateIds ?? [],
      activeDruidAnimaTemplateId: null,
      equipmentBeforeAnima: null,
      animaBarrierBonus: null,
      creatures: reconcileCreatureRoster(charData.creatures ?? [], allExportTraits, rulesData as any, {
        classes: charData.classes,
        inventory: charData.inventory,
        conjurerSummonTemplateIds: charData.conjurerSummonTemplateIds,
        druidAnimaTemplateIds: charData.druidAnimaTemplateIds,
        fairyTamerContracts: charData.fairyTamerContracts,
        riderMountType: charData.riderMountType ?? null,
      }),
      focusFeatures: charData.classes.map((c) => ({ classSrc: c.id, slotIndex: -1 })),
      skills,
      languages: Array.from(new Set(languageNames.map((name) => String(name))))
    };

    const fileName = `${(charData.name || "unnamed").replace(/\s+/g, "_")}_character.json`;
    const data = JSON.stringify(output, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const summaryStats = useMemo(() => {
    const traitRefs = discoverAllTraitRefs(charForDerivedStats, rulesData);
    const activeTraits = hydrateTraitRefs(traitRefs, charForDerivedStats, rulesData);
    const characterLevel = getCharacterLevelForStats(charData.classes);
    const effectiveMight =
      finalAttributes.might +
      sumTraitStatChangeEffects(activeTraits, "might") +
      sumGearStatBonus(charForDerivedStats, "might");
    const effectiveWillpower =
      finalAttributes.willpower +
      sumTraitStatChangeEffects(activeTraits, "willpower") +
      sumGearStatBonus(charForDerivedStats, "willpower");
    return {
      maxHP: computeMaxHP({
        effectiveMight,
        characterLevel,
        classHpBonus: sumClassStatBonus(charData.classes, rulesData, "hp"),
        gearHpBonus: sumGearStatBonus(charForDerivedStats, "hp"),
        traitMaxHpBonus: sumTraitStatChangeEffects(activeTraits, "maxHP"),
      }),
      maxMP: computeMaxMP({
        effectiveWillpower,
        characterLevel,
        classMpBonus: sumClassStatBonus(charData.classes, rulesData, "mp"),
        gearMpBonus: sumGearStatBonus(charForDerivedStats, "mp"),
        traitMaxMpBonus: sumTraitStatChangeEffects(activeTraits, "maxMP"),
      }),
      speed: computeSpeed({
        classSpeedBonus: sumClassStatBonus(charData.classes, rulesData, "speed"),
        gearSpeedBonus: sumGearStatBonus(charForDerivedStats, "speed"),
        traitSpeedBonus: sumTraitStatChangeEffects(activeTraits, "speed"),
      }),
    };
  }, [charData.classes, charForDerivedStats, finalAttributes.might, finalAttributes.willpower]);

  const resolvedTraits = useMemo(() => {
    const raceDef = (rulesData.races as Record<string, any>)[charData.race];
    
    // 1. Get innate racial traits (automatically granted with race)
    const innateTraits: { id: string; name: string; description: string; powerRoll?: PowerRoll }[] = [];
    if (raceDef?.passives) {
      Object.entries(raceDef.passives).forEach(([id, passive]: [string, any]) => {
        if (passive.type === "innate") {
          innateTraits.push({
            id,
            name: passive.name || id,
            description: passive.description || "No description available.",
            powerRoll: passive.powerRoll,
          });
        }
      });
    }
    
    // 2. Get user-selected traits
    const selectedTraits = charData.traits.map((t) => {
      const racePassive = raceDef?.passives?.[t.id];
      const globalPassive = (rulesData.passives as Record<string, any>)?.[t.id];
      let classPassive: any = null;
      Object.values(rulesData.classes as Record<string, any>).some((c: any) => {
        if (c?.passives?.[t.id]) {
          classPassive = c.passives[t.id];
          return true;
        }
        return false;
      });
      const featDef = (rulesData.system.feats as Record<string, any>)?.[t.id];
      const resolved = racePassive || classPassive || globalPassive || featDef;
      return {
        id: t.id,
        name: resolved?.name ?? t.id,
        description: resolved?.description ?? "No description available.",
        powerRoll: resolved?.powerRoll as PowerRoll | undefined,
      };
    });
    
    // Combine: innate traits first, then selected traits
    return [...innateTraits, ...selectedTraits];
  }, [charData.race, charData.traits]);

  const resolvedSkills = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedSkillIds.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return Object.entries(counts).map(([id, count]) => {
      const skill = (rulesData.system.skills as Record<string, any>)[id];
      return {
        id,
        name: skill?.name ?? id,
        description: (skill?.description as string | undefined) ?? "",
        powerRoll: skill?.powerRoll as PowerRoll | undefined,
        expertise: count >= 2
      };
    });
  }, [selectedSkillIds]);

  const occupationLabel = useMemo(() => {
    const occ = (rulesData.system as { occupation?: Record<string, { name?: string }> }).occupation;
    const id = charData.occupation;
    if (!id || !occ?.[id]) return null;
    return occ[id].name ?? id;
  }, [charData.occupation]);

  const resolvedFeats = useMemo(() => {
    return Object.entries(selectedFeats)
      .filter(([, p]) => p?.id)
      .map(([levelKey, p]) => {
        const def = (rulesData.system.feats as Record<string, any>)[p!.id];
        return {
          key: `${levelKey}-${p!.id}`,
          name: def?.name ?? p!.id,
          level: Number(levelKey),
        };
      })
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [selectedFeats]);

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] min-h-0 max-w-6xl mx-auto px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="shrink-0 pt-8 pb-4 border-b border-border bg-background z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Character Review</h2>
            <p className="text-muted-foreground">Finalize details and export a playable JSON file.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold">
              <RotateCcwIcon className="w-4 h-4" /> Start Over
            </button>
            <button
              type="button"
              disabled={!exportReady}
              title={specialInventionBlockMessage ?? undefined}
              onClick={exportCharacter}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              <DownloadIcon className="w-4 h-4" /> Export JSON
            </button>
          </div>
        </div>
        {specialInventionBlockMessage ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{specialInventionBlockMessage}</p>
        ) : null}
        {!skillGrantsComplete ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Complete required skill grant picks before exporting.
          </p>
        ) : null}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Character Name</label>
            <input value={charData.name} onChange={(e) => onUpdateField("name", e.target.value)} placeholder="Character Name" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Age</label>
              <input type="number" value={charData.age} onChange={(e) => onUpdateField("age", Number(e.target.value))} placeholder="Age" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gender</label>
              <input value={charData.gender} onChange={(e) => onUpdateField("gender", e.target.value)} placeholder="Gender" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Theme</label>
            <input value={charData.background} onChange={(e) => onUpdateField("background", e.target.value)} placeholder="One word that summarizes your purpose or goals" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Backstory</label>
            <textarea value={charData.backstory} onChange={(e) => onUpdateField("backstory", e.target.value)} placeholder="Backstory" rows={8} className="w-full bg-background border border-border rounded-lg px-3 py-2" />
          </div>
        </div>

<div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <h3 className="font-black text-2xl mb-3">{charData.name || "Unnamed Hero"}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Race: {(rulesData.races as Record<string, any>)[charData.race]?.name ?? "Not selected"} | Adventurer Level{" "}
            {adventurerLevel}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Occupation: {occupationLabel ?? "—"}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg border border-border p-3 bg-background/60">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1"><Heart className="w-3 h-3" /> Max HP</div>
              <div className="text-xl font-black">{summaryStats.maxHP}</div>
            </div>
            <div className="rounded-lg border border-border p-3 bg-background/60">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1"><Droplets className="w-3 h-3" /> Max MP</div>
              <div className="text-xl font-black">{summaryStats.maxMP}</div>
            </div>
            <div className="rounded-lg border border-border p-3 bg-background/60 col-span-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1"><Footprints className="w-3 h-3" /> Speed</div>
              <div className="text-xl font-black">{summaryStats.speed}</div>
            </div>
          </div>
<div className="space-y-1 mb-5">
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 shrink-0" aria-hidden /> Classes
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              {charData.classes.length === 0 ? (
                <div className="text-base font-semibold text-foreground">None</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {charData.classes.map((c) => {
                    const name = (rulesData.classes as Record<string, any>)[c.id]?.name ?? c.id;
                    return (
                      <div
                        key={c.id}
                        className="min-w-0 flex-1 basis-[140px] rounded-md border border-border bg-background/60 px-3 py-2.5"
                      >
                        <div className="text-sm font-bold text-foreground leading-tight">{name}</div>
                        <div className="text-lg font-black tabular-nums text-foreground mt-0.5">Level {c.level}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Attributes</div>
            <div className="grid grid-cols-5 gap-1 sm:gap-2 rounded-lg border border-border bg-background/40 p-3">
              <div className="col-span-5 grid grid-cols-5 gap-1 sm:gap-2 text-center border-b border-border pb-2">
                {ATTRS.map((attr) => {
                  const total = finalAttributes[attr.id];
                  return (
                    <div key={attr.id} className="min-w-0">
                      <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground leading-tight truncate" title={attr.name}>
                        {attr.name}
                      </div>
                      <div className="text-lg sm:text-xl font-black tabular-nums">{total}</div>
                    </div>
                  );
                })}
              </div>
              <div className="col-span-5 grid grid-cols-5 gap-1 sm:gap-2 text-center pt-1">
                {ATTRS.map((attr) => {
                  const total = finalAttributes[attr.id];
                  const mod = Math.floor((total - 10) / 2);
                  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                  return (
                    <div key={`${attr.id}-mod`} className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {modStr}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Skills</div>
            <div className="space-y-2 mb-4 max-h-64 overflow-auto pr-1">
              {resolvedSkills.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border p-2 text-left ${
                    s.expertise
                      ? "border-purple-600 bg-purple-100/50 dark:bg-purple-900/30 dark:border-purple-500"
                      : "border-border bg-background/60"
                  }`}
                >
                  <div className="text-sm font-bold text-foreground">
                    {s.name}
                    {s.expertise ? (
                      <span className="ml-1 text-xs font-semibold text-purple-800 dark:text-purple-200">
                        (Expertise)
                      </span>
                    ) : null}
                  </div>
                  {s.description ? (
                    <div className="text-xs text-muted-foreground whitespace-pre-line mt-1">{s.description}</div>
                  ) : null}
                  {s.powerRoll && (
                    <TraitPowerRollCollapsible roll={s.powerRoll} attributes={finalAttributes} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Feats</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {resolvedFeats.length === 0 ? (
                <span className="text-xs text-muted-foreground">None</span>
              ) : (
                resolvedFeats.map((f) => (
                  <span
                    key={f.key}
                    className="text-xs px-2 py-1 rounded border bg-muted border-border text-foreground font-medium"
                  >
                    {f.name}
                  </span>
                ))
              )}
            </div>
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Creatures</div>
            <div className="mb-4 space-y-1.5">
              {creaturesPreview.length === 0 ? (
                <span className="text-xs text-muted-foreground">None (e.g. Trusty Companion adds an assistant on export)</span>
              ) : (
                creaturesPreview.map((c) => {
                  const tmpl = creatureTemplates[c.templateId];
                  const label = c.customName?.trim() || tmpl?.name || c.templateId;
                  const allIds = getActionCardIdsForCreatureEntry(c, traitsAlignedWithExport, rulesData as any);
                  const ac = rulesData.actionCards as Record<string, { name?: string; type?: string }> | undefined;
                  const actionLabels = allIds
                    .filter((id) => (ac?.[id]?.type ?? "action") === "action")
                    .map((id) => ac?.[id]?.name ?? id);
                  const reactionLabels = allIds
                    .filter((id) => {
                      const t = ac?.[id]?.type;
                      return t === "reaction" || t === "freeReaction";
                    })
                    .map((id) => ac?.[id]?.name ?? id);
                  return (
                    <div
                      key={c.id}
                      className="text-xs rounded-md border border-border bg-background/60 px-2 py-1.5 space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{label}</span>
                        <span className="text-muted-foreground capitalize">{c.kind}</span>
                        {c.deployed ? (
                          <span className="text-[10px] uppercase font-bold text-primary">Deployed</span>
                        ) : null}
                      </div>
                      {actionLabels.length > 0 ? (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Actions: </span>
                          {actionLabels.join(", ")}
                        </div>
                      ) : null}
                      {reactionLabels.length > 0 ? (
                        <div className="text-muted-foreground">
                          <span className="font-medium text-foreground">Reactions: </span>
                          {reactionLabels.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Traits</div>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {resolvedTraits.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-2 bg-background/60">
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-muted-foreground whitespace-pre-line">{t.description}</div>
                  {t.powerRoll && (
                    <TraitPowerRollCollapsible roll={t.powerRoll} attributes={finalAttributes} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      <footer className="shrink-0 py-4 pb-8 border-t border-border bg-background z-10">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-secondary-foreground bg-secondary">
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
      </footer>
    </div>
  );
}