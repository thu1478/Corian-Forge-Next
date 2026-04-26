"use client"

import {useState} from "react"
import {useTheme} from "next-themes"
import {ActionCardComponent} from "@/components/character-sheet/combatPage/action-card-manager"
import {FocusTracker} from "@/components/character-sheet/combatPage/focus-tracker"
import {CombatStatsPanel, OtherStats, ResourceBars} from "@/components/character-sheet/combatPage/resource-bars"
import {AttributesPanel} from "@/components/character-sheet/combatPage/attributes-panel"
import {EquipmentPanel} from "@/components/character-sheet/trackingPage/equipment-panel"
import {InventoryPanel} from "@/components/character-sheet/trackingPage/inventory-panel"
import {FocusReactionsPanel} from "@/components/character-sheet/combatPage/focus-reactions-panel"
import {BondsPanel, ClassesPanel, LanguagesPanel, TraitsPanel} from "@/components/character-sheet/unused/tracking-panel"
import {CharacterProfile} from "@/components/character-sheet/characterPage/character-panel"
import {DamageCalculator} from "@/components/character-sheet/combatPage/damage-calculator"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {ScrollArea} from "@/components/ui/scroll-area"
import {ChevronDown, Filter, LayoutGrid, List, Moon, Package, Sparkles, Sun, Swords, User} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu"
import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import rulesData from "@/lib/rules.json";
import {Equipment, EQUIPMENT_RULES} from "@/lib/equipment-data";
import {useDataLoader} from "@/components/character-sheet/hooks/DataLoader";

type ActionFilter = "all" | "equipment" | "weaponmaster" | "sorcerer" | "scout" | "Melee" | "Weapon" | "Spell"
type ViewMode = "grid" | "list"

