import type { ActionCard } from "@/lib/rules"

/** Resolve a full action card from global `actionCards` or a class `actions[id].actionCard` wrapper. */
export function hydrateActionCardById(
  id: string | undefined | null,
  rules: { actionCards?: Record<string, unknown>; classes?: Record<string, any> }
): ActionCard | null {
  if (id == null || id === "") return null

  const globalCard = rules.actionCards?.[id] as Record<string, unknown> | undefined
  if (globalCard && typeof globalCard === "object") {
    const src = (globalCard.source as string) || "global"
    return { ...globalCard, id, source: src, tags: (globalCard.tags as string[]) ?? [] } as ActionCard
  }

  for (const className of Object.keys(rules.classes || {})) {
    const classData = rules.classes![className]
    const wrapper = classData?.actions?.[id]
    if (wrapper?.actionCard) {
      const ac = wrapper.actionCard as Record<string, unknown>
      return {
        ...ac,
        id,
        source: className,
        tags: (ac.tags as string[]) ?? [],
      } as ActionCard
    }
  }

  return null
}
