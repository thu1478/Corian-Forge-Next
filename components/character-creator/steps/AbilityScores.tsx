import React from "react";
import { getPointBuy } from "@/lib/rules-data";;
import { ChevronRightIcon, ChevronLeftIcon, MinusIcon, PlusIcon } from "lucide-react";

type Attribute = "might" | "dexterity" | "reason" | "willpower" | "presence";

const ATTRIBUTES: { id: Attribute; name: string; desc: string }[] = [
  { id: "might", name: "Might", desc: "Physical power and toughness." },
  { id: "dexterity", name: "Dexterity", desc: "Precision, speed, and control." },
  { id: "reason", name: "Reason", desc: "Logic and arcane understanding." },
  { id: "willpower", name: "Willpower", desc: "Resolve and mental resistance." },
  { id: "presence", name: "Presence", desc: "Charisma and force of personality." }
];

const ATTRIBUTE_BONUS_LEVELS = [3, 5, 7, 9, 10];
interface AbilityScoresProps {
  adventurerLevel: number;
  scores: Record<Attribute, number>;
  levelBonuses: Partial<Record<number, Attribute>>;
  onChangeScore: (ability: Attribute, newScore: number) => void;
  onChangeLevelBonus: (level: number, ability: Attribute) => void;
  onNext: () => void;
  onBack: () => void;
}
export function AbilityScores({
  adventurerLevel,
  scores,
  levelBonuses,
  onChangeScore,
  onChangeLevelBonus,
  onNext,
  onBack
}: AbilityScoresProps) {
  const pointBuy = getPointBuy();

  const calculatePointsUsed = () => {
    return Object.values(scores).reduce((total, score) => {
      return total + (pointBuy[String(score)] || 0);
    }, 0);
  };
  const pointsUsed = calculatePointsUsed();
  const pointsRemaining = 16 - pointsUsed;
  const getModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };
  const handleIncrement = (ability: Attribute) => {
    const currentScore = scores[ability];
    if (currentScore >= 20) return;
    const currentCost = pointBuy[String(currentScore)] || 0;
    const nextCost = pointBuy[String(currentScore + 1)] || 0;
    const costDiff = nextCost - currentCost;
    if (pointsRemaining >= costDiff) {
      onChangeScore(ability, currentScore + 1);
    }
  };
  const handleDecrement = (ability: Attribute) => {
    const currentScore = scores[ability];
    if (currentScore <= 6) return; // Min score in point buy table
    onChangeScore(ability, currentScore - 1);
  };
  const availableBonusLevels = ATTRIBUTE_BONUS_LEVELS.filter(
    (l) => l <= adventurerLevel
  );
  const allBonusesAssigned = availableBonusLevels.every((l) => levelBonuses[l]);
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">
            Ability Scores
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
            Allocate 16 points to buy your base attributes.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
            Points Remaining
          </div>
          <div
            className={`text-3xl font-black tabular-nums ${pointsRemaining === 0 ? 'text-green-700 dark:text-green-500' : 'text-foreground'}`}>
            
            {pointsRemaining}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 border-b border-border bg-muted/20 text-xs uppercase tracking-wider font-bold text-muted-foreground">
          <div>Attribute</div>
          <div className="text-center">Base</div>
          <div className="text-center">Pts</div>
          <div className="text-center">Lvl Bonus</div>
          <div className="text-center">Total</div>
          <div className="text-center">Mod</div>
        </div>

        <div className="divide-y divide-border">
          {ATTRIBUTES.map((attr) => {
            const baseScore = scores[attr.id];
            // Calculate total level bonuses for this attribute
            const bonusCount = Object.values(levelBonuses).filter(
              (b) => b === attr.id
            ).length;
            const totalScore = baseScore + bonusCount;
            const modifier = getModifier(totalScore);
            const currentCost = pointBuy[String(baseScore)] || 0;
            const nextCost = pointBuy[String(baseScore + 1)] || 0;
            const costToNext = nextCost - currentCost;
            const canIncrement = baseScore < 20 && pointsRemaining >= costToNext;
            const canDecrement = baseScore > 6;
            return (
              <div
                key={attr.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 items-center hover:bg-muted/20 transition-colors">
                
                <div>
                  <div className="font-bold text-foreground">{attr.name}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {attr.desc}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDecrement(attr.id)}
                    disabled={!canDecrement}
                    className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    
                    <MinusIcon className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-foreground">
                    {baseScore}
                  </span>
                  <button
                    onClick={() => handleIncrement(attr.id)}
                    disabled={!canIncrement}
                    className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-center font-bold text-sky-500">
                  {currentCost}
                </div>

                <div className="text-center font-bold text-violet-800 dark:text-violet-300">
                  {bonusCount > 0 ? `+${bonusCount}` : '-'}
                </div>

                <div className="text-center text-xl font-black text-foreground">
                  {totalScore}
                </div>

                <div className="text-center">
                  <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 rounded-lg font-bold">
                    {modifier}
                  </span>
                </div>
              </div>);

          })}
        </div>
      </div>

      {availableBonusLevels.length > 0 &&
      <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">
            Level Bonuses
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You gain a +1 to an attribute at specific adventurer levels.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {availableBonusLevels.map((lvl) =>
          <div
            key={lvl}
            className="bg-card border border-border rounded-xl p-4">
            
                <div className="text-xs font-bold text-purple-500 uppercase mb-2">
                  Level {lvl} Bonus
                </div>
                <select
              value={levelBonuses[lvl] || ''}
              onChange={(e) =>
              onChangeLevelBonus(lvl, e.target.value as Attribute)
              }
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:ring-purple-500 focus:border-purple-500 outline-none">
              
                  <option value="" disabled>
                    Select Attribute...
                  </option>
                  {ATTRIBUTES.map((attr) =>
              <option key={attr.id} value={attr.id}>
                      {attr.name}
                    </option>
              )}
                </select>
              </div>
          )}
          </div>
        </div>
      }

      <div className="flex justify-between mt-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-secondary-foreground bg-secondary hover:opacity-90 transition-colors">
          
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!allBonusesAssigned}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${allBonusesAssigned ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
          
          Next Step <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>);

}