import rulesData from "@/lib/rules.json"
import type { CharacterSaveData } from "@/lib/character-data"
import type { FeatLevelPick, TraitRef } from "@/lib/baseRefs"
import type { ClassOptionPick } from "@/components/character-creator/steps/ClassSelection"
import {
    calculateClassXPCost,
    getAdventurerXpBudget,
    getMaxClassXpPacketCount,
} from "@/lib/class-xp-display"
import {
    allSkillChooserPicksComplete,
    isClassStepSkillRequirementKey,
    isFeatStepSkillRequirementKey,
    type SkillChooserRequirement,
} from "@/lib/grant-skill-effects"
import {
    conjurerClassTraitRefsFromPicks,
    getConjurerSummonSchoolTag,
    getConjurerSummonSlotCount,
    getSummonMastery,
    listConjurerCatalogTemplateIdsForSlot,
} from "@/lib/creature-roster"
import { isFairyTamerPicksComplete, emptyFairyTamerContracts } from "@/lib/fairy-tamer"
import {
    artificerHasSpecialInventionPassive,
    ATTRIBUTE_BONUS_MILESTONES,
    FEAT_LEVEL_ORDER,
    isSpecialInventionSaveComplete,
    specialInventionIncompleteMessage,
} from "@/lib/creator-import"
import {
    getOccupationDefinition,
    type OccupationRule,
    resolveOccupationLanguagePicks,
    resolveOccupationSkillsCount,
} from "@/lib/occupation"

export const CREATOR_STEPS = [
    "Welcome",
    "Race",
    "Class",
    "Abilities",
    "Culture",
    "Occupation",
    "Feats",
    "Review",
] as const

export type CreatorStepName = (typeof CREATOR_STEPS)[number]

export const CREATOR_STEP_INDEX: Record<CreatorStepName, number> = {
    Welcome: 0,
    Race: 1,
    Class: 2,
    Abilities: 3,
    Culture: 4,
    Occupation: 5,
    Feats: 6,
    Review: 7,
}

export type CreatorTodoItem = {
    id: string
    stepIndex: number
    stepLabel: string
    message: string
    kind: "required" | "optional"
}

export type CreatorTodoContext = {
    charData: CharacterSaveData
    classSelections: ClassOptionPick[]
    levelBonuses: Partial<Record<number, string>>
    cultureEnvironment: string | null
    cultureOrganization: string | null
    cultureUpbringing: string | null
    cultureSkills: string[]
    occupationSkills: string[]
    occupationLanguages: string[]
    selectedFeats: Partial<Record<number, FeatLevelPick>>
    adventurerLevel: number
    effectiveAdventurerLevel: number
    skillGrantRequirements: SkillChooserRequirement[]
}

type AttributeKey = "might" | "dexterity" | "reason" | "willpower" | "presence"

function stepLabel(index: number): string {
    return CREATOR_STEPS[index] ?? "Unknown"
}

function pushTodo(
    out: CreatorTodoItem[],
    item: Omit<CreatorTodoItem, "stepLabel"> & { stepLabel?: string }
) {
    out.push({
        ...item,
        stepLabel: item.stepLabel ?? stepLabel(item.stepIndex),
    })
}

function racialTraitPointTotal(raceKey: string, racialTraits: TraitRef[]): number {
    const key = raceKey?.toLowerCase?.() ?? ""
    const passives = (rulesData.races as Record<string, { passives?: Record<string, { ptCost?: number }> }>)?.[
        key
    ]?.passives
    if (!passives) return 0
    const selectedIds = new Set(racialTraits.map((t) => t.id))
    return Object.entries(passives)
        .filter(([id]) => selectedIds.has(id))
        .reduce((sum, [, p]) => sum + (p.ptCost || 0), 0)
}

function classDisplayName(classId: string): string {
    const c = (rulesData.classes as Record<string, { name?: string }>)?.[classId]
    return c?.name ?? classId
}

