"use client"

import { ChevronLeft, X } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import type { ReactNode } from "react"

export type ActionFolderSheetProps = {
    open: boolean
    folderName: string
    canGoBack: boolean
    onClose: () => void
    onBack: () => void
    children: ReactNode
}

export function ActionFolderSheet({
    open,
    folderName,
    canGoBack,
    onClose,
    onBack,
    children,
}: ActionFolderSheetProps) {
    return (
        <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
            <SheetContent
                side="bottom"
                className="max-h-[min(85vh,720px)] rounded-t-2xl border-t px-4 pb-6 pt-4 [&>button:last-of-type]:hidden"
            >
                <SheetHeader className="mb-4 flex flex-row items-center gap-2 space-y-0 pr-8">
                    {canGoBack ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={onBack}
                            aria-label="Back to parent folder"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    ) : null}
                    <SheetTitle className="min-w-0 flex-1 truncate text-left text-base">
                        {folderName}
                    </SheetTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-3 h-8 w-8"
                        onClick={onClose}
                        aria-label="Close folder"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </SheetHeader>
                {children}
            </SheetContent>
        </Sheet>
    )
}
