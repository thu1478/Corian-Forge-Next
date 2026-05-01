"use client"

import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon, PlusIcon, MinusIcon, CheckCircleIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import rulesData from "@/lib/rules.json";
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager";

type LevelKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";

interface ClassSelectionProps {
    selectedOptions: { id: string; source: string }[];
    classes: { id: string; level: number }[];
    currentAdventurerLevel: number;
    attributes: {
        might: number; dexterity: number; reason: number; willpower: number; presence: number;
    };
    onUpdateLevel: (lvl: number) => void;
    onUpdateClassData: (classes: { id: string; level: number }[], traits: { id: string; source: string }[]) => void;
    onBack: () => void;
    onNext: () => void;
}

const ClassSelection: React.FC<ClassSelectionProps> = ({
                                                           selectedOptions,
                                                           classes,
                                                           currentAdventurerLevel,
                                                           attributes,
                                                           onUpdateLevel,
                                                           onUpdateClassData,
                                                           onBack,
                                                           onNext
                                                       }) => {
    const [adventurerLevel, setAdventurerLevel] = useState<number>(currentAdventurerLevel);
    const [localClasses, setLocalClasses] = useState<{ id: string; level: number }[]>(classes);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    useEffect(() => {
        setLocalClasses(classes);
    }, [classes]);

    useEffect(() => {
        setAdventurerLevel(currentAdventurerLevel);
    }, [currentAdventurerLevel]);

    // --- SYSTEM MATH ---
    const getStartingXP = (lvl: number) => (rulesData.system.startingXPPerLvl as Record<LevelKey, number>)[lvl.toString() as LevelKey] || 0;
    const calculateClassXPCost = (level: number): number => {
        let total = 0;
        for (let i = 1; i <= level; i++) total += (rulesData.system.xpCostPerLvl as Record<LevelKey, number>)[i.toString() as LevelKey] || 0;
        return total;
    };
    const getMaxClassXP = (level: number): number => {
        let total = 0;
        for (let i = 1; i <= level; i++) total += (i <= 4) ? 2 : 1;
        return total;
    };

    const totalBudget = getStartingXP(adventurerLevel);
    const spentBudget = localClasses.reduce((sum, c) => sum + calculateClassXPCost(c.level), 0);
    const remainingAdventurerXP = totalBudget - spentBudget;
    const hasAtLeastOneClass = localClasses.some((c) => c.level > 0);
    const allClassXPAssigned = localClasses.every((c) => {
        const spentInClass = selectedOptions.filter((o) => o.source === c.id).length;
        return spentInClass === getMaxClassXP(c.level);
    });

    // --- SELECTION LOGIC ---
    const handleToggleTalent = (optionId: string, sourceClassId: string) => {
        const isSelected = selectedOptions.some(s => s.id === optionId);
        if (isSelected) {
            onUpdateClassData(localClasses, selectedOptions.filter(s => s.id !== optionId));
            return;
        }

        const currentClassLevel = localClasses.find(c => c.id === sourceClassId)?.level || 0;
        const classData = (rulesData.classes as any)[sourceClassId];

        const getTalentLevel = (id: string) => {
            if (classData.passives?.[id]) return classData.passives[id].minLevel || 1;
            if (classData.actions?.[id]) return classData.actions[id].minLevel || 1;
            const react = (classData.reactions || []).find((r: any) => r.id === id);
            return react ? (react.level || react.minLevel || 1) : 1;
        };

        const classSelections = selectedOptions.filter(o => o.source === sourceClassId);
        if (classSelections.length >= getMaxClassXP(currentClassLevel)) return;

        const sortedTalentLevels = [...classSelections.map(s => getTalentLevel(s.id)), getTalentLevel(optionId)].sort((a, b) => b - a);
        const availablePackets: number[] = [];
        for (let l = 1; l <= currentClassLevel; l++) {
            const count = (l <= 4 ? 2 : 1);
            for (let j = 0; j < count; j++) availablePackets.push(l);
        }
        availablePackets.sort((a, b) => b - a);

        for (let i = 0; i < sortedTalentLevels.length; i++) {
            if (sortedTalentLevels[i] > availablePackets[i]) return;
        }

        onUpdateClassData(localClasses, [...selectedOptions, { id: optionId, source: sourceClassId }]);
    };

    const handleClassLevelChange = (id: string, delta: number) => {
        const current = localClasses.find(c => c.id === id)?.level || 0;
        const next = Math.max(0, Math.min(10, current + delta));
        const updated = next === 0 ? localClasses.filter(c => c.id !== id)
            : current === 0 ? [...localClasses, { id, level: next }]
                : localClasses.map(c => c.id === id ? { ...c, level: next } : c);
        setLocalClasses(updated);
        onUpdateClassData(updated, selectedOptions);
    };

    const renderTalentSection = (classId: string, type: 'passives' | 'actions' | 'reactions', lvl: number) => {
        const classData = (rulesData.classes as any)[classId];
        let talents: any[];

        if (type === 'reactions') {
            talents = (classData.reactions || []).filter((r: any) => (r.level || r.minLevel || 1) === lvl);
        } else {
            talents = Object.entries(classData[type] || {})
                .filter(([_, d]: any) => (d.minLevel || d.level || 1) === lvl)
                .map(([id, d]: any) => ({ ...d, id }));
        }

        if (talents.length === 0) return null;

        return (
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-primary tracking-widest border-l-2 border-primary pl-3">{type}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {talents.map((talent) => {
                        const id = talent.id;
                        const isSelected = selectedOptions.some(s => s.id === id);
                        const isLocked = (localClasses.find(c => c.id === classId)?.level || 0) < lvl;

                        // HYDRATION: Detect if actionCard is nested under a key or defined directly
                        let cardData = null;
                        if (talent.actionCard) {
                            const firstVal = Object.values(talent.actionCard)[0];
                            // If the first value is an object, it's keyed (like returnFire -> flareArrow)
                            const raw = (typeof firstVal === 'object' && firstVal !== null) ? firstVal : talent.actionCard;
                            cardData = {
                                ...raw,
                                id: id,
                                tags: (raw as any).tags || []
                            };
                        }

                        return (
                            <div key={id} className="relative h-full">
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 z-20 bg-primary text-white rounded-full p-1 shadow-lg border-2 border-background">
                                        <CheckCircleIcon size={16} />
                                    </div>
                                )}
                                <div onClick={() => !isLocked && handleToggleTalent(id, classId)} className={cn("transition-all h-full cursor-pointer", isSelected && "ring-2 ring-primary rounded-xl ring-offset-2 ring-offset-background", isLocked && "opacity-30 grayscale pointer-events-none")}>
                                    {!cardData ? (
                                        <div className={cn("p-5 rounded-xl border-2 transition-all bg-card h-full", isSelected ? "border-primary" : "border-border hover:border-primary/40")}>
                                            <h4 className="font-bold text-sm uppercase mb-1">{talent.name}</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed italic mb-2">{talent.trigger}</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{talent.description}</p>
                                        </div>
                                    ) : (
                                        <div className="pointer-events-none">
                                            <ActionCardComponent action={cardData} attributes={attributes} forceCollapsed={false} disabled={isLocked} currentWeapon={null} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- VIEW LOGIC ---
    if (expandedClassId) {
        const classData = (rulesData.classes as any)[expandedClassId];
        const currentClassLevel = localClasses.find(c => c.id === expandedClassId)?.level || 0;
        const spentInClass = selectedOptions.filter(o => o.source === expandedClassId).length;
        const maxInClass = getMaxClassXP(currentClassLevel);

        return (
            <div className="p-8 max-w-6xl mx-auto min-h-screen">
                <div className="flex justify-between items-center mb-12">
                    <button onClick={() => setExpandedClassId(null)} className="flex items-center gap-2 text-muted-foreground hover:text-primary font-black uppercase text-[14px] tracking-widest transition-colors">
                        <ArrowLeftIcon size={20} /> Back
                    </button>
                    <div className="bg-card border border-border px-6 py-3 rounded-2xl flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Class Talents</span>
                        <div className="text-2xl font-black">{spentInClass} <span className="text-sm opacity-30">/ {maxInClass}</span></div>
                    </div>
                </div>

                <header className="mb-16">
                    <div className="max-w-3xl space-y-6">
                        <h1 className="text-5xl font-black uppercase italic tracking-tighter">{classData.name}</h1>
                        {typeof classData.description === "string" && classData.description.trim() ? (
                            <p className="text-base leading-relaxed text-muted-foreground">
                                {classData.description}
                            </p>
                        ) : null}
                        {(classData.focusFeat?.name || classData.focusFeat?.description) ? (
                            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-primary">
                                    Focus feature
                                </p>
                                {classData.focusFeat?.name ? (
                                    <h2 className="mb-2 text-lg font-black uppercase italic tracking-tight text-foreground">
                                        {classData.focusFeat.name}
                                    </h2>
                                ) : null}
                                {typeof classData.focusFeat?.description === "string" &&
                                classData.focusFeat.description.trim() ? (
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {classData.focusFeat.description}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </header>

                <div className="space-y-24">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => {
                        const hasContent = ['passives', 'actions', 'reactions'].some(type => {
                            if (type === 'reactions') return (classData.reactions || []).some((r: any) => (r.level || r.minLevel || 1) === lvl);
                            return Object.values((classData[type] || {})).some((d: any) => (d.minLevel || d.level || 1) === lvl);
                        });
                        if (!hasContent) return null;
                        return (
                            <section key={lvl} className="space-y-10">
                                <h2 className="text-2xl font-black italic uppercase text-foreground/20">Level {lvl}</h2>
                                <div className="space-y-12 ml-4">
                                    {renderTalentSection(expandedClassId, 'passives', lvl)}
                                    {renderTalentSection(expandedClassId, 'actions', lvl)}
                                    {renderTalentSection(expandedClassId, 'reactions', lvl)}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto text-foreground">
            <header className="flex justify-between items-end mb-16">
                <div>
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter mb-4">Classes</h1>
                    <select value={adventurerLevel} onChange={(e) => {const v = Number(e.target.value); setAdventurerLevel(v); onUpdateLevel(v);}} className="bg-secondary p-3 rounded-xl font-black text-xs border border-border">
                        {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>Lvl {i+1} Adventurer</option>)}
                    </select>
                </div>
                <div className="text-right bg-card border border-border p-6 rounded-3xl">
                    <div className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Available XP</div>
                    <div className={cn("text-4xl font-black", remainingAdventurerXP < 0 ? 'text-destructive' : 'text-foreground')}>
                        {remainingAdventurerXP}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(rulesData.classes).map(([id, classData]: any) => {
                    const currentLevel = localClasses.find(c => c.id === id)?.level || 0;
                    const nextCost = (rulesData.system.xpCostPerLvl as any)[(currentLevel + 1).toString()] || 0;
                    const isComplete = getMaxClassXP(currentLevel) === selectedOptions.filter(o => o.source === id).length;

                    return (
                        <div key={id} className={cn("bg-card border-2 rounded-[2.5rem] p-8 transition-all", currentLevel > 0 ? "border-primary shadow-lg shadow-primary/5" : "border-border")}>
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6">
                                <div className="min-w-0 flex-1 pr-2">
                                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter break-words leading-tight">
                                        {classData.name}
                                    </h2>
                                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest block mt-1">
                                        Focus: {classData.focusFeat?.name ?? "None"}
                                    </span>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Next level XP cost: {currentLevel >= 10 ? "MAX" : nextCost}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-secondary rounded-full p-1 border border-border shrink-0 self-start">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleClassLevelChange(id, -1); }} className="p-1 rounded-full hover:bg-background/80"><MinusIcon size={14}/></button>
                                    <span className="font-black text-xs tabular-nums min-w-[1.25rem] text-center">{currentLevel}</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleClassLevelChange(id, 1); }} disabled={remainingAdventurerXP < nextCost} className="p-1 rounded-full hover:bg-background/80 disabled:opacity-40"><PlusIcon size={14}/></button>
                                </div>
                            </div>
                            <button onClick={() => setExpandedClassId(id)} disabled={currentLevel === 0} className={cn("w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all", currentLevel > 0 ? "bg-primary text-white shadow-xl shadow-primary/20" : "bg-muted text-muted-foreground")}>
                                Build {currentLevel > 0 && !isComplete && "(!)"}
                            </button>
                        </div>
                    );
                })}
            </div>
            <footer className="mt-20 flex justify-between items-center border-t border-border pt-10">
                <button onClick={onBack} className="font-black uppercase text-[10px] text-muted-foreground hover:text-foreground tracking-widest">Back</button>
                <button
                    onClick={onNext}
                    disabled={!hasAtLeastOneClass || remainingAdventurerXP < 0 || !allClassXPAssigned}
                    className={cn(
                        "px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest",
                        hasAtLeastOneClass && remainingAdventurerXP >= 0 && allClassXPAssigned
                            ? "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                >
                    Next Step
                </button>
            </footer>
        </div>
    );
};

export default ClassSelection;