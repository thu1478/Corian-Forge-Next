"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { defaultCharacter, ActionCard, Equipment } from "@/lib/character-data"
import { ActionCardComponent } from "@/components/character-sheet/action-card"
import { FocusTracker } from "@/components/character-sheet/focus-tracker"
import { ResourceBars, CombatStatsPanel, OtherStats } from "@/components/character-sheet/resource-bars"
import { AttributesPanel } from "@/components/character-sheet/attributes-panel"
import { EquipmentPanel } from "@/components/character-sheet/equipment-panel"
import { InventoryPanel } from "@/components/character-sheet/inventory-panel"
import { FocusReactionsPanel } from "@/components/character-sheet/focus-reactions-panel"
import { ClassesPanel, TraitsPanel, LanguagesPanel, BondsPanel } from "@/components/character-sheet/tracking-panel"
import { CharacterProfile } from "@/components/character-sheet/character-panel"
import { DamageCalculator } from "@/components/character-sheet/damage-calculator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Swords, 
  User, 
  Sparkles, 
  Filter,
  LayoutGrid,
  List,
  Package,
  Sun,
  Moon,
  ChevronDown
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ActionFilter = "all" | "attack" | "skill" | "spell" | "reaction" | "utility"
type ViewMode = "grid" | "list"

export default function CharacterSheet() {
  const [character, setCharacter] = useState(defaultCharacter)
  const [currentFocus, setCurrentFocus] = useState(character.focus.current)
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [showDamageCalculator, setShowDamageCalculator] = useState(false)
  const [currentWeapon, setCurrentWeapon] = useState<string>(character.equipment.rightHand || "Unarmed")
  const { theme, setTheme } = useTheme()

  // Get weapons from inventory
  const availableWeapons = [
    ...character.inventory
      .filter(item => item.type === "weapon")
      .map(item => ({ name: item.name, damage: item.damage || "1d4" })),
    { name: "Unarmed", damage: "1d4+2" }
  ]``

  const filteredActions = character.actions.filter(action => 
    actionFilter === "all" || action.type === actionFilter
  )

  const filterOptions: { value: ActionFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "attack", label: "Attacks" },
    { value: "skill", label: "Skills" },
    { value: "spell", label: "Spells" },
    { value: "reaction", label: "Reactions" },
    { value: "utility", label: "Utility" }
  ]

  // Resource update handlers
  const updateHp = (current: number, max: number) => {
    setCharacter(prev => ({ ...prev, hp: { current, max } }))
  }

  const updateBarrier = (current: number, max: number) => {
    setCharacter(prev => ({ ...prev, barrier: { current, max } }))
  }

  const updateMp = (current: number, max: number) => {
    setCharacter(prev => ({ ...prev, mp: { current, max } }))
  }

  const updateFocus = (current: number, max: number) => {
    setCharacter(prev => ({ ...prev, focus: { current, max } }))
    setCurrentFocus(current)
  }

  const updateIp = (value: number) => {
    setCharacter(prev => ({ ...prev, ip: value }))
  }

  const updateProfileImage = (url: string) => {
    setCharacter(prev => ({ ...prev, profileImage: url }))
  }

  const updateBackstory = (backstory: string) => {
    setCharacter(prev => ({ ...prev, backstory }))
  }

  // Damage calculator handler
  const handleApplyDamage = (newHp: number, newBarrier: number) => {
    setCharacter(prev => ({
      ...prev,
      hp: { ...prev.hp, current: newHp },
      barrier: { ...prev.barrier, current: newBarrier }
    }))
  }

  // Weapon selection handler
  const handleWeaponSelect = (weaponName: string) => {
    setCurrentWeapon(weaponName)
    // Update equipment tracking
    setCharacter(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        rightHand: weaponName
      }
    }))
  }

  // Accessory change handler
  const handleAccessoryChange = (slot: keyof Equipment["accessories"], value: string | null) => {
    setCharacter(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        accessories: {
          ...prev.equipment.accessories,
          [slot]: value
        }
      }
    }))
  }

  // Equipment change handler
  const handleEquipmentChange = (slot: "rightHand" | "leftHand" | "armor", value: string | null) => {
    setCharacter(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        [slot]: value
      }
    }))
    // Update current weapon if right hand changes
    if (slot === "rightHand" && value) {
      setCurrentWeapon(value)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-wider">{character.name}</h1>
                <p className="text-xs text-muted-foreground">
                  Level {character.level} {character.race} | {character.age} y/o {character.gender}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm hidden sm:block">
                <p className="text-muted-foreground">
                  {character.classes.map(c => `${c.name} ${c.level}`).join(" / ")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 p-0"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="combat" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="combat" className="gap-2">
              <Swords className="w-4 h-4" />
              Combat
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2">
              <Package className="w-4 h-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="character" className="gap-2">
              <User className="w-4 h-4" />
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
                  current={currentFocus}
                  onChange={(value) => {
                    setCurrentFocus(value)
                    setCharacter(prev => ({ ...prev, focus: { ...prev.focus, current: value } }))
                  }}
                />

                {/* Resources */}
                <ResourceBars
                  hp={character.hp}
                  barrier={character.barrier}
                  mp={character.mp}
                  focus={character.focus}
                  ip={character.ip}
                  onHpChange={updateHp}
                  onBarrierChange={updateBarrier}
                  onMpChange={updateMp}
                  onFocusChange={updateFocus}
                  onIpChange={updateIp}
                  onOpenDamageCalculator={() => setShowDamageCalculator(true)}
                />

                {/* Combat Stats */}
                <CombatStatsPanel
                  defense={character.defense}
                  stability={character.stability}
                  speed={character.speed}
                  resistances={character.resistances}
                  vulnerabilities={character.vulnerabilities}
                />

                {/* Attributes */}
                <AttributesPanel attributes={character.attributes} />

                {/* Other Stats */}
                <OtherStats 
                  xp={character.xp}
                  inspiration={character.inspiration}
                  victories={character.victories}
                />
              </div>

              {/* Main Content - Actions */}
              <div className="lg:col-span-6">
                <div className="bg-card rounded-xl border border-border p-4">
                  {/* Action Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      Actions
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={cn(viewMode === "grid" && "bg-muted")}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={cn(viewMode === "list" && "bg-muted")}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Global Weapon Selector */}
                  <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Active Weapon</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="min-w-[180px] justify-between"
                          >
                            <span className="flex items-center gap-2">
                              {currentWeapon}
                              {availableWeapons.find(w => w.name === currentWeapon)?.damage && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  ({availableWeapons.find(w => w.name === currentWeapon)?.damage})
                                </span>
                              )}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[220px]">
                          {availableWeapons.map((weapon) => (
                            <DropdownMenuItem 
                              key={weapon.name}
                              onClick={() => handleWeaponSelect(weapon.name)}
                              className="justify-between"
                            >
                              <span className="font-medium">{weapon.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{weapon.damage}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
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
                          disabled={(action.focusCost || 0) > currentFocus}
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
                  focusFeatures={character.focusFeatures}
                  reactions={character.reactions}
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
                <ClassesPanel classes={character.classes} />
                <LanguagesPanel languages={character.languages} />
                <TraitsPanel traits={character.traits} />
                <BondsPanel bonds={character.bonds} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Custom TTRPG Character Sheet</p>
        </div>
      </footer>

      {/* Damage Calculator */}
      <DamageCalculator
        isOpen={showDamageCalculator}
        onClose={() => setShowDamageCalculator(false)}
        defense={character.defense}
        stability={character.stability}
        hp={character.hp}
        barrier={character.barrier}
        onApplyDamage={handleApplyDamage}
      />
    </div>
  )
}
