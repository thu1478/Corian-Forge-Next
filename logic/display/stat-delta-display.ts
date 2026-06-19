import { cn } from "@/lib/utils"

/** Text color when effective stat differs from rules-derived base. */
export function statDeltaTextClass(effective: number, base: number): string {
    if (effective > base) return "text-green-600 dark:text-green-400"
    if (effective < base) return "text-red-600 dark:text-red-400"
    return ""
}

export function formatStatWithDelta(
    effective: number,
    base: number,
    className?: string
): { value: number; className: string } {
    return {
        value: effective,
        className: cn("tabular-nums font-mono", statDeltaTextClass(effective, base), className),
    }
}
