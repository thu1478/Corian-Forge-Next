import { test, expect } from "@playwright/test"

test.describe("app navigation", () => {
  test("loads and switches Sheet, Creator, Library tabs", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByText("CORIAN", { exact: true })).toBeVisible()

    const sheetBtn = page.getByRole("button", { name: /sheet/i })
    const creatorBtn = page.getByRole("button", { name: /creator/i })
    const libraryBtn = page.getByRole("button", { name: /library/i })

    await expect(sheetBtn).toBeVisible()
    await expect(creatorBtn).toBeVisible()
    await expect(libraryBtn).toBeVisible()

    await creatorBtn.click()
    await libraryBtn.click()
    await sheetBtn.click()
    await expect(sheetBtn).toBeVisible()
  })
})
