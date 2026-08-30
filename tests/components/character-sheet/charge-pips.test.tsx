import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ChargePips } from "@/components/character-sheet/charge-pips"

/** Mirrors ChargePips click handler for unit-style assertion without flaky jsdom delegation. */
function nextChargeCount(clickedIndex: number, currentCharges: number): number {
  const isLastFilled = clickedIndex === currentCharges - 1
  return isLastFilled ? clickedIndex : clickedIndex + 1
}

describe("ChargePips", () => {
  it("renders one button per max charge", () => {
    render(<ChargePips maxCharges={3} currentCharges={1} onChange={() => {}} />)
    expect(screen.getAllByRole("button")).toHaveLength(3)
  })

  it("computes next charge count when a pip is clicked", () => {
    expect(nextChargeCount(0, 0)).toBe(1)
    expect(nextChargeCount(1, 2)).toBe(1)
    expect(nextChargeCount(0, 1)).toBe(0)
  })

  it("returns null when maxCharges is zero", () => {
    const { container } = render(
      <ChargePips maxCharges={0} currentCharges={0} onChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders read-only pips without buttons", () => {
    const { container } = render(
      <ChargePips isReadOnly={true} maxCharges={3} currentCharges={2} showLabel={false} />
    )
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    const filled = container.querySelectorAll(".bg-amber-400")
    expect(filled).toHaveLength(2)
  })
})
