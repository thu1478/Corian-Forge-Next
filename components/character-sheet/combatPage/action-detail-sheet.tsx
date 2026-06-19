"use client"

import type { ReactNode } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { ActionCard } from "@/lib/rules"

export type ActionDetailSheetProps = {
    action: ActionCard | null
    onClose: () => void
    children: ReactNode
}

export function ActionDetailSheet({ action, onClose, children }: ActionDetailSheetProps) {
    return (
        <Sheet open={action != null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="bottom"
                className="max-h-[min(90vh,900px)] overflow-y-auto rounded-t-2xl border-t px-4 pb-6 pt-4 [&>button:last-of-type]:hidden"
            >
                <SheetHeader className="mb-2 flex flex-row items-center space-y-0 pr-8">
                    <SheetTitle className="min-w-0 flex-1 truncate text-left text-base">
                        {action?.name ?? "Action"}
                    </SheetTitle>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-3 h-8 w-8"
                        onClick={onClose}
                        aria-label="Close action"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </SheetHeader>
                {children}
            </SheetContent>
        </Sheet>
    )
}