function isConjurerSummonPicksComplete(
    classes: { id: string; level: number }[],
    classSelections: ClassOptionPick[],
    conjurerSummonTemplateIds: string[] | undefined
): boolean {
    const conjurerSummonerTaken = classSelections.some(
        (o) => o.id === "summoner" && o.source === "conjurer"
    )
    const conjurerSlots = getConjurerSummonSlotCount(classes, conjurerSummonerTaken)
    if (conjurerSlots === 0) return true

    const sketch = conjurerClassTraitRefsFromPicks(classSelections)
    const school = getConjurerSummonSchoolTag(sketch, rulesData as Parameters<typeof getConjurerSummonSchoolTag>[1])
    if (!school) return false

    const mastery = getSummonMastery(sketch, classes, rulesData as Parameters<typeof getSummonMastery>[2])
    const picks = conjurerSummonTemplateIds ?? []
    const filled: string[] = []

    for (let i = 0; i < conjurerSlots; i++) {
        const catalog = new Set(
            listConjurerCatalogTemplateIdsForSlot(
                rulesData as Parameters<typeof listConjurerCatalogTemplateIdsForSlot>[0],
                school,
                mastery,
                i
            )
        )
        const tid = String(picks[i] ?? "").trim()
        if (!tid || !catalog.has(tid)) return false
        filled.push(tid)
    }
    return new Set(filled).size === filled.length
}

function featNeedsEffectChoice(feat: {
    selectAmount?: number
    effects?: unknown[]
}): boolean {
    return (
        typeof feat.selectAmount === "number" &&
        feat.selectAmount > 0 &&
        Array.isArray(feat.effects) &&
        feat.effects.length > feat.selectAmount
    )
}

function featPickComplete(
    level: number,
    selectedFeats: Partial<Record<number, FeatLevelPick>>,
    featsRegistry: Record<string, { selectAmount?: number; effects?: unknown[] }>
): boolean {
    const p = selectedFeats[level]
    if (!p?.id) return false
    const feat = featsRegistry[p.id]
    if (!feat) return false
    if (featNeedsEffectChoice(feat)) {
        const n = feat.selectAmount ?? 0
        const idx = p.selectedEffectIndices
        return Array.isArray(idx) && idx.length === n && new Set(idx).size === n
    }
    return true
}

function pointBuyPointsRemaining(scores: Record<AttributeKey, number>): number {
    const pointBuy = rulesData.system.pointBuy as Record<string, number>
    const used = Object.values(scores).reduce(
        (total, score) => total + (pointBuy[String(score)] || 0),
        0
    )
    return 16 - used
}

