import { describe, expect, it } from "vitest"
import { hydrateActionCardById } from "@/logic/actions/hydrate"

describe("hydrateActionCardById", () => {
  const rules = {
    actionCards: {
      "equipment/stab": {
        name: "Stab",
        description: "A stab.",
        source: "equipment",
        tags: ["weapon"],
      },
    },
    classes: {
      fighter: {
        actions: {
          honedStrike: {
            actionCard: {
              name: "Honed Strike",
              description: "Strike.",
              tags: ["melee"],
            },
          },
        },
      },
    },
  }

  it("returns global action card", () => {
    const card = hydrateActionCardById("equipment/stab", rules)
    expect(card).not.toBeNull()
    expect(card?.id).toBe("equipment/stab")
    expect(card?.name).toBe("Stab")
    expect(card?.source).toBe("equipment")
  })

  it("returns class-nested action card", () => {
    const card = hydrateActionCardById("honedStrike", rules)
    expect(card).not.toBeNull()
    expect(card?.id).toBe("honedStrike")
    expect(card?.name).toBe("Honed Strike")
    expect(card?.source).toBe("fighter")
  })

  it("returns null for missing id", () => {
    expect(hydrateActionCardById("missing", rules)).toBeNull()
    expect(hydrateActionCardById("", rules)).toBeNull()
    expect(hydrateActionCardById(null, rules)).toBeNull()
  })
})
