"use client"

import { useState } from "react"
import { ActionCardComponent } from "@/components/character-sheet/combatPage/action-card-manager"
import { FocusTracker } from "@/components/character-sheet/combatPage/focus-tracker"
import { CombatStatsPanel, OtherStats, ResourceBars } from "@/components/character-sheet/combatPage/resource-bars"
import { AttributesPanel } from "@/components/character-sheet/combatPage/attributes-panel"
import { EquipmentPanel } from "@/components/character-sheet/trackingPage/equipment-panel"
import { InventoryPanel } from "@/components/character-sheet/trackingPage/inventory-panel"
import { FocusReactionsPanel } from "@/components/character-sheet/combatPage/focus-reactions-panel"
import { BondsPanel, ClassesPanel, LanguagesPanel, TraitsPanel } from "@/components/character-sheet/unused/tracking-panel"
import { CharacterProfile } from "@/components/character-sheet/characterPage/character-panel"
import { DamageCalculator } from "@/components/character-sheet/combatPage/damage-calculator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, Filter, LayoutGrid, List, Package, Sparkles, Swords, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { capitalizeFirstLetter, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { makeContainerId, makeInventoryUid } from "@/lib/inventory-filters"
import { unequipInventoryUids } from "@/lib/inventory-helpers"
import rulesData from "@/lib/rules.json";
import { Equipment, EQUIPMENT_RULES, type InventoryContainer } from "@/lib/equipment-data";
import { useDataLoader } from "@/components/character-sheet/hooks/DataLoader";
import { CharacterClass } from "@/lib/rules";

type ActionFilter = string;
type ViewMode = "grid" | "list"

