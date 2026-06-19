import { describe, expect, it } from "vitest"
import { lookupChargeDefinition, resolveMaxCharges } from "@/logic/traits/charge-helpers"

describe("lookupChargeDefinition", () => {
  const rules = {
    passives: {
      weaponBond: { fixedMaxCharges: 1, chargeReset: ["endOfCombat"] },
    },
    classes: {
      fighter: {
        passives: {
          parry: { chargeStat: "dexterity", chargeReset: ["shortRest"] },
        },
      },
    },
    system: {
      feats: {
        tough: { fixedMaxCharges: 2 },
      },
    },
    actionCards: {
      "equipment/stab": { fixedMaxCharges: 3 },
    },
  }

  it("finds global passive", () => {
    const def = lookupChargeDefinition("trait", "weaponBond", rules)
    expect(def?.fixedMaxCharges).toBe(1)
  })

  it("finds class passive", () => {
    const def = lookupChargeDefinition("trait", "parry", rules)
    expect(def?.chargeStat).toBe("dexterity")
  })

  it("finds feat passive", () => {
    const def = lookupChargeDefinition("trait", "tough", rules)
    expect(def?.fixedMaxCharges).toBe(2)
  })

  it("finds action card charges", () => {
    const def = lookupChargeDefinition("action", "equipment/stab", rules)
    expect(def?.fixedMaxCharges).toBe(3)
  })
})

describe("resolveMaxCharges", () => {
  it("uses fixedMaxCharges when set", () => {
    expect(resolveMaxCharges({ fixedMaxCharges: 2 }, { dexterity: 8 })).toBe(2)
  })

  it("uses attribute modifier for chargeStat", () => {
    expect(resolveMaxCharges({ chargeStat: "dexterity" }, { dexterity: 14 })).toBe(2)
    expect(resolveMaxCharges({ chargeStat: "dexterity" }, { dexterity: 10 })).toBe(0)
  })
})
