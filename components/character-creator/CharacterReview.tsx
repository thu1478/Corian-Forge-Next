import React from 'react';
import {rules} from './rules';
import {ATTRIBUTES, CharacterState} from './creator-types';
import {ChevronLeftIcon, DownloadIcon, RotateCcwIcon} from 'lucide-react';

interface CharacterReviewProps {
  characterState: CharacterState;
  onUpdateField: (field: string, value: string) => void;
  onStartOver: () => void;
  onBack: () => void;
}
export function CharacterReview({
  characterState,
  onUpdateField,
  onStartOver,
  onBack
}: CharacterReviewProps) {
  const generateJSON = () => {
    // Calculate final attributes
    const finalAttributes: Record<string, number> = {
      ...characterState.baseScores
    };
    Object.values(characterState.levelBonuses).forEach((attr) => {
      if (attr) finalAttributes[attr] += 1;
    });
    // Gather traits (race innate + race selectable + class passives)
    const traits: any[] = [];
    if (characterState.raceId) {
      const race = rules.races[characterState.raceId];
      Object.entries(race.passives).forEach(([id, p]) => {
        if (
        p.type === 'innate' ||
        characterState.raceSelectablePassives.includes(id))
        {
          traits.push({
            id,
            source: 'Innate'
          });
        }
      });
    }
    // Gather actions, reactions, focus features from classes
    const actions: any[] = [];
    const reactions: any[] = [];
    const focusFeatures: any[] = [];
    characterState.classes.forEach((c) => {
      focusFeatures.push({
        classSrc: c.id,
        slotIndex: -1
      });
    });
    characterState.classOptionSelections.forEach((sel) => {
      if (sel.optionType === 'action')
      actions.push({
        id: sel.optionId
      });
      if (sel.optionType === 'reaction')
      reactions.push({
        id: sel.optionId,
        slotIndex: -1,
        charges: 0
      });
      if (sel.optionType === 'passive')
      traits.push({
        id: sel.optionId,
        source: rules.classes[sel.classId]?.name || sel.classId
      });
    });
    // Gather skills (combine culture and occupation)
    const allSkillIds = [
    ...characterState.selectedSkills,
    ...characterState.occupationSkills];

    const skillCounts: Record<string, number> = {};
    allSkillIds.forEach((id) => {
      skillCounts[id] = (skillCounts[id] || 0) + 1;
    });
    const skills = Object.entries(skillCounts).map(([id, count]) => {
      const skillData = rules.system.skills[id];
      return {
        name: skillData?.name || id,
        attribute: 'reason',
        hasExpertise: count > 1
      };
    });
    // Gather languages
    const languages = characterState.occupationLanguages.map(
      (id) => rules.system.languages[id]?.name || id
    );
    const output = {
      name: characterState.name || 'Unnamed Hero',
      age: characterState.age,
      gender: characterState.gender,
      race: characterState.raceId ?
      rules.races[characterState.raceId].name :
      '',
      profileImage: '',
      background: characterState.background,
      backstory: characterState.backstory,
      classes: characterState.classes.map((c) => ({
        id: c.id,
        level: c.level
      })),
      hp: 20,
      barrier: 8,
      mp: 18,
      focus: 3,
      attributes: finalAttributes,
      speed: 4,
      xp: 0,
      inspiration: 2,
      victories: 0,
      focusFeatures,
      reactions,
      actions,
      traits,
      languages,
      skills,
      money: 100,
      ip: 3,
      inventory: [],
      equipment: {},
      bonds: []
    };
    const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(output, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute(
      'download',
      `${output.name.replace(/\s+/g, '_')}_character.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-100 mb-2">
            Character Review
          </h2>
          <p className="text-gray-400">
            Finalize your details and export your character JSON.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-300 rounded-lg font-bold transition-colors">
            
            <RotateCcwIcon className="w-4 h-4" /> Start Over
          </button>
          <button
            onClick={generateJSON}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-purple-900/20">
            
            <DownloadIcon className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">
              Identity
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-400 uppercase mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={characterState.name}
                  onChange={(e) => onUpdateField('name', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="Character Name" />
                
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-400 uppercase mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={characterState.age}
                    onChange={(e) => onUpdateField('age', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500 outline-none" />
                  
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-400 uppercase mb-1">
                    Gender
                  </label>
                  <input
                    type="text"
                    value={characterState.gender}
                    onChange={(e) => onUpdateField('gender', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500 outline-none"
                    placeholder="e.g. Female" />
                  
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-400 uppercase mb-1">
                  Background Title
                </label>
                <input
                  type="text"
                  value={characterState.background}
                  onChange={(e) => onUpdateField('background', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500 outline-none"
                  placeholder="e.g. Shadow Touched Mercenary" />
                
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-400 uppercase mb-1">
                  Backstory
                </label>
                <textarea
                  value={characterState.backstory}
                  onChange={(e) => onUpdateField('backstory', e.target.value)}
                  rows={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                  placeholder="Write your character's history..." />
                
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sheet Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 border-b border-gray-700">
              <h1 className="text-3xl font-black text-white mb-1">
                {characterState.name || 'Unnamed Hero'}
              </h1>
              <div className="flex flex-wrap gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                <span className="text-purple-300">
                  {characterState.raceId ?
                  rules.races[characterState.raceId].name :
                  'No Race'}
                </span>
                <span>•</span>
                <span className="text-amber-400">
                  Level {characterState.adventurerLevel}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {characterState.classes.map((c) =>
                <span
                  key={c.id}
                  className="bg-gray-950 px-3 py-1 rounded-full border border-gray-800 text-xs text-gray-300 font-bold">
                  
                    {rules.classes[c.id]?.name} {c.level}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Attributes */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase mb-3 border-b border-gray-800 pb-1">
                  Attributes
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {ATTRIBUTES.map((attr) => {
                    const base = characterState.baseScores[attr.id];
                    const bonus = Object.values(
                      characterState.levelBonuses
                    ).filter((b) => b === attr.id).length;
                    const total = base + bonus;
                    const mod = Math.floor((total - 10) / 2);
                    return (
                      <div
                        key={attr.id}
                        className="flex justify-between items-center bg-gray-800/50 p-2 rounded border border-gray-700">
                        
                        <span className="font-bold text-gray-300">
                          {attr.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-white">
                            {total}
                          </span>
                          <span className="text-sm font-bold text-amber-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800 w-8 text-center">
                            {mod >= 0 ? `+${mod}` : mod}
                          </span>
                        </div>
                      </div>);

                  })}
                </div>
              </div>

              {/* Skills & Languages */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase mb-3 border-b border-gray-800 pb-1">
                  Skills & Languages
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from(
                    new Set([
                    ...characterState.selectedSkills,
                    ...characterState.occupationSkills]
                    )
                  ).map((skillId) => {
                    const count = [
                    ...characterState.selectedSkills,
                    ...characterState.occupationSkills].
                    filter((id) => id === skillId).length;
                    return (
                      <span
                        key={skillId}
                        className={`text-xs font-bold px-2 py-1 rounded border ${count > 1 ? 'bg-purple-900/50 text-purple-200 border-purple-500/50' : 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                        
                        {rules.system.skills[skillId]?.name || skillId}{' '}
                        {count > 1 && '(Expertise)'}
                      </span>);

                  })}
                </div>

                <h3 className="text-sm font-bold text-purple-400 uppercase mb-3 border-b border-gray-800 pb-1">
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {characterState.occupationLanguages.map((langId) =>
                  <span
                    key={langId}
                    className="text-xs font-bold px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
                    
                      {rules.system.languages[langId]?.name || langId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start mt-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
          
          <ChevronLeftIcon className="w-5 h-5" /> Back to Editing
        </button>
      </div>
    </div>);

}