export default function CharacterSheet() {
    // 1. Centralized Data Source
    const {
        character,
        derived,
        setCharacter,
        importJSON,
        exportJSON,
        isLoading
    } = useDataLoader(rulesData);

    const [actionFilter, setActionFilter] = useState<ActionFilter>("all")
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [showDamageCalculator, setShowDamageCalculator] = useState(false)
    const {theme, setTheme} = useTheme()

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
        {uid: "empty", name: "Empty", damage: "0"}
    ];

    // 4. FIXED: Filter uses the hydrated actions from the loader
    const filteredActions = (character.actions || []).filter((action: any) =>
        actionFilter === "all" || action.type === actionFilter || action.source === actionFilter
    );

    const filterOptions: { value: ActionFilter; label: string }[] = [
        {value: "all", label: "All"},
        {value: "equipment", label: "Equipment"},
        {value: "weaponmaster", label: "Weaponmaster"},
        {value: "sorcerer", label: "Sorcerer"},
        {value: "scout", label: "Scout"},
        {value: "Melee", label: "Melee"},
        {value: "Weapon", label: "Weapon"},
        {value: "Spell", label: "Spell"},
    ]

    //<editor-fold desc="Update Handlers">
    // Resource update handlers
    const updateHp = (current: number) => {
        const clampedHp = Math.min(Math.max(current, derived.deathThreshold), derived.maxHP);

        setCharacter(prev => ({
            ...prev,
            hp: clampedHp
        }));
    }

    const updateBarrier = (current: number) => {
        setCharacter(prev => ({
            ...prev,
            barrier: current
        }));
    }

    const updateMp = (current: number) => {
        // Clamp between 0 and the trait/gear-boosted Max MP
        const clampedMp = Math.min(Math.max(current, 0), derived.maxMP);

        setCharacter(prev => ({
            ...prev,
            mp: clampedMp
        }));
    };

    const updateFocus = (current: number) => {
        setCharacter(prev => ({
            ...prev,
            focus: current
        }));
    }

    const updateIp = (current: number) => {
        // Clamp between 0 and the trait/gear-boosted Max IP
        const clampedIp = Math.min(Math.max(current, 0), derived.maxIP);

        setCharacter(prev => ({
            ...prev,
            ip: clampedIp
        }));
    };

    const updateProfileImage = (url: string) => {
        setCharacter(prev => ({...prev, profileImage: url}))
    }

    const updateBackstory = (backstory: string) => {
        setCharacter(prev => ({...prev, backstory}))
    }

    // Damage calculator handler
    const handleApplyDamage = (newHp: number, newBarrier: number) => {
        const clampedHp = Math.min(newHp, derived.maxHP);

        setCharacter(prev => ({
            ...prev,
            hp: clampedHp,
            barrier: Math.max(newBarrier, 0)
        }))
    }

    // Accessory change handler
    const handleAccessoryChange = (slot: keyof Equipment["accessories"], uid: string | null) => {
        setCharacter((prev: any) => ({
            ...prev,
            equipment: {
                ...prev.equipment,
                accessories: {
                    ...prev.equipment.accessories,
                    [slot]: uid
                }
            }
        }));
    };

    // Equipment change handler
    const handleEquipmentChange = (slot: "activeWeapon" | "offhand" | "armor", item: any) => {

        const currentKey = slot;

        setCharacter((prev: any) => {
            // Get the specific key updates from the rules brain
            const result = EQUIPMENT_RULES.getNewState(currentKey, item, prev);

            // We return the result directly because it now contains
            // the correctly structured 'equipment' object.
            return {
                ...prev,
                ...result
            };
        });
    };

    // Dropdown logic for selecting focus feats
    const handleSelectFeat = (index: number, newSrc: string) => {
        setCharacter(prev => {
            // Find who is currently in the slot we clicked (to kick them out)
            const oldFeat = (prev.focusFeatures || []).find(f => f.slotIndex === index);
            const oldName = oldFeat?.classSrc;

            return {
                ...prev,
                focusFeatures: (prev.focusFeatures || []).map(feat => {
                    // A. If this is the one the user just picked, put it in the slot
                    if (feat.classSrc === newSrc && newSrc !== "") {
                        return {...feat, slotIndex: index};
                    }

                    // B. If this was the one previously in the slot, kick it out
                    // (But don't kick it out if it's the one we're currently moving IN)
                    if (feat.classSrc === oldName && feat.classSrc !== newSrc) {
                        return {...feat, slotIndex: -1};
                    }

                    return feat;
                })
            };
        });
    };

    // Dropdown logic for selecting focus feats
    const handleSelectReaction = (index: number, newID: string) => {
        setCharacter(prev => {
            // Find who is currently in the slot we clicked (to kick them out)
            const oldReaction = (prev.reactions || []).find(f => f.slotIndex === index);
            const oldID = oldReaction?.id;

            return {
                ...prev,
                reactions: (prev.reactions || []).map(reaction => {
                    // A. If this is the one the user just picked, put it in the slot
                    if (reaction.id === newID && newID !== "") {
                        return {...reaction, slotIndex: index};
                    }

                    // B. If this was the one previously in the slot, kick it out
                    // (But don't kick it out if it's the one we're currently moving IN)
                    if (reaction.id === oldID && reaction.id !== newID) {
                        return {...reaction, slotIndex: -1};
                    }

                    return reaction;
                })
            };
        });
    };
    // Handler for updating reaction charges (pips)
    const handleUpdateReactionCharges = (reactionId: string, newCount: number) => {
        setCharacter(prev => ({
            ...prev,
            // We look through all known reactions and update the currentCharges for the one matching the ID
            reactions: (prev.reactions || []).map(rx =>
                rx.id === reactionId ? {...rx, charges: newCount} : rx
            )
        }));
    };
    //</editor-fold>

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
                {/* Import/Export Char Data */}
                <div className="container mx-auto px-4 py-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Left: Character Info */}
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

                        {/* Right: Controls & Theme */}
                        <div className="flex items-center gap-2">
                            {/* File Controls using your shadcn Button component */}
                            <div className="flex items-center bg-muted/50 p-1 rounded-md border border-border mr-2">

                                {/* 1. We use a standard Button but give it a ref trigger */}
                                <Button
                                    variant="ghost" size="sm" className="h-8 text-xs font-bold gap-2"
                                    onClick={() => document.getElementById('char-upload')?.click()} // Direct trigger
                                >
                                    <Sparkles className="w-3 h-3 text-blue-500"/>
                                    LOAD
                                </Button>

                                <input
                                    id="char-upload"
                                    type="file"
                                    className="hidden"
                                    accept=".json"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            importJSON(file);
                                            e.target.value = ""; // Allows re-uploading the same file
                                        }
                                    }}
                                />

                                <div className="w-[1px] h-4 bg-border mx-1"/>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs font-bold gap-2 text-primary"
                                    onClick={exportJSON}
                                >
                                    <LayoutGrid className="w-3 h-3"/>
                                    SAVE
                                </Button>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="w-9 h-9 p-0 border-border"
                            >
                                <Sun
                                    className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
                                <Moon
                                    className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-6">
                <Tabs defaultValue="combat" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-6">
                        <TabsTrigger value="combat" className="gap-2">
                            <Swords className="w-4 h-4"/>
                            Combat
                        </TabsTrigger>
                        <TabsTrigger value="tracking" className="gap-2">
                            <Package className="w-4 h-4"/>
                            Tracking
                        </TabsTrigger>
                        <TabsTrigger value="character" className="gap-2">
                            <User className="w-4 h-4"/>
                            Character
                        </TabsTrigger>
                    </TabsList>

                    {/* COMBAT TAB */}
                    <TabsContent value="combat">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Sidebar - Character Stats */}
                            <div className="lg:col-span-3 space-y-4">
                                {/* Focus Tracker */}
                                <FocusTracker
                                    current={character.focus}
                                    onChange={updateFocus}
                                />

                                {/* Resources */}
                                <ResourceBars
                                    hp={{
                                        current: Math.min(character.hp, derived.maxHP),
                                        max: derived.maxHP,
                                        min: derived.deathThreshold
                                    }}
                                    barrier={character.barrier}
                                    mp={{
                                        current: Math.min(character.mp, derived.maxMP),
                                        max: derived.maxMP
                                    }}
                                    ip={{
                                        current: Math.min(character.ip, derived.maxIP),
                                        max: derived.maxIP
                                    }}
                                    onHpChange={updateHp}
                                    onBarrierChange={updateBarrier}
                                    onMpChange={updateMp}
                                    onIpChange={updateIp}
                                    onOpenDamageCalculator={() => setShowDamageCalculator(true)}
                                    attributes={derived.attributes}
                                    knownClasses={character.classes}
                                />

                                {/* Combat Stats */}
                                <CombatStatsPanel
                                    defense={derived.defense}
                                    stability={derived.stability}
                                    speed={derived.speed}
                                    resistances={derived.resistances}
                                    vulnerabilities={derived.vulnerabilities}
                                />

                                {/* Attributes */}
                                <AttributesPanel attributes={derived.attributes}/>

                                {/* Other Stats */}
                                <OtherStats
                                    xp={character.xp}
                                    inspiration={character.inspiration}
                                    victories={character.victories}
                                    onUpdateInspiration={(value) => setCharacter(prev => ({...prev, inspiration: value}))}
                                />
                            </div>

                            {/* Main Content - Actions */}
                            <div className="lg:col-span-6">
                                <div className="bg-card rounded-xl border border-border p-4">
                                    {/* Action Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-primary"/>
                                            Actions
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setViewMode("grid")}
                                                className={cn(viewMode === "grid" && "bg-muted")}
                                            >
                                                <LayoutGrid className="w-4 h-4"/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setViewMode("list")}
                                                className={cn(viewMode === "list" && "bg-muted")}
                                            >
                                                <List className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Global Weapon Selector */}
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

                                    {/* Filters */}
                                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                                        <Filter className="w-4 h-4 text-muted-foreground shrink-0"/>
                                        {filterOptions.map(option => (
                                            <button
                                                key={option.value}
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

                                    {/* Actions Grid/List */}
                                    <ScrollArea className="h-[calc(100vh-320px)]">
                                        <div className={cn(
                                            viewMode === "grid"
                                                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                                                : "space-y-4"
                                        )}>
                                            {filteredActions.map((action) => (
                                                <ActionCardComponent
                                                    key={action.id}
                                                    action={action}
                                                    attributes={derived.attributes}
                                                    disabled={(action.focusCost || 0) > character.focus}
                                                    currentWeapon={currentWeapon}
                                                />
                                            ))}
                                        </div>

                                        {filteredActions.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No actions found for this filter.
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>

                            {/* Right Sidebar - Focus Features & Reactions */}
                            <div className="lg:col-span-3">
                                <FocusReactionsPanel
                                    rules={rulesData}
                                    knownFocusFeats={character.focusFeatures}
                                    onSelectFeat={handleSelectFeat}
                                    knownReactions={character.reactions}
                                    onSelectReaction={handleSelectReaction}
                                    attributes={derived.attributes}
                                    onUpdateReactionCharges={handleUpdateReactionCharges}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* TRACKING TAB - 2 columns */}
                    <TabsContent value="tracking">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Equipment & Accessories */}
                            <div className="space-y-4">
                                <EquipmentPanel
                                    equipment={character.equipment}
                                    inventory={character.inventory}
                                    onAccessoryChange={handleAccessoryChange}
                                    onEquipmentChange={handleEquipmentChange}
                                />
                            </div>

                            {/* Right Column - Currency & Inventory */}
                            <div className="space-y-4">
                                <InventoryPanel
                                    inventory={character.inventory}
                                    money={character.money}
                                    ip={character.ip}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* CHARACTER TAB */}
                    <TabsContent value="character">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column - Profile & Backstory */}
                            <div className="lg:col-span-8">
                                <CharacterProfile
                                    name={character.name}
                                    race={character.race}
                                    age={character.age}
                                    gender={character.gender}
                                    background={character.background}
                                    backstory={character.backstory}
                                    profileImage={character.profileImage}
                                    onProfileImageChange={updateProfileImage}
                                    onBackstoryChange={updateBackstory}
                                />
                            </div>

                            {/* Right Column - Classes, Languages, Traits, Bonds */}
                            <div className="lg:col-span-4 space-y-4">
                                <ClassesPanel
                                    classes={character.classes}
                                    rules={rulesData.classes}
                                />
                                <LanguagesPanel languages={derived.languages}/>
                                <TraitsPanel traits={derived.activeTraits}/>
                                <BondsPanel bonds={character.bonds}/>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Footer */}
            <footer className="border-t border-border mt-12 py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>Corian TTRPG Character Sheet</p>
                </div>
            </footer>

            {/* Damage Calculator */}
            <DamageCalculator
                isOpen={showDamageCalculator}
                onClose={() => setShowDamageCalculator(false)}
                defense={derived.defense}
                hp={{
                    current: character.hp,
                    max: derived.maxHP
                }}
                barrier={character.barrier}
                onApplyDamage={handleApplyDamage}
            />
        </div>
    )
}
