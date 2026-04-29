import React, { useMemo } from "react";
import rulesData from "@/lib/rules.json";
import { CharacterSaveData } from "@/lib/character-data";
import { ChevronLeftIcon, DownloadIcon, RotateCcwIcon, Heart, Droplets, Footprints, Swords } from "lucide-react";

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence";

interface CharacterReviewProps {
  charData: CharacterSaveData;
  adventurerLevel: number;
  levelBonuses: Partial<Record<number, AttributeKey>>;
  classSelections: { id: string; source: string }[];
  selectedFeats: Partial<Record<number, string>>;
  selectedSkillIds: string[];
  occupationLanguages: string[];
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

  const exportCharacter = () => {
    const raceData = (rulesData.races as Record<string, any>)[charData.race];
    const raceTraits = raceData
      ? Object.entries(raceData.passives || {})
          .filter(([id, passive]: [string, any]) =>
            passive.type === "innate" || charData.traits.some((t) => t.id === id)
          )
          .map(([id]) => ({ id, source: "racial" }))
      : [];

    const classTraits: { id: string; source: string }[] = [];
    const actions: { id: string }[] = [];
    const reactions: { id: string; slotIndex: number; charges: number }[] = [];
    classSelections.forEach((sel) => {
      const classData = (rulesData.classes as Record<string, any>)[sel.source];
      if (classData?.passives?.[sel.id]) classTraits.push({ id: sel.id, source: "class" });
      if (classData?.actions?.[sel.id]) actions.push({ id: sel.id });
      if ((classData?.reactions || []).some((r: any) => r.id === sel.id)) {
        reactions.push({ id: sel.id, slotIndex: -1, charges: 0 });
      }
    });

    const featTraits = Object.values(selectedFeats)
      .filter(Boolean)
      .map((id) => ({ id: id as string, source: "feat" }));

    const skillCounts: Record<string, number> = {};
    selectedSkillIds.forEach((skillId) => {
      skillCounts[skillId] = (skillCounts[skillId] || 0) + 1;
    });
    const skills = Object.entries(skillCounts).map(([id, count]) => {
      const skill = (rulesData.system.skills as Record<string, any>)[id];
      return {
        name: skill?.name ?? id,
        attribute: "reason",
        hasExpertise: count > 1
      };
    });

    const languageNames = occupationLanguages
      .map((id) => (rulesData.system.languages as Record<string, any>)[id]?.name ?? id)
      .filter(Boolean);

    const output = {
      ...charData,
      theme: charData.background,
      race: raceData?.name ?? charData.race,
      attributes: finalAttributes,
      xp: (rulesData.system.startingXPPerLvl as Record<string, number>)[String(adventurerLevel)] ?? charData.xp,
      actions,
      reactions,
      traits: [...raceTraits, ...classTraits, ...featTraits],
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
    let maxHP = 10;
    let maxMP = 10;
    let speed = 4;
    charData.classes.forEach((c) => {
      const classDef = (rulesData.classes as Record<string, any>)[c.id];
      const bonus = classDef?.statBonus;
      if (!bonus) return;
      const total = (bonus.amount ?? 0) * c.level;
      if (bonus.stat === "hp") maxHP += total;
      if (bonus.stat === "mp") maxMP += total;
    });
    return { maxHP, maxMP, speed };
  }, [charData.classes]);

  const resolvedTraits = useMemo(() => {
    const raceDef = (rulesData.races as Record<string, any>)[charData.race];
    return charData.traits.map((t) => {
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
        description: resolved?.description ?? "No description available."
      };
    });
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
        expertise: count >= 2
      };
    });
  }, [selectedSkillIds]);

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 p-8 max-w-6xl mx-auto overflow-y-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Character Review</h2>
          <p className="text-muted-foreground">Finalize details and export a playable JSON file.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onStartOver} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold">
            <RotateCcwIcon className="w-4 h-4" /> Start Over
          </button>
          <button onClick={exportCharacter} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold">
            <DownloadIcon className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

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
            <input value={charData.background} onChange={(e) => onUpdateField("background", e.target.value)} placeholder="Theme" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Backstory</label>
            <textarea value={charData.backstory} onChange={(e) => onUpdateField("backstory", e.target.value)} placeholder="Backstory" rows={8} className="w-full bg-background border border-border rounded-lg px-3 py-2" />
          </div>
        </div>

<div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <h3 className="font-black text-2xl mb-3">{charData.name || "Unnamed Hero"}</h3>
          <p className="text-sm text-muted-foreground mb-4">Race: {(rulesData.races as Record<string, any>)[charData.race]?.name ?? "Not selected"} | Adventurer Level {adventurerLevel}</p>
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
          <div className="text-sm text-muted-foreground mb-4">
            <div className="font-bold mb-1 flex items-center gap-1"><Swords className="w-3 h-3" /> Class Levels</div>
            <div>{charData.classes.length > 0 ? charData.classes.map((c) => `${(rulesData.classes as Record<string, any>)[c.id]?.name ?? c.id} ${c.level}`).join(", ") : "None"}</div>
          </div>
          <div className="space-y-2">
            {ATTRS.map((attr) => {
              const total = finalAttributes[attr.id];
              const mod = Math.floor((total - 10) / 2);
              return (
                <div key={attr.id} className="flex justify-between text-sm border-b border-border py-1">
                  <span>{attr.name}</span>
                  <span>{total} ({mod >= 0 ? `+${mod}` : mod})</span>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Skills</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {resolvedSkills.map((s) => (
                <span key={s.id} className={`text-xs px-2 py-1 rounded border ${s.expertise ? "bg-purple-900/40 border-purple-500 text-purple-200" : "bg-muted border-border text-foreground"}`}>
                  {s.name}{s.expertise ? " (Expertise)" : ""}
                </span>
              ))}
            </div>
            <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">Traits</div>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {resolvedTraits.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-2 bg-background/60">
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-secondary-foreground bg-secondary">
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
      </div>
    </div>
  );
}