export function CharacterSheetView() {
    const {
        character,
        derived,
        setCharacter,
        importJSON,
        exportJSON,
        isLoading
    } = useDataLoader(rulesData);

    const [actionFilter, setActionFilter] = useState<ActionFilter>("all")
    const [actionSearch, setActionSearch] = useState("")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [allCollapsed, setAllCollapsed] = useState(false)
    const [showDamageCalculator, setShowDamageCalculator] = useState(false)

    if (isLoading || !character) return <div className="p-8 text-center">Loading...</div>;

    const currentWeapon = character.inventory.find(
        (item: any) => item.uid === character.activeWeaponUid
    ) || null;

    const availableWeapons = [
        ...character.inventory
            .filter((item: any) => item.type === "weapon")
            .map((item: any) => ({
                uid: item.uid,
                name: item.name,
                damage: item.damage || "0"
            })),
        { uid: "empty", name: "Empty", damage: "0" }
    ];

    const filteredActions = (character.actions || []).filter((action: any) => {
        if (actionFilter !== "all") {
            const filterLower = actionFilter.toLowerCase();
            const source = (action.source || "").toLowerCase();
            const sourceMatch = source === filterLower;
            const tagMatch =
                action.tags &&
                Array.isArray(action.tags) &&
                action.tags.some((tag: string) => tag.toLowerCase() === filterLower);
            if (!sourceMatch && !tagMatch) return false;
        }
        const q = actionSearch.trim().toLowerCase();
        if (q) {
            const inName = String(action.name ?? "").toLowerCase().includes(q);
            const inDesc = String(action.description ?? "").toLowerCase().includes(q);
            const inTags =
                Array.isArray(action.tags) &&
                action.tags.some((tag: string) => String(tag).toLowerCase().includes(q));
            if (!inName && !inDesc && !inTags) return false;
        }
        return true;
    });

    const handleAddInventoryItem = (itemId: string) => {
        const uid = makeInventoryUid(itemId);
        setCharacter((prev: any) => ({
            ...prev,
            inventory: [...(prev.inventory || []), { id: itemId, uid }],
        }));
    };

    const handleMoveItemToContainer = (itemUid: string, containerId: string | null) => {
        setCharacter((prev: any) => ({
            ...prev,
            inventory: (prev.inventory || []).map((e: any) =>
                e.uid === itemUid
                    ? { ...e, containerId: containerId === null ? null : containerId }
                    : e
            ),
        }));
    };

    const handleAddContainer = (name: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            containers: [...(prev.containers || []), { id: makeContainerId(), name: name.trim() || "Container" }],
        }));
    };

    const handleRenameContainer = (id: string, name: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            containers: (prev.containers || []).map((c: any) =>
                c.id === id ? { ...c, name: name.trim() || c.name } : c
            ),
        }));
    };

    const handleRemoveContainer = (id: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            containers: (prev.containers || []).filter((c: any) => c.id !== id),
            inventory: (prev.inventory || []).map((e: any) =>
                e.containerId === id ? { ...e, containerId: null } : e
            ),
        }));
    };

    const handleReorderContainers = (next: InventoryContainer[]) => {
        setCharacter((prev: any) => ({ ...prev, containers: next }));
    };

    const handleRemoveInventoryItem = (itemUid: string) => {
        setCharacter((prev: any) => ({
            ...prev,
            inventory: (prev.inventory || []).filter((e: any) => e.uid !== itemUid),
            equipment: unequipInventoryUids(prev.equipment, [itemUid]),
        }));
    };

    const handleSetItemQuantity = (itemUid: string, quantity: number) => {
        const q = Math.max(1, Math.floor(quantity));
        setCharacter((prev: any) => ({
            ...prev,
            inventory: (prev.inventory || []).map((e: any) =>
                e.uid === itemUid ? { ...e, quantity: q } : e
            ),
        }));
    };

    const filterOptions = [
        { value: "all", label: "All" },
        { value: "equipment", label: "Equipment" },
        ...(character.classes || []).map((c: CharacterClass) => ({
            value: c.id.toLowerCase(),
            label: capitalizeFirstLetter(c.id)
        })),
        { value: "Weapon", label: "Weapon" },
        { value: "Spell", label: "Spell" },
        { value: "Melee", label: "Melee" },
        { value: "Ranged", label: "Ranged" },
    ];

    // ... Keep all your update handlers (updateHp, updateMp, handleEquipmentChange, etc.) here ...
    // <editor-fold desc="Update Handlers">
    const updateHp = (current: number) => {
        const clampedHp = Math.min(Math.max(current, derived.deathThreshold), derived.maxHP);
        setCharacter(prev => ({ ...prev, hp: clampedHp }));
    }
    const updateBarrier = (current: number) => setCharacter(prev => ({ ...prev, barrier: current }));
    const updateMp = (current: number) => {
        const clampedMp = Math.min(Math.max(current, 0), derived.maxMP);
        setCharacter(prev => ({ ...prev, mp: clampedMp }));
    };
    const updateFocus = (current: number) => setCharacter(prev => ({ ...prev, focus: current }));
    const updateIp = (current: number) => {
        const clampedIp = Math.min(Math.max(current, 0), derived.maxIP);
        setCharacter(prev => ({ ...prev, ip: clampedIp }));
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
    const updateProfileImage = (url: string) => setCharacter(prev => ({ ...prev, profileImage: url }))
    const updateBackstory = (backstory: string) => setCharacter(prev => ({ ...prev, backstory }))
    const handleApplyDamage = (newHp: number, newBarrier: number) => {
        const clampedHp = Math.min(newHp, derived.maxHP);
        setCharacter(prev => ({ ...prev, hp: clampedHp, barrier: Math.max(newBarrier, 0) }))
    }
    const handleAccessoryChange = (slot: keyof Equipment["accessories"], uid: string | null) => {
        setCharacter((prev: any) => ({
            ...prev,
            equipment: { ...prev.equipment, accessories: { ...prev.equipment.accessories, [slot]: uid } }
        }));
    };
    const handleEquipmentChange = (slot: "activeWeapon" | "offhand" | "armor", item: any) => {
        setCharacter((prev: any) => ({ ...prev, ...EQUIPMENT_RULES.getNewState(slot, item, prev) }));
    };
    const handleSelectFeat = (index: number, newSrc: string) => {
        setCharacter(prev => {
            const oldFeat = (prev.focusFeatures || []).find(f => f.slotIndex === index);
            const oldName = oldFeat?.classSrc;
            return {
                ...prev,
                focusFeatures: (prev.focusFeatures || []).map(feat => {
                    if (feat.classSrc === newSrc && newSrc !== "") return { ...feat, slotIndex: index };
                    if (feat.classSrc === oldName && feat.classSrc !== newSrc) return { ...feat, slotIndex: -1 };
                    return feat;
                })
            };
        });
    };
    const handleSelectReaction = (index: number, newID: string) => {
        setCharacter(prev => {
            const oldReaction = (prev.reactions || []).find(f => f.slotIndex === index);
            const oldID = oldReaction?.id;
            return {
                ...prev,
                reactions: (prev.reactions || []).map(reaction => {
                    if (reaction.id === newID && newID !== "") return { ...reaction, slotIndex: index };
                    if (reaction.id === oldID && reaction.id !== newID) return { ...reaction, slotIndex: -1 };
                    return reaction;
                })
            };
        });
    };
    const handleUpdateReactionCharges = (reactionId: string, newCount: number) => {
        setCharacter(prev => ({
            ...prev,
            reactions: (prev.reactions || []).map(rx => rx.id === reactionId ? { ...rx, charges: newCount } : rx)
        }));
    };
    // </editor-fold>

    return (
        <>
            {/* The Character Name Header Sub-Bar */}
            <div className="bg-muted/30 border-b border-border">
                <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Swords className="w-6 h-6 text-primary shrink-0" />
                        <div>
                            <h1 className="text-lg font-bold text-foreground tracking-wider leading-none">
                                {character.name}
                            </h1>
                            <p className="text-[14px] text-muted-foreground mt-1 uppercase tracking-tighter">
                                LVL {derived.characterLevel} {character.age} Y/O {character.gender} {character.race}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-muted/50 p-1 rounded-md border border-border mr-2">
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-2" onClick={() => document.getElementById('char-upload')?.click()}>
                                <Sparkles className="w-3 h-3 text-blue-500" /> LOAD
                            </Button>
                            <input id="char-upload" type="file" className="hidden" accept=".json" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { importJSON(file); e.target.value = ""; }
                            }} />
                            <div className="w-[1px] h-4 bg-border mx-1" />
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold gap-2 text-primary" onClick={exportJSON}>
                                <LayoutGrid className="w-3 h-3" /> SAVE
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-6">
                <Tabs defaultValue="combat" className="w-full">
                    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur py-4 mb-2">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="combat" className="gap-2">
                                <Swords className="w-4 h-4"/> Combat
                            </TabsTrigger>
                            <TabsTrigger value="tracking" className="gap-2">
                                <Package className="w-4 h-4"/> Tracking
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
                                <FocusTracker current={character.focus} onChange={updateFocus} />
                                <ResourceBars
                                    hp={{ current: Math.min(character.hp, derived.maxHP), max: derived.maxHP, min: derived.deathThreshold }}
                                    barrier={character.barrier}
                                    mp={{ current: Math.min(character.mp, derived.maxMP), max: derived.maxMP }}
                                    ip={{ current: Math.min(character.ip, derived.maxIP), max: derived.maxIP }}
                                    onHpChange={updateHp} onBarrierChange={updateBarrier} onMpChange={updateMp} onIpChange={updateIp}
                                    onOpenDamageCalculator={() => setShowDamageCalculator(true)}
                                    attributes={derived.attributes} knownClasses={character.classes}
                                />
                                <CombatStatsPanel defense={derived.defense} stability={derived.stability} speed={derived.speed} resistances={derived.resistances} vulnerabilities={derived.vulnerabilities} />
                                <AttributesPanel attributes={derived.attributes} />
                                <OtherStats xp={character.xp} inspiration={character.inspiration} victories={character.victories} onUpdateInspiration={(v) => setCharacter(prev => ({ ...prev, inspiration: v }))} />
                            </div>

                            {/*Action card manager*/}
                            <div className="lg:col-span-6">
                                <div className="bg-card rounded-xl border border-border p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Actions</h2>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setAllCollapsed(!allCollapsed)} className="h-8 text-[10px] font-black uppercase tracking-widest gap-2">
                                                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", allCollapsed ? "-rotate-90" : "rotate-0")} />
                                                {allCollapsed ? "Expand All" : "Collapse All"}
                                            </Button>
                                            <div className="w-[1px] h-4 bg-border mx-1" />
                                            <Button variant="ghost" size="sm" onClick={() => setViewMode("grid")} className={cn(viewMode === "grid" && "bg-muted")}><LayoutGrid className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => setViewMode("list")} className={cn(viewMode === "list" && "bg-muted")}><List className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                    {/* ... Global Weapon Selector, Filters, and Action Grid (truncated for brevity) ... */}
                                    <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <Swords className="w-4 h-4 text-primary"/>
                                                <span
                                                    className="text-sm font-medium text-foreground">Active Weapon</span>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="min-w-[180px] justify-between"
                                                    >
                            <span className="flex items-center gap-2">
            {/* Logic: If currentWeapon exists (is an object), show name. Else show "Empty" */}
                                {currentWeapon ? currentWeapon.name : "Empty"}

                                {/* Damage display: only show if the object exists and has damage */}

                                {(currentWeapon as any)?.damage && (currentWeapon as any).damage !== "0" && (
                                    <span
                                        className="flex items-center gap-1 text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
            <Swords className="w-3 h-3"/>
                                        {(currentWeapon as any).damage}
        </span>
                                )}
        </span>
                                                        <ChevronDown className="w-4 h-4"/>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[220px]">
                                                    {availableWeapons.map((weapon) => (
                                                        <DropdownMenuItem
                                                            key={weapon.uid}
                                                            onClick={() => handleEquipmentChange("activeWeapon", weapon)}
                                                            className="justify-between"
                                                        >
                                                            <span className="font-medium">{weapon.name}</span>
                                                            {weapon.damage !== "0" && (
                                                                <div
                                                                    className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                                                    <Swords className="w-3 h-3 opacity-70"/>
                                                                    {weapon.damage}
                                                                </div>
                                                            )}
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
                                                    <Filter className="w-4 h-4" />
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
                                        <div className={cn(viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4")}>
                                            {filteredActions.map((action) => (
                                                <ActionCardComponent key={action.id} action={action} attributes={derived.attributes} disabled={(action.focusCost || 0) > character.focus} currentWeapon={currentWeapon} forceCollapsed={allCollapsed} />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>

                            <div className="lg:col-span-3">
                                <FocusReactionsPanel rules={rulesData} knownFocusFeats={character.focusFeatures} onSelectFeat={handleSelectFeat} knownReactions={character.reactions} onSelectReaction={handleSelectReaction} attributes={derived.attributes} onUpdateReactionCharges={handleUpdateReactionCharges} />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ... Tracking and Character Tabs Content ... */}
                    <TabsContent value="tracking">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <EquipmentPanel equipment={character.equipment} inventory={character.inventory} onAccessoryChange={handleAccessoryChange} onEquipmentChange={handleEquipmentChange} />
                            <InventoryPanel
                                inventory={character.inventory}
                                containers={character.containers ?? []}
                                money={character.money}
                                ip={character.ip}
                                maxIp={derived.maxIP}
                                onAdjustMoney={adjustMoneyBy}
                                onAdjustIp={adjustIpBy}
                                itemCatalog={rulesData.items as Record<string, Record<string, unknown>>}
                                onAddInventoryItem={handleAddInventoryItem}
                                onMoveItemToContainer={handleMoveItemToContainer}
                                onAddContainer={handleAddContainer}
                                onRenameContainer={handleRenameContainer}
                                onRemoveContainer={handleRemoveContainer}
                                onReorderContainers={handleReorderContainers}
                                onRemoveInventoryItem={handleRemoveInventoryItem}
                                onSetItemQuantity={handleSetItemQuantity}
                            />
                        </div>
                    </TabsContent>

                    {/*Character tab*/}
                    <TabsContent value="character">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-8">
                                <CharacterProfile name={character.name} race={character.race} age={character.age} gender={character.gender} background={character.background} backstory={character.backstory} profileImage={character.profileImage} onProfileImageChange={updateProfileImage} onBackstoryChange={updateBackstory} />
                            </div>
                            <div className="lg:col-span-4 space-y-4">
                                <ClassesPanel classes={character.classes} rules={rulesData.classes} />
                                <LanguagesPanel languages={derived.languages}/>
                                <TraitsPanel traits={derived.activeTraits}/>
                                <BondsPanel bonds={character.bonds}/>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            <DamageCalculator isOpen={showDamageCalculator} onClose={() => setShowDamageCalculator(false)} defense={derived.defense} hp={{ current: character.hp, max: derived.maxHP }} barrier={character.barrier} onApplyDamage={handleApplyDamage} />
        </>
    );
}