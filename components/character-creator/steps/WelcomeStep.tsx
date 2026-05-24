import React, { useMemo } from "react"
import { ChevronRightIcon, RotateCcwIcon, CheckCircle2Icon, CircleAlertIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CreatorTodoItem } from "@/lib/creator-todos"

interface WelcomeStepProps {
    todos: CreatorTodoItem[]
    onGoToStep: (stepIndex: number) => void
    onStartOver: () => void
    onNext: () => void
}

function groupTodosByStep(todos: CreatorTodoItem[]): Map<string, CreatorTodoItem[]> {
    const groups = new Map<string, CreatorTodoItem[]>()
    for (const item of todos) {
        const key = item.stepLabel
        const list = groups.get(key) ?? []
        list.push(item)
        groups.set(key, list)
    }
    return groups
}

export function WelcomeStep({ todos, onGoToStep, onStartOver, onNext }: WelcomeStepProps) {
    const grouped = useMemo(() => groupTodosByStep(todos), [todos])
    const requiredCount = todos.filter((t) => t.kind === "required").length
    const allComplete = requiredCount === 0

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-4xl font-black tracking-tight italic uppercase mb-2">
                        Welcome
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                        See what&apos;s left before you export your character.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onStartOver}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold shrink-0 self-start"
                >
                    <RotateCcwIcon className="w-4 h-4" aria-hidden />
                    Start Over
                </button>
            </header>

            <div className="bg-card border border-border rounded-xl p-6 mb-8 flex-1">
                {allComplete && todos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <CheckCircle2Icon className="w-12 h-12 text-green-600 dark:text-green-500" aria-hidden />
                        <p className="text-lg font-semibold text-foreground">
                            You&apos;re all set — continue when ready.
                        </p>
                    </div>
                ) : allComplete && todos.length > 0 ? (
                    <div className="space-y-6">
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
                            <CheckCircle2Icon className="w-4 h-4 shrink-0" aria-hidden />
                            Required choices are complete. Optional items remain below.
                        </p>
                        {[...grouped.entries()].map(([stepLabel, items]) => (
                            <section key={stepLabel}>
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                                    {stepLabel}
                                </h3>
                                <ul className="space-y-2">
                                    {items.map((item) => (
                                        <li key={item.id}>
                                            <TodoRow item={item} onGoToStep={onGoToStep} />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <CircleAlertIcon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                            {requiredCount} required item{requiredCount === 1 ? "" : "s"} remaining
                            {todos.some((t) => t.kind === "optional")
                                ? ` (${todos.length - requiredCount} optional)`
                                : ""}
                        </p>
                        {[...grouped.entries()].map(([stepLabel, items]) => (
                            <section key={stepLabel}>
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
                                    {stepLabel}
                                </h3>
                                <ul className="space-y-2">
                                    {items.map((item) => (
                                        <li key={item.id}>
                                            <TodoRow item={item} onGoToStep={onGoToStep} />
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            <footer className="flex justify-end border-t border-border pt-10">
                <button
                    type="button"
                    onClick={onNext}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 transition-all"
                >
                    Continue to Race
                    <ChevronRightIcon className="w-5 h-5" aria-hidden />
                </button>
            </footer>
        </div>
    )
}

function TodoRow({
    item,
    onGoToStep,
}: {
    item: CreatorTodoItem
    onGoToStep: (stepIndex: number) => void
}) {
    const isOptional = item.kind === "optional"
    return (
        <button
            type="button"
            onClick={() => onGoToStep(item.stepIndex)}
            className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                isOptional
                    ? "border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20"
                    : "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20"
            )}
        >
            <span
                className={cn(
                    "text-[10px] font-black uppercase tracking-widest block mb-1",
                    isOptional
                        ? "text-sky-700 dark:text-sky-400"
                        : "text-amber-700 dark:text-amber-400"
                )}
            >
                {isOptional ? "Optional" : "Required"}
            </span>
            <span className="text-sm font-medium text-foreground">{item.message}</span>
        </button>
    )
}
