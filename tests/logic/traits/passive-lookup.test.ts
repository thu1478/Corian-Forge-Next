import { describe, expect, it } from "vitest"
import { resolvePassiveById } from "@/logic/traits/passive-lookup"

describe("resolvePassiveById", () => {
  const rules = {
    passives: {
      weaponBond: { name: "Weapon Bond", fixedMaxCharges: 1 },
    },
    classes: {
      fighter: {
        passives: {
          parry: { name: "Parry", chargeStat: "dexterity" },
        },
      },
    },
    races: {
      human: {
        passives: {
          adaptable: { name: "Adaptable", type: "innate" },
        },
      },
    },
    system: {
      feats: {
        tough: { name: "Tough", fixedMaxCharges: 2 },
      },
    },
  }

  it("finds global passive", () => {
    const p = resolvePassiveById("weaponBond", rules)
    expect(p?.name).toBe("Weapon Bond")
  })

  it("finds class passive for character class", () => {
    const p = resolvePassiveById("parry", rules, {
      character: { classes: [{ id: "fighter" }] },
    })
    expect(p?.name).toBe("Parry")
  })

  it("finds racial passive for character race", () => {
    const p = resolvePassiveById("adaptable", rules, {
      character: { race: "human" },
    })
    expect(p?.name).toBe("Adaptable")
  })

  it("finds feat passive", () => {
    const p = resolvePassiveById("tough", rules)
    expect(p?.name).toBe("Tough")
  })

  it("resolves item trait from inventory", () => {
    const p = resolvePassiveById("pocketCoatIP", rules, {
      character: {
        inventory: [
          {
            uid: "coat-1",
            traits: [{ pocketCoatIP: { name: "Pocket Coat", description: "+1 IP" } }],
          },
        ],
      },
      traitRef: { itemId: "coat-1" },
    })
    expect(p?.name).toBe("Pocket Coat")
  })

  it("uses inline definition when rules miss", () => {
    const p = resolvePassiveById("customTrait", rules, {
      traitRef: { inlineDefinition: { name: "Custom", description: "inline" } },
    })
    expect(p?.name).toBe("Custom")
  })
})
