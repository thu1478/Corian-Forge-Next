import { describe, expect, it } from "vitest"
import { getTraitRefs } from "@/logic/traits/trait-refs"

describe("getTraitRefs", () => {
  it("returns empty array for null character", () => {
    expect(getTraitRefs(null)).toEqual([])
  })

  it("prefers traitRefs when non-empty", () => {
    const refs = [{ id: "a", source: "class" }, { id: "b", source: "feat" }]
    const traits = [{ id: "legacy", source: "other" }]
    expect(getTraitRefs({ traitRefs: refs, traits })).toBe(refs)
  })

  it("falls back to traits when traitRefs missing or empty", () => {
    const traits = [{ id: "legacy", source: "other" }]
    expect(getTraitRefs({ traits })).toBe(traits)
    expect(getTraitRefs({ traitRefs: [], traits })).toBe(traits)
  })
})
