"use client"

import {useState} from "react"
import {useTheme} from "next-themes"
import {CharacterSheetView} from "@/components/character-sheet/CharacterSheetView"
import {Button} from "@/components/ui/button"
import {Moon, PlusCircle, Sun, Swords} from "lucide-react"

type AppMode = "sheet" | "creator"

export default function Page() {
    const [mode, setMode] = useState<AppMode>("sheet")
    const { theme, setTheme } = useTheme()

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation Bar */}
            <header className="relative bg-background border-b border-border">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Navigation Left */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 font-black text-primary tracking-tighter">
                            <div className="bg-primary text-primary-foreground p-1 rounded">
                                <Swords className="w-4 h-4" />
                            </div>
                            <span>CORIAN</span>
                        </div>

                        <nav className="flex items-center gap-1">
                            <Button
                                variant={mode === "sheet" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setMode("sheet")}
                                className="font-bold"
                            >
                                <Swords className="w-4 h-4 mr-2" />
                                Sheet
                            </Button>
                            <Button
                                variant={mode === "creator" ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setMode("creator")}
                                className="font-bold"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Creator
                            </Button>
                        </nav>
                    </div>

                    {/* Navigation Right */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
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
            </header>

            {/* Viewport Render */}
            <div className="flex-1">
                {mode === "sheet" ? (
                    <CharacterSheetView />
                ) : (
                    <div className="container mx-auto px-4 py-20 text-center">
                        <h2 className="text-2xl font-bold">Character Creator</h2>
                    </div>
                )}
            </div>

            <footer className="border-t border-border py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>Corian TTRPG Character Management System</p>
                </div>
            </footer>
        </div>
    )
}