export function listCreatorTodoItems(ctx: CreatorTodoContext): CreatorTodoItem[] {
    const out: CreatorTodoItem[] = []
    const {
        charData,
        classSelections,
        levelBonuses,
        cultureEnvironment,
        cultureOrganization,
        cultureUpbringing,
        cultureSkills,
        occupationSkills,
        occupationLanguages,
        selectedFeats,
        adventurerLevel,
        effectiveAdventurerLevel,
        skillGrantRequirements,
    } = ctx

    const racialTraits = charData.traits.filter((t) => t.source === "racial")
    const classes = charData.classes ?? []
    const startingXPPerLvl = rulesData.system.startingXPPerLvl as Record<string, number>
    const xpCostPerLvl = rulesData.system.xpCostPerLvl as Record<string, number>
    const occupationRoot = (rulesData.system as { occupation?: Record<string, OccupationRule> }).occupation ?? {}
    const featsRegistry = rulesData.system.feats as Record<string, { selectAmount?: number; effects?: unknown[] }>

    // --- Race ---
    const raceStep = CREATOR_STEP_INDEX.Race
    if (!charData.race?.trim()) {
        pushTodo(out, {
            id: "race-missing",
            stepIndex: raceStep,
            message: "Select a race",
            kind: "required",
        })
    } else {
        const pts = racialTraitPointTotal(charData.race, racialTraits)
        if (pts !== 3) {
            pushTodo(out, {
                id: "race-traits",
                stepIndex: raceStep,
                message: `Racial traits must total 3 points (currently ${pts}/3)`,
                kind: "required",
            })
        }
    }

    // --- Class ---
    const classStep = CREATOR_STEP_INDEX.Class
    const totalBudget = getAdventurerXpBudget(adventurerLevel, charData.xp ?? 0, startingXPPerLvl)
    const spentBudget = classes.reduce(
        (sum, c) => sum + calculateClassXPCost(c.level, xpCostPerLvl),
        0
    )
    const remainingAdventurerXP = totalBudget - spentBudget
    const hasAtLeastOneClass = classes.some((c) => c.level > 0)

    if (!hasAtLeastOneClass) {
        pushTodo(out, {
            id: "class-missing",
            stepIndex: classStep,
            message: "Choose at least one class",
            kind: "required",
        })
    }

    if (remainingAdventurerXP < 0) {
        pushTodo(out, {
            id: "class-xp-overspent",
            stepIndex: classStep,
            message: `Class XP overspent by ${Math.abs(remainingAdventurerXP)}`,
            kind: "required",
        })
    } else if (remainingAdventurerXP > 0) {
        pushTodo(out, {
            id: "class-xp-unspent",
            stepIndex: classStep,
            message: `${remainingAdventurerXP} adventurer XP unspent on class levels`,
            kind: "optional",
        })
    }

    for (const cls of classes) {
        if (cls.level <= 0) continue
        const picksInClass = classSelections.filter((o) => o.source === cls.id).length
        const maxPicks = getMaxClassXpPacketCount(cls.level)
        if (picksInClass !== maxPicks) {
            pushTodo(out, {
                id: `class-talents-${cls.id}`,
                stepIndex: classStep,
                message: `${classDisplayName(cls.id)}: assign ${maxPicks - picksInClass} more class talent${maxPicks - picksInClass === 1 ? "" : "s"} (${picksInClass}/${maxPicks})`,
                kind: "required",
            })
        }
    }

    const hasPriest = classes.some((c) => c.id === "priest" && c.level > 0)
    if (hasPriest && !charData.priestDeity) {
        pushTodo(out, {
            id: "class-priest-deity",
            stepIndex: classStep,
            message: "Select a deity for your Priest",
            kind: "required",
        })
    }

    if (
        !isConjurerSummonPicksComplete(classes, classSelections, charData.conjurerSummonTemplateIds)
    ) {
        pushTodo(out, {
            id: "class-conjurer-summons",
            stepIndex: classStep,
            message: "Complete conjurer summon template picks",
            kind: "required",
        })
    }

    const fairyContractTaken = classSelections.some(
        (o) => o.id === "fairyContract" && o.source === "fairytamer"
    )
    const fairytamerLevel = classes.find((c) => c.id === "fairytamer")?.level ?? 0
    const fairyContracts = charData.fairyTamerContracts ?? emptyFairyTamerContracts()

    if (
        !isFairyTamerPicksComplete(fairyContracts, fairytamerLevel, fairyContractTaken)
    ) {
        pushTodo(out, {
            id: "class-fairy-contracts",
            stepIndex: classStep,
            message: "Complete fairy tamer contract picks",
            kind: "required",
        })
    }

    const specialInventionNeeded = artificerHasSpecialInventionPassive(classSelections, classes)
    if (specialInventionNeeded && !isSpecialInventionSaveComplete(charData.specialInvention)) {
        const msg =
            specialInventionIncompleteMessage(charData.specialInvention, true) ??
            "Complete your Special Invention choice"
        pushTodo(out, {
            id: "class-special-invention",
            stepIndex: classStep,
            message: msg,
            kind: "required",
        })
    }

    const classSkillRequirements = skillGrantRequirements.filter((r) =>
        isClassStepSkillRequirementKey(r.key)
    )
    if (
        classSkillRequirements.length > 0 &&
        !allSkillChooserPicksComplete(classSkillRequirements, charData.creatorSkillGrantPicks ?? {})
    ) {
        for (const req of classSkillRequirements) {
            const picks = charData.creatorSkillGrantPicks?.[req.key] ?? []
            if (picks.length >= req.pickCount) continue
            pushTodo(out, {
                id: `class-skill-${req.key}`,
                stepIndex: classStep,
                message: `${req.label}: pick ${req.pickCount - picks.length} more skill${req.pickCount - picks.length === 1 ? "" : "s"} (${picks.length}/${req.pickCount})`,
                kind: "required",
            })
        }
    }

    // --- Abilities ---
    const abilitiesStep = CREATOR_STEP_INDEX.Abilities
    const scores = charData.attributes as Record<AttributeKey, number>
    const pointsRemaining = pointBuyPointsRemaining(scores)
    if (pointsRemaining > 0) {
        pushTodo(out, {
            id: "abilities-points-unspent",
            stepIndex: abilitiesStep,
            message: `${pointsRemaining} point-buy point${pointsRemaining === 1 ? "" : "s"} remaining`,
            kind: "optional",
        })
    }

    for (const milestone of ATTRIBUTE_BONUS_MILESTONES) {
        if (milestone > effectiveAdventurerLevel) continue
        if (!levelBonuses[milestone]) {
            pushTodo(out, {
                id: `abilities-bonus-${milestone}`,
                stepIndex: abilitiesStep,
                message: `Choose +1 attribute bonus at adventurer level ${milestone}`,
                kind: "required",
            })
        }
    }

    // --- Culture ---
    const cultureStep = CREATOR_STEP_INDEX.Culture
    if (!cultureEnvironment) {
        pushTodo(out, {
            id: "culture-environment",
            stepIndex: cultureStep,
            message: "Select a cultural environment",
            kind: "required",
        })
    }
    if (!cultureOrganization) {
        pushTodo(out, {
            id: "culture-organization",
            stepIndex: cultureStep,
            message: "Select a cultural organization",
            kind: "required",
        })
    }
    if (!cultureUpbringing) {
        pushTodo(out, {
            id: "culture-upbringing",
            stepIndex: cultureStep,
            message: "Select a cultural upbringing",
            kind: "required",
        })
    }
    if (cultureSkills.length !== 3) {
        pushTodo(out, {
            id: "culture-skills",
            stepIndex: cultureStep,
            message: `Pick ${3 - cultureSkills.length} more culture skill${3 - cultureSkills.length === 1 ? "" : "s"} (${cultureSkills.length}/3)`,
            kind: "required",
        })
    }

    // --- Occupation ---
    const occupationStep = CREATOR_STEP_INDEX.Occupation
    const occupationDef = getOccupationDefinition(occupationRoot, charData.occupation)
    const skillsCap = resolveOccupationSkillsCount(occupationDef)
    const languagePicks = resolveOccupationLanguagePicks(occupationDef)
    const additionalLanguages = occupationLanguages.filter((l) => l !== "common")

    if (!charData.occupation || !occupationDef) {
        pushTodo(out, {
            id: "occupation-missing",
            stepIndex: occupationStep,
            message: "Select an occupation",
            kind: "required",
        })
    } else {
        if (occupationSkills.length !== skillsCap) {
            pushTodo(out, {
                id: "occupation-skills",
                stepIndex: occupationStep,
                message: `Pick ${skillsCap - occupationSkills.length} more occupation skill${skillsCap - occupationSkills.length === 1 ? "" : "s"} (${occupationSkills.length}/${skillsCap})`,
                kind: "required",
            })
        }
        if (additionalLanguages.length !== languagePicks) {
            pushTodo(out, {
                id: "occupation-languages",
                stepIndex: occupationStep,
                message: `Pick ${languagePicks - additionalLanguages.length} more occupation language${languagePicks - additionalLanguages.length === 1 ? "" : "s"} (${additionalLanguages.length}/${languagePicks})`,
                kind: "required",
            })
        }
    }

    // --- Feats ---
    const featsStep = CREATOR_STEP_INDEX.Feats
    const availableFeatLevels = FEAT_LEVEL_ORDER.filter((l) => l <= effectiveAdventurerLevel)

    for (const level of availableFeatLevels) {
        if (!featPickComplete(level, selectedFeats, featsRegistry as Record<string, { selectAmount?: number; effects?: unknown[] }>)) {
            const pick = selectedFeats[level]
            if (!pick?.id) {
                pushTodo(out, {
                    id: `feat-missing-${level}`,
                    stepIndex: featsStep,
                    message: `Choose a feat at adventurer level ${level}`,
                    kind: "required",
                })
            } else {
                pushTodo(out, {
                    id: `feat-effects-${level}`,
                    stepIndex: featsStep,
                    message: `Complete effect choices for level ${level} feat`,
                    kind: "required",
                })
            }
        }
    }

    const featSkillRequirements = skillGrantRequirements.filter((r) =>
        isFeatStepSkillRequirementKey(r.key)
    )
    if (
        featSkillRequirements.length > 0 &&
        !allSkillChooserPicksComplete(featSkillRequirements, charData.creatorSkillGrantPicks ?? {})
    ) {
        for (const req of featSkillRequirements) {
            const picks = charData.creatorSkillGrantPicks?.[req.key] ?? []
            if (picks.length >= req.pickCount) continue
            pushTodo(out, {
                id: `feat-skill-${req.key}`,
                stepIndex: featsStep,
                message: `${req.label}: pick ${req.pickCount - picks.length} more skill${req.pickCount - picks.length === 1 ? "" : "s"} (${picks.length}/${req.pickCount})`,
                kind: "required",
            })
        }
    }

    return out
}
