import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    formatItemRequirementLines,
    itemRequirementsMet,
    readItemRequirements,
    type ItemRequirementsContext,
} from "@/logic/equipment/item-requirements"

type ItemRequirementsDisplayProps = {
    def: Record<string, unknown>
    rules: Record<string, unknown>
    context?: ItemRequirementsContext
    className?: string
    compact?: boolean
}

export function ItemRequirementsDisplay({
    def,
    rules,
    context,
    className,
    compact = false,
}: ItemRequirementsDisplayProps) {
    const requirements = readItemRequirements(def)
    const lines = formatItemRequirementLines(
        requirements,
        rules as { classes?: Record<string, { name?: string }> },
    )

    if (lines.length === 0) return null

    const hasContext = context != null
    const met = !hasContext || itemRequirementsMet(requirements, context)
    const unmet = hasContext && !met

    return (
        <div
            role={unmet ? "status" : undefined}
            className={cn(
                "rounded-md border",
                compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
                unmet
                    ? "border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                    : "border-primary/25 bg-primary/5 text-foreground",
                className,
            )}
        >
            <div className={cn("flex gap-2", compact ? "items-center" : "items-start")}>
                {unmet ? (
                    <AlertTriangle
                        className={cn(
                            "shrink-0 text-amber-600 dark:text-amber-400",
                            compact ? "mt-0 h-3.5 w-3.5" : "mt-0.5 h-4 w-4",
                        )}
                    />
                ) : null}
                <div className="min-w-0 space-y-0.5">
                    <p
                        className={cn(
                            "font-bold uppercase tracking-wider",
                            compact ? "text-[10px]" : "text-xs",
                            unmet
                                ? "text-amber-800 dark:text-amber-200"
                                : "text-primary",
                        )}
                    >
                        Requirements
                    </p>
                    <p
                        className={cn(
                            "leading-snug",
                            compact ? "text-xs" : "text-sm font-medium",
                            unmet ? "" : "text-foreground",
                        )}
                    >
                        {lines.join(compact ? " · " : " · ")}
                    </p>
                    {unmet && !compact ? (
                        <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                            Your character does not meet these requirements.
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export function getItemRequirementLines(
    def: Record<string, unknown>,
    rules: Record<string, unknown>,
): string[] {
    return formatItemRequirementLines(
        readItemRequirements(def),
        rules as { classes?: Record<string, { name?: string }> },
    )
}
