"use client"

import {useCallback, useEffect, useMemo, useState} from "react"
import {
    ActionCardComponent,
    type ActionCostBudget,
    type ActionSpendResourceKind,
    type CombatRuleContext,
} from "@/components/character-sheet/combatPage/action-card-manager"
import {FocusTracker} from "@/components/character-sheet/combatPage/focus-tracker"
import {CombatStatsPanel, OtherStats, ResourceBars} from "@/components/character-sheet/combatPage/resource-bars"
import {AttributesPanel} from "@/components/character-sheet/combatPage/attributes-panel"
import {EquipmentPanel, ProficiencyAlert} from "@/components/character-sheet/trackingPage/equipment-panel"
import {InventoryPanel} from "@/components/character-sheet/trackingPage/inventory-panel"
import {FocusReactionsPanel} from "@/components/character-sheet/combatPage/focus-reactions-panel"
import {
    BondsPanel,
    ClassesPanel,
    CultureBackgroundOccupationPanel,
    LanguagesPanel,
    SkillsPanel,
    TraitsPanel,
} from "@/components/character-sheet/characterPage/tracking-panel"
import {BackstoryPanel, CharacterProfile} from "@/components/character-sheet/characterPage/character-panel"
import {DamageCalculator} from "@/components/character-sheet/combatPage/damage-calculator"
import {ShortRestPanel} from "@/components/character-sheet/combatPage/short-rest-panel"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {Input} from "@/components/ui/input"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import {
    ChevronDown,
    Coffee,
    Crosshair,
    Filter,
    Flag,
    GraduationCap,
    LayoutGrid,
    List,
    Moon,
    Package,
    Plus,
    Shield,
    Sparkles,
    Swords,
    Trash2,
    User
} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {capitalizeFirstLetter, cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {makeContainerId, makeInventoryUid} from "@/lib/inventory-filters"
import {unequipInventoryUids} from "@/lib/inventory-helpers"
import { itemStackQuantity, sumDirectChildQuantities } from "@/lib/inventory-container-rules"
import rulesData from "@/lib/rules.json";
import {traitRefsIncludeId} from "@/lib/trait-helpers";
import {actionTagMatchesFilterChip, actionTagMatchesSearchQuery} from "@/lib/action-tag-utils";
import {Equipment, EQUIPMENT_RULES, type InventoryContainer} from "@/lib/equipment-data";
import {useDataLoader} from "@/components/character-sheet/hooks/DataLoader";
import {CharacterClass} from "@/lib/rules";
import {
    applyRestChargeEffects,
    initialChargesForNewEntry,
    isChargesDepleted,
    lookupChargeDefinition,
} from "@/lib/charge-helpers";
import {applyEndOfCombatEffects} from "@/lib/rest-helpers";
import {getCharacterLevelForStats} from "@/lib/character-data";
import {listCatalogActionCardIds, listCatalogReactionCardIds} from "@/lib/generic-catalog";
import {collectClassProficiencies, martialProficiencyDeficitMessage} from "@/lib/equipment-proficiency";
import {
    buildWeaponBondContext,
    isBondedWeapon,
    parseWeaponBaseDamage,
    getEffectiveWeaponDamage,
    type WeaponDamageContext,
} from "@/lib/weapon-utils";
import { getItemNameClass } from "@/lib/item-rank-display";
import { WeaponBondBadge } from "@/components/equipment/weapon-bond-badge";
import { statDeltaTextClass } from "@/lib/stat-delta-display";
import type {WeaponItem} from "@/lib/equipment-data";
import {ProficienciesPanel} from "@/components/character-sheet/characterPage/proficiencies-panel";
import {CreaturesPanel} from "@/components/character-sheet/characterPage/creatures-panel";
import {
    getCreatureTemplates,
    getDeployedCreatureActionRefs,
    reconcileCreatureRoster,
    type CreatureRosterEntry,
} from "@/lib/creature-roster";

type ActionFilter = string;
type ViewMode = "grid" | "list"

function weaponRangeLabel(weapon: unknown): string | null {
    if (weapon == null || typeof weapon !== "object") return null
    const r = (weapon as Record<string, unknown>).range
    if (r === undefined || r === null) return null
    const s = typeof r === "number" ? (Number.isFinite(r) ? String(r) : "") : String(r).trim()
    return s.length > 0 ? s : null
}

function weaponDamageChip(
    weapon: { type?: string; damage?: unknown; uid?: string } | null | undefined,
    options?: {
        bonded?: boolean
        weaponDamageContext?: WeaponDamageContext
        className?: string
    },
) {
    if (!weapon || weapon.type !== "weapon" || weapon.damage == null || String(weapon.damage) === "0") {
        return null
    }
    const w = weapon as WeaponItem
    const base = parseWeaponBaseDamage(w)
    const dmg = options?.weaponDamageContext
        ? getEffectiveWeaponDamage(w, options.weaponDamageContext)
        : base
    const className = options?.className
    return (
        <span className="inline-flex items-center gap-1 shrink-0">
            {options?.bonded ? <WeaponBondBadge bonded /> : null}
            <span
                className={cn(
                    "flex items-center gap-1 text-xs font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground",
                    statDeltaTextClass(dmg, base),
                    className,
                )}
            >
                <Swords className="w-3 h-3 shrink-0"/>
                {dmg}
            </span>
        </span>
    )
}

export function CharacterSheetView() {
    const {
        character,
        derived,
        setCharacter,
        importJSON,
        exportJSON,
        clearSavedCharacter,
        isLoading
    } = useDataLoader(rulesData);

    const [actionFilter, setActionFilter] = useState<ActionFilter>("all")
    const [actionSearch, setActionSearch] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [allCollapsed, setAllCollapsed] = useState(false)
    const [powerRollShowFormula, setPowerRollShowFormula] = useState(false)
    const [showDamageCalculator, setShowDamageCalculator] = useState(false)
    const [showShortRest, setShowShortRest] = useState(false)
    const [longRestDialogOpen, setLongRestDialogOpen] = useState(false)
    const [clearLocalSaveDialogOpen, setClearLocalSaveDialogOpen] = useState(false)

    useEffect(() => {
        if (!character) return
        const max = derived.maxRespite
        const r = Number(character.respite)
        if (!Number.isFinite(r) || r <= max) return
        setCharacter((prev: any) => ({...prev, respite: max}))
    }, [character, character?.respite, derived.maxRespite, setCharacter])

    const adventurerLevel = useMemo(
        () => getCharacterLevelForStats(character?.classes ?? []),
        [character?.classes]
    )

    const rosterReconcileOpts = useMemo(
        () => ({
            classes: character?.classes ?? [],
            conjurerSummonTemplateIds: character?.conjurerSummonTemplateIds,
            fairyTamerContracts: character?.fairyTamerContracts,
        }),
        [character?.classes, character?.conjurerSummonTemplateIds, character?.fairyTamerContracts]
    )

    const creaturesResolved = useMemo(
        () =>
            reconcileCreatureRoster(character?.creatures, character?.traits ?? [], rulesData as any, rosterReconcileOpts),
        [character?.creatures, character?.traits, rosterReconcileOpts]
    )

    useEffect(() => {
        if (!character) return
        const r = reconcileCreatureRoster(
            character.creatures,
            character.traits ?? [],
            rulesData as any,
            rosterReconcileOpts
        )
        const s = character.creatures ?? []
        const sSet = new Set(s.map((x: { id: string }) => x.id))
        if (r.some((x) => !sSet.has(x.id))) {
            setCharacter((prev: any) => ({
                ...prev,
                creatures: reconcileCreatureRoster(prev.creatures, prev.traits ?? [], rulesData as any, {
                    classes: prev.classes ?? [],
                    conjurerSummonTemplateIds: prev.conjurerSummonTemplateIds,
                    fairyTamerContracts: prev.fairyTamerContracts,
                }),
            }))
        }
    }, [character?.traits, character?.creatures, character?.classes, character?.conjurerSummonTemplateIds, rosterReconcileOpts, setCharacter])

    const patchCreatureEntry = useCallback(
        (id: string, patch: Partial<CreatureRosterEntry>) => {
            setCharacter((prev: any) => {
                const base = reconcileCreatureRoster(prev.creatures, prev.traits ?? [], rulesData as any, {
                    classes: prev.classes ?? [],
                    conjurerSummonTemplateIds: prev.conjurerSummonTemplateIds,
                    fairyTamerContracts: prev.fairyTamerContracts,
                })
                const idx = base.findIndex((c) => c.id === id)
                if (idx < 0) return prev
                const next = [...base]
                next[idx] = {...next[idx], ...patch}
                return {...prev, creatures: next}
            })
        },
        [setCharacter]
    )

    const creatureGrantedActionIds = useMemo(() => {
        if (!character) return new Set<string>()
        const refs = getDeployedCreatureActionRefs(
            {creatures: character.creatures, traits: character.traits ?? []},
            rulesData as any
        )
        return new Set(refs.map((r) => r.id))
    }, [character?.creatures, character?.traits])

    const filteredActions = useMemo(() => {
        if (!character) return [];
        const filtered = (character.actions || []).filter((action: any) => {
            if (actionFilter !== "all") {
                const filterLower = actionFilter.toLowerCase();
                if (filterLower === "creatures") {
                    if (!creatureGrantedActionIds.has(action.id)) return false;
                } else {
                    const source = (action.source || "").toLowerCase();
                    const sourceMatch = source === filterLower;
                    const tagMatch =
                        action.tags &&
                        Array.isArray(action.tags) &&
                        action.tags.some((tag: string) => actionTagMatchesFilterChip(tag, filterLower));
                    if (!sourceMatch && !tagMatch) return false;
                }
            }
            const q = actionSearch.trim().toLowerCase();
            if (q) {
                const inName = String(action.name ?? "").toLowerCase().includes(q);
                const inDesc = String(action.description ?? "").toLowerCase().includes(q);
                const inTags =
                    Array.isArray(action.tags) &&
                    action.tags.some((tag: string) => actionTagMatchesSearchQuery(tag, q));
                if (!inName && !inDesc && !inTags) return false;
            }
            return true;
        });
        return [...filtered].sort((a: any, b: any) => {
            const fa = a.focusCost ?? 0;
            const fb = b.focusCost ?? 0;
            if (fa !== fb) return fa - fb;
            const aa = a.apCost ?? 0;
            const ab = b.apCost ?? 0;
            return aa - ab;
        });
    }, [character, actionFilter, actionSearch, creatureGrantedActionIds]);

    const catalogActionIds = useMemo(() => listCatalogActionCardIds(rulesData as any), []);

    const classProficiencies = useMemo(
        () =>
            collectClassProficiencies(
                (character?.classes ?? []) as { id: string; level: number }[],
                rulesData.classes as Record<string, { proficiencies?: string[] }>
            ),
        [character?.classes]
    );
    const catalogReactionOptions = useMemo(
        () =>
            listCatalogReactionCardIds(rulesData as any).map((id) => ({
                id,
                label: String((rulesData as any).actionCards?.[id]?.name ?? id),
            })),
        []
    );

    if (isLoading || !character) return <div className="p-8 text-center">Loading...</div>;

    const currentWeapon = character.inventory.find(
        (item: any) => item.uid === character.activeWeaponUid
    ) || null;

    const activeWeaponProficiencyMessage = martialProficiencyDeficitMessage(
        currentWeapon,
        classProficiencies
    );

    const offhandWeapon =
        character.inventory.find((item: any) => item.uid === character.offhandUid) || null;

    const equippedArmor =
        (character as { equipment?: { armor?: unknown } }).equipment?.armor ??
        character.inventory.find((item: any) => item.uid === (character as { activeArmorUid?: string }).activeArmorUid) ??
        null;

    const bondedWeaponUids = character.bondedWeaponUids ?? []
    const combatDefenseDelta = character.combatDefenseDelta ?? 0
    const combatStabilityDelta = character.combatStabilityDelta ?? 0
    const combatSpeedDelta = character.combatSpeedDelta ?? 0
    const baseDefense = derived.defense
    const baseStability = derived.stability
    const baseSpeed = derived.speed
    const effectiveDefense = baseDefense + combatDefenseDelta

    const combatRuleContext: CombatRuleContext = {
        traits: ((character as { traitRefs?: unknown }).traitRefs ?? character.traits) as CombatRuleContext["traits"],
        activeWeapon: currentWeapon,
        offhandWeapon,
        equippedArmor: equippedArmor as CombatRuleContext["equippedArmor"],
        creatureGrantedActionIds,
        bondedWeaponUids,
    };

    const hasShieldMaster = traitRefsIncludeId(
        combatRuleContext.traits,
        "shieldMaster",
    )

    const weaponBondCtx = buildWeaponBondContext(combatRuleContext.traits, bondedWeaponUids)

    const weaponDamageContext: WeaponDamageContext = {
        traits: combatRuleContext.traits,
        activeWeapon: currentWeapon,
        offhandWeapon,
    }

    const activeWeaponRangeLabel = weaponRangeLabel(currentWeapon)

    const availableWeapons = [
        ...character.inventory.filter(
            (item: any) => item.type === "weapon" || (hasShieldMaster && item.type === "shield"),
        ),
        {uid: "empty", name: "Empty", type: "misc"} as any,
    ];

    const handleDefenseDeltaChange = (delta: number) => {
        setCharacter((prev) => ({...prev, combatDefenseDelta: delta}))
    }

    const handleStabilityDeltaChange = (delta: number) => {
        setCharacter((prev) => ({...prev, combatStabilityDelta: delta}))
    }

    const handleSpeedDeltaChange = (delta: number) => {
        setCharacter((prev) => ({...prev, combatSpeedDelta: delta}))
    }

    const handleToggleWeaponBond = (uid: string, bonded: boolean) => {
        setCharacter((prev) => {
            const list = prev.bondedWeaponUids ?? []
            if (bonded) {
                if (list.includes(uid)) return prev
                return {...prev, bondedWeaponUids: [...list, uid]}
            }
            const next = list.filter((u) => u !== uid)
            return {...prev, bondedWeaponUids: next}
        })
    }

    const handleAddInventoryItem = (itemId: string) => {
        const uid = makeInventoryUid(itemId);
        setCharacter((prev: any) => ({
            ...prev,
            inventory: [...(prev.inventory || []), {id: itemId, uid}],
        }));
    };

    const handleMoveItemToContainer = (itemUid: string, containerId: string | null) => {
        setCharacter((prev: any) => ({
            ...prev,
            inventory: (prev.inventory || []).map((e: any) =>
                e.uid === itemUid
                    ? {...e, containerId: containerId === null ? null : containerId}
                    : e
            ),
        }));
    };

    const handleAddContainer = (name: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            containers: [...(prev.containers || []), {id: makeContainerId(), name: name.trim() || "Container"}],
        }));
    };

    const handleRenameContainer = (id: string, name: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            containers: (prev.containers || []).map((c: any) =>
                c.id === id ? {...c, name: name.trim() || c.name} : c
            ),
        }));
    };

    const handleRemoveContainer = (id: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            containers: (prev.containers || []).filter((c: any) => c.id !== id),
            inventory: (prev.inventory || []).map((e: any) =>
                e.containerId === id ? {...e, containerId: null} : e
            ),
        }));
    };

    const handleReorderContainers = (next: InventoryContainer[]) => {
        setCharacter((prev: any) => ({...prev, containers: next}));
    };

    const handleRemoveInventoryItem = (itemUid: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            inventory: (prev.inventory || [])
                .map((e: any) => (e.containerId === itemUid ? { ...e, containerId: null } : e))
                .filter((e: any) => e.uid !== itemUid),
            equipment: unequipInventoryUids(prev.equipment, [itemUid]),
        }));
    };

    const handleSetItemQuantity = (itemUid: string, quantity: number) => {
        setCharacter((prev: any) => {
            const inv = prev.inventory || []
            const item = inv.find((e: any) => e.uid === itemUid)
            if (!item) return prev
            let q = Math.max(1, Math.floor(quantity))
            const parentId = item.containerId
            if (parentId) {
                const parent = inv.find((e: any) => e.uid === parentId && e.type === "container")
                const cap = parent?.containerCapacity
                if (parent && typeof cap === "number" && cap >= 0) {
                    const oldQty = itemStackQuantity(item)
                    const others =
                        sumDirectChildQuantities(inv, String(parentId)) - oldQty
                    const maxAllowed = Math.max(0, cap - others)
                    q = Math.min(q, Math.max(1, maxAllowed))
                }
            }
            return {
                ...prev,
                inventory: inv.map((e: any) => (e.uid === itemUid ? {...e, quantity: q} : e)),
            }
        })
    };

    const handleUnpackItemContainer = (itemUid: string) => {
        setCharacter((prev: any) => {
            const inv = prev.inventory || []
            const bag = inv.find((e: any) => e.uid === itemUid && e.type === "container")
            if (!bag) return prev
            const newId = makeContainerId()
            const bagName =
                (typeof bag.customName === "string" && bag.customName.trim()) ||
                String(bag.name || "").trim() ||
                "Container"
            const nextContainers = [...(prev.containers || []), { id: newId, name: bagName }]
            const nextInventory = inv
                .filter((e: any) => e.uid !== itemUid)
                .map((e: any) => (e.containerId === itemUid ? { ...e, containerId: newId } : e))
            return {
                ...prev,
                containers: nextContainers,
                inventory: nextInventory,
                equipment: unequipInventoryUids(prev.equipment, [itemUid]),
            }
        })
    };

    const handleSetInventoryItemCustomName = (itemUid: string, customName: string) => {
        const trimmed = customName.trim();
        setCharacter((prev: any) => ({
            ...prev,
            inventory: (prev.inventory || []).map((e: any) =>
                e.uid === itemUid
                    ? {...e, customName: trimmed ? trimmed : undefined}
                    : e
            ),
        }));
    };

    const filterOptions = [
        {value: "all", label: "All"},
        {value: "equipment", label: "Equipment"},
        {value: "creatures", label: "Creatures"},
        ...(character.classes || []).map((c: CharacterClass) => ({
            value: c.id.toLowerCase(),
            label: capitalizeFirstLetter(c.id)
        })),
        {value: "Weapon", label: "Weapon"},
        {value: "Spell", label: "Spell"},
        {value: "Melee", label: "Melee"},
        {value: "Ranged", label: "Ranged"},
    ];

    // ... Keep all your update handlers (updateHp, updateMp, handleEquipmentChange, etc.) here ...
    // <editor-fold desc="Update Handlers">
    const updateHp = (current: number) => {
        const clampedHp = Math.min(Math.max(current, derived.deathThreshold), derived.maxHP);
        setCharacter(prev => ({...prev, hp: clampedHp}));
    }
    const updateBarrier = (current: number) => setCharacter(prev => ({...prev, barrier: current}));
    const updateMp = (current: number) => {
        const clampedMp = Math.min(Math.max(current, 0), derived.maxMP);
        setCharacter(prev => ({...prev, mp: clampedMp}));
    };
    const updateFocus = (current: number) => setCharacter(prev => ({...prev, focus: current}));
    const handleAddFocus = (amount: number) => {
        if (amount <= 0) return;
        setCharacter((prev: any) => ({...prev, focus: (prev.focus ?? 0) + amount}));
    };
    const updateIp = (current: number) => {
        const clampedIp = Math.min(Math.max(current, 0), derived.maxIP);
        setCharacter(prev => ({...prev, ip: clampedIp}));
    };
    const updateRespite = (current: number) => {
        const max = derived.maxRespite;
        const clamped = Math.min(Math.max(0, current), max);
        setCharacter((prev: any) => ({...prev, respite: clamped}));
    };
    const handleSpendActionCost = (kind: ActionSpendResourceKind, amount: number) => {
        if (amount <= 0) return;
        setCharacter((prev: any) => {
            switch (kind) {
                case "mp":
                    if (prev.mp < amount) return prev;
                    return {...prev, mp: prev.mp - amount};
                case "focus":
                    if (prev.focus < amount) return prev;
                    return {...prev, focus: prev.focus - amount};
                case "ip":
                    if (prev.ip < amount) return prev;
                    return {...prev, ip: prev.ip - amount};
                default:
                    return prev;
            }
        });
    };

    const actionCostBudget: ActionCostBudget = {
        mp: character.mp,
        focus: character.focus,
        ip: character.ip,
    };
    const adjustMoneyBy = (delta: number) => {
        setCharacter((prev: any) => ({
            ...prev,
            money: Math.max(0, Math.floor(Number(prev.money ?? 0) + delta)),
        }));
    };
    const adjustIpBy = (delta: number) => {
        setCharacter((prev: any) => ({
            ...prev,
            ip: Math.min(
                Math.max(0, Math.floor(Number(prev.ip ?? 0) + delta)),
                derived.maxIP
            ),
        }));
    };
    const updateProfileImage = (url: string) => setCharacter(prev => ({...prev, profileImage: url}))
    const updateBackstory = (backstory: string) => setCharacter(prev => ({...prev, backstory}))
    const handleApplyDamage = (newHp: number, newBarrier: number) => {
        const clampedHp = Math.min(newHp, derived.maxHP);
        setCharacter(prev => ({...prev, hp: clampedHp, barrier: Math.max(newBarrier, 0)}))
    }
    const handleAccessoryChange = (slot: keyof Equipment["accessories"], uid: string | null) => {
        setCharacter((prev: any) => {
            let equipment = prev.equipment
            if (uid) {
                equipment = unequipInventoryUids(equipment, [uid])
            }
            return {
                ...prev,
                equipment: {...equipment, accessories: {...equipment.accessories, [slot]: uid}},
            }
        })
    };
    const handleEquipmentChange = (slot: "activeWeapon" | "offhand" | "armor", item: any) => {
        setCharacter((prev: any) => {
            const incomingUid = item?.uid ?? null
            const base =
                incomingUid != null && incomingUid !== ""
                    ? {...prev, equipment: unequipInventoryUids(prev.equipment, [String(incomingUid)])}
                    : prev
            return {...base, ...EQUIPMENT_RULES.getNewState(slot, item, base)}
        })
    };
    const handleSelectFeat = (index: number, newSrc: string) => {
        setCharacter(prev => {
            const oldFeat = (prev.focusFeatures || []).find(f => f.slotIndex === index);
            const oldName = oldFeat?.classSrc;
            return {
                ...prev,
                focusFeatures: (prev.focusFeatures || []).map(feat => {
                    if (feat.classSrc === newSrc && newSrc !== "") return {...feat, slotIndex: index};
                    if (feat.classSrc === oldName && feat.classSrc !== newSrc) return {...feat, slotIndex: -1};
                    return feat;
                })
            };
        });
    };
    const handleSelectReaction = (index: number, newID: string) => {
        setCharacter((prev: any) => {
            let next = [...(prev.reactions || [])]
            const oldID = next.find((f: { slotIndex: number }) => f.slotIndex === index)?.id as
                | string
                | undefined

            if (newID === "") {
                if (oldID) {
                    next = next.map((r: { id: string; slotIndex: number }) =>
                        r.id === oldID ? {...r, slotIndex: -1} : r
                    )
                }
                return {...prev, reactions: next}
            }

            const existingIdx = next.findIndex((r: { id: string }) => r.id === newID)
            if (existingIdx < 0) {
                const chargeDef = lookupChargeDefinition(
                    "reaction",
                    newID,
                    rulesData as import("@/lib/charge-helpers").RulesWithCharges
                )
                const charges = initialChargesForNewEntry(chargeDef, derived.attributes)
                next.push({id: newID, slotIndex: index, charges})
            } else {
                next[existingIdx] = {...next[existingIdx], slotIndex: index}
            }

            if (oldID && oldID !== newID) {
                next = next.map((r: { id: string; slotIndex: number }) =>
                    r.id === oldID ? {...r, slotIndex: -1} : r
                )
            }

            next = next.map((r: { id: string; slotIndex: number }) =>
                r.id === newID ? {...r, slotIndex: index} : r
            )

            return {...prev, reactions: next}
        })
    }
    const handleAddCatalogAction = (id: string) => {
        setCharacter((prev: any) => {
            const actions = prev.actions || [];
            const has = actions.some((a: any) => (typeof a === "string" ? a : a?.id) === id);
            if (has) return prev;
            const chargeDef = lookupChargeDefinition(
                "action",
                id,
                rulesData as import("@/lib/charge-helpers").RulesWithCharges
            )
            const charges = initialChargesForNewEntry(chargeDef, derived.attributes)
            return {...prev, actions: [...actions, {id, charges}]};
        });
    };
    const handleAddCatalogReaction = (id: string) => {
        setCharacter((prev: any) => {
            const reactions = prev.reactions || [];
            if (reactions.some((r: any) => r.id === id)) return prev;
            const chargeDef = lookupChargeDefinition(
                "reaction",
                id,
                rulesData as import("@/lib/charge-helpers").RulesWithCharges
            )
            const charges = initialChargesForNewEntry(chargeDef, derived.attributes)
            return {
                ...prev,
                reactions: [...reactions, {id, slotIndex: -1, charges}],
            };
        });
    };
    const handleUpdateReactionCharges = (reactionId: string, newCount: number) => {
        setCharacter(prev => ({
            ...prev,
            reactions: (prev.reactions || []).map(rx => rx.id === reactionId ? {...rx, charges: newCount} : rx)
        }));
    };

    const handleUpdateTraitCharges = (traitId: string, newCount: number) => {
        // #region agent log
        fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f4e9fe" },
            body: JSON.stringify({
                sessionId: "f4e9fe",
                runId: "post-fix",
                hypothesisId: "D",
                location: "CharacterSheetView.tsx:handleUpdateTraitCharges",
                message: "trait charge update requested",
                data: { traitId, newCount },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
        // #endregion
        setCharacter((prev: any) => {
            const nextTraits = (prev.traits || []).map((t: any) => {
                const id = typeof t === "object" && t?.id ? t.id : t
                return id === traitId ? {...(typeof t === "object" ? t : {id: t}), id: traitId, charges: newCount} : t
            })
            // #region agent log
            fetch("http://127.0.0.1:7550/ingest/244c033b-3205-4e88-b1a7-446a0537a4c2", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "f4e9fe" },
                body: JSON.stringify({
                    sessionId: "f4e9fe",
                    runId: "post-fix",
                    hypothesisId: "D",
                    location: "CharacterSheetView.tsx:handleUpdateTraitCharges:after",
                    message: "traits array after update",
                    data: {
                        traitId,
                        traitsCharges: nextTraits.map((t: any) => ({
                            id: typeof t === "object" ? t.id : t,
                            charges: typeof t === "object" ? t.charges : undefined,
                        })),
                    },
                    timestamp: Date.now(),
                }),
            }).catch(() => {});
            // #endregion
            return { ...prev, traits: nextTraits }
        })
    }

    const handleUpdateActionCharges = (actionId: string, newCount: number) => {
        setCharacter((prev: any) => ({
            ...prev,
            actions: (prev.actions || []).map((a: any) => {
                const id = typeof a === "string" ? a : a?.id
                if (id !== actionId) return a
                return typeof a === "object" ? {...a, id: actionId, charges: newCount} : {id: actionId, charges: newCount}
            }),
        }))
    }

    const handleEndOfCombat = () => {
        setCharacter((prev: any) =>
            applyEndOfCombatEffects(prev, derived.attributes, rulesData as import("@/lib/charge-helpers").RulesWithCharges)
        );
    };

    const handleShortRestApply = (respitesSpent: number) => {
        const hpPer = Math.floor(derived.maxHP / 2);
        const mpPer = Math.floor(derived.maxMP / 2);
        setCharacter((prev: any) => {
            const pool = Math.min(
                Math.max(0, Number(prev.respite) || 0),
                derived.maxRespite
            );
            const s = Math.min(Math.max(0, Math.floor(respitesSpent)), pool);
            const withCharges = applyRestChargeEffects(
                prev,
                "shortRest",
                derived.attributes,
                rulesData as import("@/lib/charge-helpers").RulesWithCharges
            )
            return {
                ...withCharges,
                focus: 0,
                barrier: 0,
                combatDefenseDelta: 0,
                combatStabilityDelta: 0,
                combatSpeedDelta: 0,
                respite: pool - s,
                hp: Math.min(Math.max(prev.hp + s * hpPer, derived.deathThreshold), derived.maxHP),
                mp: Math.min(Math.max(prev.mp + s * mpPer, 0), derived.maxMP),
            };
        });
    };

    const handleLongRestConfirm = () => {
        setCharacter((prev: any) => {
            let next = applyEndOfCombatEffects(
                prev,
                derived.attributes,
                rulesData as import("@/lib/charge-helpers").RulesWithCharges
            )
            next = applyRestChargeEffects(
                next,
                "longRest",
                derived.attributes,
                rulesData as import("@/lib/charge-helpers").RulesWithCharges
            )
            return {
                ...next,
                hp: derived.maxHP,
                mp: derived.maxMP,
                respite: derived.maxRespite,
                victories: 0,
            }
        });
        setLongRestDialogOpen(false);
    };
    // </editor-fold>

    return (
        <>
            {/* The Character Name Header Sub-Bar */}
            <div className="bg-muted/30 border-b border-border">
                <div
                    className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Swords className="w-6 h-6 text-primary shrink-0"/>
                        <div>
                            <h1 className="text-lg font-bold text-foreground tracking-wider leading-none">
                                {character.name}
                            </h1>
                            <p className="text-[14px] text-muted-foreground mt-1 uppercase tracking-tighter">
                                LVL {derived.characterLevel} {character.age} Y/O {character.gender} {character.race}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-semibold"
                                onClick={handleEndOfCombat}
                            >
                                <Flag className="w-3.5 h-3.5"/>
                                End of combat
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-semibold border-emerald-600/40 hover:bg-emerald-950/20"
                                onClick={() => setShowShortRest(true)}
                            >
                                <Coffee className="w-3.5 h-3.5"/>
                                Short rest
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-semibold"
                                onClick={() => setLongRestDialogOpen(true)}
                            >
                                <Moon className="w-3.5 h-3.5"/>
                                Long rest
                            </Button>
                        </div>
                        <div className="flex items-center bg-muted/50 p-1 rounded-md border border-border">
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-2"
                                    onClick={() => document.getElementById('char-upload')?.click()}>
                                <Sparkles className="w-3 h-3 text-blue-500"/> LOAD
                            </Button>
                            <input id="char-upload" type="file" className="hidden" accept=".json" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    importJSON(file);
                                    e.target.value = "";
                                }
                            }}/>
                            <div className="w-[1px] h-4 bg-border mx-1"/>
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-2 text-primary"
                                    onClick={exportJSON}>
                                <LayoutGrid className="w-3 h-3"/> SAVE
                            </Button>
                            <div className="w-[1px] h-4 bg-border mx-1"/>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-bold gap-2 text-muted-foreground hover:text-destructive"
                                onClick={() => setClearLocalSaveDialogOpen(true)}
                                title="Remove character stored in this browser"
                            >
                                <Trash2 className="w-3 h-3"/>
                                Clear local
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-6">
                <Tabs defaultValue="combat" className="w-full">
                    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur py-4 mb-2">
                        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto min-h-10 py-1">
                            <TabsTrigger value="combat" className="gap-2">
                                <Swords className="w-4 h-4"/> Combat
                            </TabsTrigger>
                            <TabsTrigger value="tracking" className="gap-2">
                                <Package className="w-4 h-4"/> Tracking
                            </TabsTrigger>
                            <TabsTrigger value="abilities" className="gap-2">
                                <GraduationCap className="w-4 h-4"/> Abilities
                            </TabsTrigger>
                            <TabsTrigger value="character" className="gap-2">
                                <User className="w-4 h-4"/> Character
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/*Combat tab*/}
                    <TabsContent value="combat">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/*Resource section*/}
                            <div className="lg:col-span-3 space-y-4">
                                <FocusTracker current={character.focus} onChange={updateFocus}/>
                                <ResourceBars
                                    hp={{
                                        current: Math.min(character.hp, derived.maxHP),
                                        max: derived.maxHP,
                                        min: derived.deathThreshold
                                    }}
                                    barrier={character.barrier}
                                    mp={{current: Math.min(character.mp, derived.maxMP), max: derived.maxMP}}
                                    ip={{current: Math.min(character.ip, derived.maxIP), max: derived.maxIP}}
                                    respite={{
                                        current: Math.min(
                                            Number(character.respite ?? derived.maxRespite),
                                            derived.maxRespite
                                        ),
                                        max: derived.maxRespite,
                                    }}
                                    onHpChange={updateHp} onBarrierChange={updateBarrier} onMpChange={updateMp}
                                    onIpChange={updateIp}
                                    onRespiteChange={updateRespite}
                                    onOpenDamageCalculator={() => setShowDamageCalculator(true)}
                                    attributes={derived.attributes} knownClasses={character.classes}
                                />
                                <CombatStatsPanel
                                    baseDefense={baseDefense}
                                    defenseDelta={combatDefenseDelta}
                                    onDefenseDeltaChange={handleDefenseDeltaChange}
                                    baseStability={baseStability}
                                    stabilityDelta={combatStabilityDelta}
                                    onStabilityDeltaChange={handleStabilityDeltaChange}
                                    baseSpeed={baseSpeed}
                                    speedDelta={combatSpeedDelta}
                                    onSpeedDeltaChange={handleSpeedDeltaChange}
                                    resistances={derived.resistances}
                                    vulnerabilities={derived.vulnerabilities}
                                    conditionImmunities={derived.conditionImmunities}
                                    specialSight={derived.specialSight}
                                />
                                <OtherStats
                                    xp={Math.max(0, Math.floor(Number(character.xp ?? 0) || 0))}
                                    inspiration={character.inspiration}
                                    victories={character.victories}
                                    onUpdateXp={(next) =>
                                        setCharacter((prev) => ({
                                            ...prev,
                                            xp: Math.max(0, Math.floor(Number(next)) || 0),
                                        }))
                                    }
                                    onUpdateInspiration={(v) => setCharacter((prev) => ({...prev, inspiration: v}))}
                                    onUpdateVictories={(v) => setCharacter((prev) => ({
                                        ...prev,
                                        victories: Math.max(0, Math.floor(v))
                                    }))}
                                />
                            </div>

                            {/*Action card manager*/}
                            <div className="lg:col-span-6">
                                <div className="bg-card rounded-xl border border-border p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-primary"/> Actions</h2>
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5"
                                                        title="Add an action from global rules (all non-monster action cards: feat, fairy, generic, equipment, …)"
                                                    >
                                                        <Plus className="w-3 h-3"/>
                                                        Catalog
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                                                    {catalogActionIds.length === 0 ? (
                                                        <DropdownMenuItem disabled>No catalog actions in
                                                            rules</DropdownMenuItem>
                                                    ) : (
                                                        catalogActionIds.map((id) => (
                                                            <DropdownMenuItem key={id}
                                                                              onClick={() => handleAddCatalogAction(id)}>
                                                                {(rulesData as any).actionCards?.[id]?.name ?? id}
                                                            </DropdownMenuItem>
                                                        ))
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Button variant="outline" size="sm"
                                                    onClick={() => setAllCollapsed(!allCollapsed)}
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
                                                <ChevronDown
                                                    className={cn("w-3 h-3 transition-transform duration-300", allCollapsed ? "-rotate-90" : "rotate-0")}/>
                                                {allCollapsed ? "Expand All" : "Collapse All"}
                                            </Button>
                                            <div
                                                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 h-8"
                                                title="Show base + weapon damage and potency math (max mod + tier) instead of totals only"
                                            >
                                                <Label
                                                    htmlFor="action-power-roll-breakdown"
                                                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer whitespace-nowrap"
                                                >
                                                    Roll breakdown
                                                </Label>
                                                <Switch
                                                    id="action-power-roll-breakdown"
                                                    checked={powerRollShowFormula}
                                                    onCheckedChange={setPowerRollShowFormula}
                                                    className="scale-90"
                                                />
                                            </div>
                                            <div className="w-[1px] h-4 bg-border mx-1"/>
                                            <Button variant="ghost" size="sm" onClick={() => setViewMode("grid")}
                                                    className={cn(viewMode === "grid" && "bg-muted")}><LayoutGrid
                                                className="w-4 h-4"/></Button>
                                            <Button variant="ghost" size="sm" onClick={() => setViewMode("list")}
                                                    className={cn(viewMode === "list" && "bg-muted")}><List
                                                className="w-4 h-4"/></Button>
                                        </div>
                                    </div>
                                    {/* ... Global Weapon Selector, Filters, and Action Grid (truncated for brevity) ... */}
                                    <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Swords className="w-4 h-4 text-primary shrink-0"/>
                                                <span
                                                    className="text-sm font-medium text-foreground">Active Weapon</span>
                                                <ProficiencyAlert message={activeWeaponProficiencyMessage}/>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="min-w-[180px] justify-between"
                                                    >
                            <span className="flex items-center gap-2 flex-wrap justify-end">
                                {currentWeapon ? (
                                    <span className={cn("truncate", getItemNameClass(currentWeapon, rulesData))}>
                                        {currentWeapon.name}
                                    </span>
                                ) : (
                                    "Empty"
                                )}
                                {weaponDamageChip(currentWeapon, {
                                    bonded: isBondedWeapon(currentWeapon?.uid, weaponBondCtx),
                                    weaponDamageContext,
                                })}
                                {currentWeapon?.type === "shield" &&
                                    typeof (currentWeapon as { defense?: number }).defense === "number" && (
                                    <span
                                        className="flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
                                        <Shield className="w-3 h-3 shrink-0"/>
                                        {(currentWeapon as { defense: number }).defense} Def
                                    </span>
                                )}
                                {activeWeaponRangeLabel != null && (
                                    <span
                                        className="flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border"
                                        title="Range"
                                    >
                                        <Crosshair className="w-3 h-3 shrink-0"/>
                                        {activeWeaponRangeLabel}
                                    </span>
                                )}
        </span>
                                                        <ChevronDown className="w-4 h-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[min(92vw,280px)]">
                                                    {availableWeapons.map((weapon) => (
                                                        <DropdownMenuItem
                                                            key={weapon.uid}
                                                            onClick={() =>
                                                                handleEquipmentChange(
                                                                    "activeWeapon",
                                                                    weapon.uid === "empty" ? null : weapon,
                                                                )
                                                            }
                                                            className="justify-between"
                                                        >
                                                            <span className="flex items-center gap-1.5 font-medium min-w-0">
                                                                <span className={cn("truncate", getItemNameClass(weapon, rulesData))}>
                                                                    {weapon.name}
                                                                </span>
                                                                {weapon.type === "weapon" ? (
                                                                    <WeaponBondBadge
                                                                        bonded={isBondedWeapon(weapon.uid, weaponBondCtx)}
                                                                    />
                                                                ) : null}
                                                            </span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {weaponDamageChip(weapon, {
                                                                    bonded: false,
                                                                    weaponDamageContext,
                                                                    className: "border-0 bg-transparent px-0 py-0",
                                                                })}
                                                                {weapon.type === "shield" &&
                                                                    typeof weapon.defense === "number" && (
                                                                    <div
                                                                        className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                                                        <Shield className="w-3 h-3 opacity-70"/>
                                                                        {weapon.defense} Def
                                                                    </div>
                                                                )}
                                                                {weaponRangeLabel(weapon) != null && (
                                                                    <div
                                                                        className="flex items-center gap-1 text-xs text-muted-foreground font-mono"
                                                                        title="Range"
                                                                    >
                                                                        <Crosshair className="w-3 h-3 opacity-70"/>
                                                                        {weaponRangeLabel(weapon)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant={actionSearch.trim() ? "secondary" : "outline"}
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    title="Search actions"
                                                >
                                                    <Filter className="w-4 h-4"/>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" align="start">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                                    Search actions
                                                </p>
                                                <Input
                                                    placeholder="Name, tag, description…"
                                                    value={actionSearch}
                                                    onChange={(e) => setActionSearch(e.target.value)}
                                                    className="h-9"
                                                />
                                                {actionSearch.trim() !== "" && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="mt-2 h-8 px-2 text-xs"
                                                        onClick={() => setActionSearch("")}
                                                    >
                                                        Clear search
                                                    </Button>
                                                )}
                                            </PopoverContent>
                                        </Popover>
                                        {filterOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setActionFilter(option.value)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                                                    actionFilter === option.value
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                    <ScrollArea className="h-[calc(100vh-150px)]">
                                        <div
                                            className={cn(viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4")}>
                                            {filteredActions.map((action) => (
                                                <ActionCardComponent
                                                    key={action.id}
                                                    action={action}
                                                    attributes={derived.attributes}
                                                    disabled={
                                                        (action.focusCost || 0) > character.focus ||
                                                        isChargesDepleted(
                                                            "action",
                                                            action.id,
                                                            action.charges,
                                                            derived.attributes,
                                                            rulesData as import("@/lib/charge-helpers").RulesWithCharges
                                                        )
                                                    }
                                                    currentWeapon={currentWeapon}
                                                    offhandWeapon={offhandWeapon}
                                                    forceCollapsed={allCollapsed}
                                                    actionCostBudget={actionCostBudget}
                                                    onSpendActionCost={handleSpendActionCost}
                                                    powerRollDisplayMode={powerRollShowFormula ? "formula" : "simple"}
                                                    combatRuleContext={combatRuleContext}
                                                    onUpdateCharges={(n) =>
                                                        handleUpdateActionCharges(action.id, n)
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>

                            <div className="lg:col-span-3 space-y-4">
                                <AttributesPanel attributes={derived.attributes}/>
                                <FocusReactionsPanel
                                    rules={rulesData}
                                    knownFocusFeats={character.focusFeatures}
                                    onSelectFeat={handleSelectFeat}
                                    knownReactions={character.reactions}
                                    onSelectReaction={handleSelectReaction}
                                    attributes={derived.attributes}
                                    onUpdateReactionCharges={handleUpdateReactionCharges}
                                    actionCostBudget={actionCostBudget}
                                    onSpendActionCost={handleSpendActionCost}
                                    catalogReactionOptions={catalogReactionOptions}
                                    onAddCatalogReaction={handleAddCatalogReaction}
                                    currentWeapon={currentWeapon}
                                    offhandWeapon={offhandWeapon}
                                    combatRuleContext={combatRuleContext}
                                    adventurerLevel={adventurerLevel}
                                    onAddFocus={handleAddFocus}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ... Tracking and Character Tabs Content ... */}
                    <TabsContent value="tracking">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <EquipmentPanel
                                equipment={character.equipment}
                                inventory={character.inventory}
                                martialProficiencyIds={classProficiencies}
                                shieldMaster={hasShieldMaster}
                                traits={character.traits}
                                bondedWeaponUids={bondedWeaponUids}
                                rules={rulesData}
                                onAccessoryChange={handleAccessoryChange}
                                onEquipmentChange={handleEquipmentChange}
                            />
                            <InventoryPanel
                                inventory={character.inventory}
                                containers={character.containers ?? []}
                                money={character.money}
                                ip={character.ip}
                                maxIp={derived.maxIP}
                                onAdjustMoney={adjustMoneyBy}
                                onAdjustIp={adjustIpBy}
                                itemCatalog={rulesData.items as Record<string, Record<string, unknown>>}
                                rules={rulesData as Record<string, unknown>}
                                attributes={derived.attributes}
                                onAddInventoryItem={handleAddInventoryItem}
                                onMoveItemToContainer={handleMoveItemToContainer}
                                onAddContainer={handleAddContainer}
                                onRenameContainer={handleRenameContainer}
                                onRemoveContainer={handleRemoveContainer}
                                onReorderContainers={handleReorderContainers}
                                onRemoveInventoryItem={handleRemoveInventoryItem}
                                onSetItemQuantity={handleSetItemQuantity}
                                onSetInventoryItemCustomName={handleSetInventoryItemCustomName}
                                onUnpackItemContainer={handleUnpackItemContainer}
                                traits={character.traits}
                                bondedWeaponUids={bondedWeaponUids}
                                onToggleWeaponBond={handleToggleWeaponBond}
                                activeWeapon={currentWeapon}
                                offhandWeapon={offhandWeapon}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="abilities">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-4 min-w-0">
                                <ClassesPanel
                                    classes={character.classes}
                                    rules={rulesData.classes}
                                    priestDeity={character.priestDeity ?? null}
                                />
                                <CreaturesPanel
                                    creatures={creaturesResolved}
                                    traits={character.traits ?? []}
                                    classes={character.classes ?? []}
                                    rules={rulesData as any}
                                    attributes={derived.attributes}
                                    currentWeapon={currentWeapon}
                                    offhandWeapon={offhandWeapon}
                                    onPatchCreature={patchCreatureEntry}
                                />
                                <CultureBackgroundOccupationPanel
                                    theme={character.background ?? ""}
                                    cultureEnvironment={character.cultureEnvironment ?? null}
                                    cultureOrganization={character.cultureOrganization ?? null}
                                    cultureUpbringing={character.cultureUpbringing ?? null}
                                    occupation={character.occupation ?? null}
                                    system={rulesData.system}
                                />
                                <LanguagesPanel languages={derived.languages}/>
                            </div>
                            <div className="min-w-0">
                                <TraitsPanel
                                    traits={derived.activeTraits}
                                    attributes={derived.attributes}
                                    activeWeapon={currentWeapon}
                                    offhandWeapon={offhandWeapon}
                                    onUpdateTraitCharges={handleUpdateTraitCharges}
                                />
                            </div>
                            <div className="space-y-4 min-w-0">
                                <SkillsPanel
                                    skills={character.skills ?? []}
                                    attributes={derived.attributes}
                                    skillCatalog={
                                        (rulesData.system as { skills?: Record<string, Record<string, unknown>> })
                                            ?.skills ?? {}
                                    }
                                />
                                <ProficienciesPanel proficiencies={classProficiencies} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="character">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4 min-w-0">
                                <CharacterProfile
                                    name={character.name}
                                    race={character.race}
                                    age={character.age}
                                    gender={character.gender}
                                    background={character.background}
                                    profileImage={character.profileImage}
                                    onProfileImageChange={updateProfileImage}
                                />
                                <BondsPanel
                                    bondTargets={character.bondTargets ?? []}
                                    rulesSystem={rulesData.system}
                                    onBondTargetsChange={(next) =>
                                        setCharacter((prev: any) => ({...prev, bondTargets: next}))
                                    }
                                />
                            </div>
                            <div className="min-w-0">
                                <BackstoryPanel
                                    backstory={character.backstory}
                                    onBackstoryChange={updateBackstory}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <DamageCalculator
                isOpen={showDamageCalculator}
                onClose={() => setShowDamageCalculator(false)}
                baseDefense={baseDefense}
                effectiveDefense={effectiveDefense}
                hp={{current: character.hp, max: derived.maxHP}}
                barrier={character.barrier}
                onApplyDamage={handleApplyDamage}
                damageTypes={
                    (rulesData.system as { damageTypes?: string[] }).damageTypes ?? [
                        "crushing",
                        "slashing",
                        "piercing",
                        "air",
                        "volt",
                        "water",
                        "fire",
                        "earth",
                        "nature",
                        "light",
                        "dark",
                    ]
                }
                resistances={derived.resistances}
                vulnerabilities={derived.vulnerabilities}
            />

            <ShortRestPanel
                isOpen={showShortRest}
                onClose={() => setShowShortRest(false)}
                maxHP={derived.maxHP}
                maxMP={derived.maxMP}
                hp={character.hp}
                mp={character.mp}
                respiteAvailable={Math.min(Number(character.respite ?? 0), derived.maxRespite)}
                maxRespite={derived.maxRespite}
                deathThreshold={derived.deathThreshold}
                onApply={handleShortRestApply}
            />

            <AlertDialog open={clearLocalSaveDialogOpen} onOpenChange={setClearLocalSaveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear saved character in this browser?</AlertDialogTitle>
                        <AlertDialogDescription className="text-left">
                            This removes the auto-saved character from local storage and restores the sample character.
                            Your downloaded JSON files are not affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                clearSavedCharacter()
                                setClearLocalSaveDialogOpen(false)
                            }}
                        >
                            Clear local save
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={longRestDialogOpen} onOpenChange={setLongRestDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Take a long rest?</AlertDialogTitle>
                        <AlertDialogDescription className="text-left space-y-2">
                            <span className="block">
                                This will apply end-of-combat effects (focus and barrier cleared; combat stat adjustments reset), restore charges tagged for end of combat and long rest, then set HP and MP to maximum, restore all respites, and set victories to 0.
                            </span>
                            <span className="block font-medium text-foreground">Only confirm if you intend a full long rest.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleLongRestConfirm}
                        >
                            Yes, long rest
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}