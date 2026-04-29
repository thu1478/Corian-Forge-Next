import React, { useState, useMemo } from 'react';
import rulesData from "@/lib/rules.json";
import { ChevronRightIcon, ArrowLeftIcon, CheckIcon } from 'lucide-react';
import { RacialPassive } from "@/lib/rules";

interface RaceSelectionProps {
    raceId: string | null;
    raceSelectablePassives: string[];
    onSelectRace: (id: string) => void;
    onToggleSelectable: (passiveId: string) => void;
    onNext: () => void;
}

export function RaceSelection({ raceId, raceSelectablePassives, onSelectRace, onToggleSelectable, onNext }: RaceSelectionProps) {
    const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);

    const ALL_RACES = useMemo(() => {
        return Object.entries(rulesData.races as any).reduce((acc, [rId, r]) => {
            const race = r as any;
            return {
                ...acc,
                [rId]: {
                    name: race.name,
                    description: race.description,
                    passives: Object.entries(race.passives).map(([pId, p]: [string, any]) => ({
                        ...p,
                        id: pId,
                        source: "racial",
                        uid: `racial-${rId}-${pId}`,
                    })) as RacialPassive[]
                }
            };
        }, {} as Record<string, { name: string; description: string; passives: RacialPassive[] }>);
    }, []);

    const calculatePoints = (rId: string) => {
        const race = ALL_RACES[rId];
        return race?.passives
            .filter(p => raceSelectablePassives.includes(p.id))
            .reduce((total, p) => total + (p.ptCost || 0), 0) || 0;
    };

    const isRaceValid = (rId: string) => calculatePoints(rId) === 3;

    return (
        <div className="w-full max-w-7xl mx-auto px-8 py-8 min-h-screen flex flex-col text-slate-900 dark:text-slate-100">

            {expandedRaceId ? (
                /* --- EXPANDED VIEW --- */
                <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                    <button onClick={() => setExpandedRaceId(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 group">
                        <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        <span className="text-xs font-black uppercase tracking-widest">Return</span>
                    </button>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 lg:p-12 mb-6 shadow-xl">
                        <div className="flex justify-between items-start gap-8 mb-10">
                            <div className="max-w-2xl">
                                <h2 className="text-4xl font-black mb-3 italic uppercase tracking-tight">{ALL_RACES[expandedRaceId].name}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">{ALL_RACES[expandedRaceId].description}</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 text-center min-w-[100px]">
                                <div className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1">Loadout</div>
                                <div className={`text-2xl font-black tabular-nums ${calculatePoints(expandedRaceId) === 3 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {calculatePoints(expandedRaceId)}/3
                                </div>
                            </div>
                        </div>

                        {/*Expanded submit button*/}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <section>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-l-2 border-purple-500 pl-3">Innate Traits</h3>
                                <div className="grid gap-3">
                                    {ALL_RACES[expandedRaceId].passives.filter(p => p.type === 'innate').map(p => (
                                        <div key={p.uid} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <div className="font-bold text-sm uppercase italic mb-1">{p.name}</div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{p.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/*Selectable traits*/}
                            <section>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-l-2 border-purple-500 pl-3">Modular Augments</h3>
                                <div className="grid gap-2">
                                    {ALL_RACES[expandedRaceId].passives.filter(p => p.type === 'selectable').map(p => {
                                        const active = raceId === expandedRaceId && raceSelectablePassives.includes(p.id);
                                        return (
                                            <div
                                                key={p.uid}
                                                onClick={() => { if (raceId !== expandedRaceId) onSelectRace(expandedRaceId); onToggleSelectable(p.id); }}
                                                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none ${
                                                    active ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500 shadow-md' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                                                }`}
                                            >
                                                <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${active ? 'bg-purple-600 border-purple-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-300'}`}>
                                                    {active && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[4]" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className="text-sm font-bold uppercase italic">{p.name}</span>
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded italic">[{p.ptCost} PTS]</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{p.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>

                    <div className="flex justify-end mt-auto">
                        <button
                            onClick={() => {
                                // Ensure this race is the one active in charData
                                if (raceId !== expandedRaceId) onSelectRace(expandedRaceId);
                                // This calls handleFinalizeRace in your parent
                                onNext();
                            }}
                            disabled={!isRaceValid(expandedRaceId)}
                            className={`flex items-center gap-2 px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                                isRaceValid(expandedRaceId)
                                    ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-500'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            Confirm Origin <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Main page */
                <>
                    <div className="mb-10">
                        <h2 className="text-5xl font-black tracking-tight mb-2 italic uppercase">Select Origin</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Define your character's foundational lineage.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                        {Object.entries(ALL_RACES).map(([rId, race]) => {
                            const isSelected = raceId === rId;
                            const pts = calculatePoints(rId);
                            return (
                                <div key={rId} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col ${
                                    isSelected ? 'bg-white dark:bg-slate-900 border-purple-500 shadow-xl ring-4 ring-purple-500/5' : 'bg-white/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                                }`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="max-w-[70%]">
                                            <h3 className="text-3xl font-black mb-2 italic uppercase tracking-tight">{race.name}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">{race.description}</p>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 rounded-xl px-4 py-2 text-center min-w-[70px]">
                                            <div className={`text-lg font-black ${isSelected && pts === 3 ? 'text-green-600' : 'text-amber-600'}`}>{isSelected ? pts : 0}/3</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Load</div>
                                        </div>
                                    </div>

                                    <div className="mb-4 space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Innate</div>
                                        <div className="flex flex-wrap gap-2">
                                            {race.passives.filter((p) => p.type === "innate").map((p) => (
                                                <span key={p.uid} title={p.description} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700">
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Selectable</div>
                                        <div className="flex flex-wrap gap-2">
                                            {race.passives.filter((p) => p.type === "selectable").map((p) => (
                                                <span key={p.uid} title={p.description} className="text-xs px-2 py-1 rounded border border-amber-300 dark:border-amber-700">
                                                    {p.name} ({p.ptCost ?? 0})
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-auto pt-6">
                                        <button onClick={() => setExpandedRaceId(rId)} className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all">
                                            Details
                                        </button>
                                        {isSelected && pts === 3 && (
                                            <button onClick={onNext} className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-purple-600 text-white shadow-md transition-all">
                                                Accept
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/*Submit button*/}
                    <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-8 flex justify-end">
                        <button
                            onClick={onNext} // Triggers handleFinalizeRace
                            disabled={!raceId || !isRaceValid(raceId)}
                            className={`flex items-center gap-3 px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
                                raceId && isRaceValid(raceId)
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl hover:opacity-90'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            }`}
                        >
                            Finalize Origin <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}