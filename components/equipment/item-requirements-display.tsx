import { cn } from "@/lib/utils"
import {
    formatItemRequirementLines,
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
    const lines = formatItemRequirementLines(requirements, rules as { classes?: Record<string, { name?: string }> })

    if (lines.length === 0) return null

    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            <span className="font-medium text-foreground">Requirements</span>{" "}
            {lines.join(compact ? " · " : " · ")}
        </p>
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
