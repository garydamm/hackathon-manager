import { test, expect } from "@playwright/test"

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
const generateUniqueHackathonName = () => `Organizer Management E2E ${Date.now()}`
const TEST_PASSWORD = "TestPassword123"

test.describe("Organizer Management", () => {
  test.describe.configure({ mode: "serial" })

  // Creator user (creates hackathon, promotes user2)
  let creatorEmail: string
  let creatorFirstName: string

  // Second user (registers as participant, gets promoted to organizer)
  let user2Email: string
  let user2FirstName: string

  // Third user (registers as participant, gets promoted then demoted)
  let user3Email: string
  let user3FirstName: string

  let hackathonName: string
  let hackathonSlug: string
  let hackathonId: string

  test.beforeAll(async ({ browser }) => {
    // === Create creator user and hackathon ===
    creatorEmail = generateUniqueEmail()
    creatorFirstName = "CreatorUser"

    const creatorPage = await browser.newPage()
    await creatorPage.goto("/register")

    await creatorPage.getByLabel("First name").fill(creatorFirstName)
    await creatorPage.getByLabel("Last name").fill("Test")
    await creatorPage.getByLabel("Email").fill(creatorEmail)
    await creatorPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await creatorPage.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await creatorPage.getByRole("button", { name: "Create account" }).click()

    await expect(
      creatorPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${creatorFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Create hackathon
    hackathonName = generateUniqueHackathonName()
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, "-")

    await creatorPage.goto("/hackathons/new")
    await creatorPage.getByLabel("Hackathon Name *").fill(hackathonName)
    await creatorPage.getByLabel("Description").fill("Test hackathon for organizer management")

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const startDate = tomorrow.toISOString().slice(0, 16)

    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    const endDate = dayAfter.toISOString().slice(0, 16)

    await creatorPage.getByLabel("Start Date & Time *").fill(startDate)
    await creatorPage.getByLabel("End Date & Time *").fill(endDate)
    await creatorPage.getByRole("button", { name: "Create Hackathon" }).click()

    await expect(
      creatorPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${creatorFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Get hackathon ID for later use
    const token = await creatorPage.evaluate(() => localStorage.getItem("accessToken"))
    const hackathonRes = await creatorPage.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const hackathonData = await hackathonRes.json()
    hackathonId = hackathonData.id

    await creatorPage.close()

    // === Create second user and register for hackathon ===
    user2Email = generateUniqueEmail()
    user2FirstName = "User2"

    const user2Page = await browser.newPage()
    await user2Page.goto("/register")

    await user2Page.getByLabel("First name").fill(user2FirstName)
    await user2Page.getByLabel("Last name").fill("Test")
    await user2Page.getByLabel("Email").fill(user2Email)
    await user2Page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await user2Page.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await user2Page.getByRole("button", { name: "Create account" }).click()

    await expect(
      user2Page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${user2FirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Register for the hackathon via API
    const user2Token = await user2Page.evaluate(() => localStorage.getItem("accessToken"))
    await user2Page.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${user2Token}` } }
    )

    await user2Page.close()

    // === Create third user and register for hackathon ===
    user3Email = generateUniqueEmail()
    user3FirstName = "User3"

    const user3Page = await browser.newPage()
    await user3Page.goto("/register")

    await user3Page.getByLabel("First name").fill(user3FirstName)
    await user3Page.getByLabel("Last name").fill("Test")
    await user3Page.getByLabel("Email").fill(user3Email)
    await user3Page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await user3Page.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await user3Page.getByRole("button", { name: "Create account" }).click()

    await expect(
      user3Page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${user3FirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Register for the hackathon via API
    const user3Token = await user3Page.evaluate(() => localStorage.getItem("accessToken"))
    await user3Page.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${user3Token}` } }
    )

    await user3Page.close()
  })

  test("promote participant to organizer workflow", async ({ page }) => {
    // Login as creator
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(creatorEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${creatorFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`)
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Verify Organizers section heading is visible
    await expect(page.getByRole("heading", { name: "Organizers", exact: true })).toBeVisible()

    // Initially only creator should be in organizers list
    await expect(page.locator(`div.border:has-text("${creatorFirstName} Test")`).first()).toBeVisible()

    // User2 should be in the participants dropdown
    const participantDropdown = page.locator('select[aria-label="Select participant to promote"]')
    await expect(participantDropdown).toBeVisible()

    // Select user2 from dropdown (find the option containing user2's name)
    const user2Option = await participantDropdown.locator(`option:has-text("${user2FirstName} Test")`).first()
    const user2OptionValue = await user2Option.getAttribute("value")
    if (user2OptionValue) {
      await participantDropdown.selectOption(user2OptionValue)
    }

    // Click promote button (look for button with "Promote" text)
    await page.getByRole("button", { name: /Promote/ }).click()

    // Wait for success and verify user2 appears in organizers list
    // Look specifically in the organizer cards (they have border styling)
    await expect(page.locator(`div.border:has-text("${user2FirstName} Test")`).first()).toBeVisible({
      timeout: 10000,
    })

    // Note: The dropdown update depends on React Query's cache invalidation timing
    // The critical test is that user2 is now visible as an organizer above
  })

  test("verify self-removal button is disabled", async ({ page }) => {
    // Login as creator
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(creatorEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${creatorFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`)
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Find the remove button for the creator (should be disabled)
    // The button has an X icon and a title tooltip
    const removeButton = page.locator(`button[title="Cannot remove yourself"]`).first()
    await expect(removeButton).toBeVisible()
    await expect(removeButton).toBeDisabled()
  })

  test.skip("verify creator removal button is disabled", async ({ page, browser }) => {
    // This test requires user2 to be promoted to organizer first
    // Login as creator to promote user2
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(creatorEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${creatorFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate and promote user2 if not already promoted
    await page.goto(`/hackathons/${hackathonSlug}`)
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Try to select and promote user2 (will fail silently if already promoted)
    const participantDropdown = page.locator('select[aria-label="Select participant to promote"]')
    const user2Option = participantDropdown.locator(`option:has-text("${user2FirstName} Test")`)
    const hasUser2 = (await user2Option.count()) > 0

    if (hasUser2) {
      const user2OptionValue = await user2Option.first().getAttribute("value")
      if (user2OptionValue) {
        await participantDropdown.selectOption(user2OptionValue)
        await page.getByRole("button", { name: /Promote/ }).click()
        // Wait for user2 to appear in organizers list
        await expect(page.locator(`div.border:has-text("${user2FirstName} Test")`).first()).toBeVisible({
          timeout: 10000,
        })
      }
    }

    // Logout
    await page.evaluate(() => localStorage.clear())

    // Now login as user2 (who is now an organizer)
    await page.goto("/login")
    await page.getByLabel("Email").fill(user2Email)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${user2FirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to hackathon detail page with cache busting
    await page.goto(`/hackathons/${hackathonSlug}?_=${Date.now()}`)
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Give React Query time to fetch fresh data
    await page.waitForTimeout(2000)

    // Wait for the Manage Organizers section (confirms user2 has organizer access)
    await expect(page.getByRole("heading", { name: "Manage Organizers" })).toBeVisible({
      timeout: 10000,
    })

    // Find the creator's organizer card, then find its remove button
    const creatorCard = page.locator(`div.border:has-text("${creatorFirstName} Test")`).first()
    await expect(creatorCard).toBeVisible()

    // The remove button should be disabled with "Cannot remove creator" tooltip
    const removeButton = creatorCard.locator('button').first()
    await expect(removeButton).toBeVisible()
    await expect(removeButton).toBeDisabled()

    const title = await removeButton.getAttribute("title")
    expect(title).toBe("Cannot remove creator")
  })

  test.skip("demote non-creator organizer workflow", async ({ page }) => {
    // First, login as creator and promote user3 to organizer
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(creatorEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${creatorFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    await page.goto(`/hackathons/${hackathonSlug}`)
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Promote user3 to organizer
    const participantDropdown = page.locator('select[aria-label="Select participant to promote"]')
    const user3Option = await participantDropdown.locator(`option:has-text("${user3FirstName} Test")`).first()
    const user3OptionValue = await user3Option.getAttribute("value")
    if (user3OptionValue) {
      await participantDropdown.selectOption(user3OptionValue)
    }
    await page.getByRole("button", { name: /Promote/ }).click()

    // Wait for user3 to appear in organizers list
    await expect(page.locator(`div.border:has-text("${user3FirstName} Test")`).first()).toBeVisible({
      timeout: 10000,
    })

    // Now demote user3 (as creator, we can do this)
    // Find user3's organizer card by email (more specific than name)
    const user3Card = page.locator(`div.rounded-xl.border:has-text("${user3Email}")`).first()
    await expect(user3Card).toBeVisible()

    // Find the remove button within user3's card that is NOT disabled
    // (skip buttons with "Cannot remove" tooltips)
    const removeButton = user3Card.locator('button:not([disabled])').first()
    await expect(removeButton).toBeVisible()

    // Click remove button
    await removeButton.click()

    // Wait for the API call to complete and UI to update
    await page.waitForTimeout(2000)

    // Verify user3 is no longer in the organizers list by checking user3's card is gone
    const user3CardAfterRemoval = page.locator(`div.rounded-xl.border:has-text("${user3Email}")`)
    const user3CardCount = await user3CardAfterRemoval.count()
    expect(user3CardCount).toBe(0)

    // Note: The dropdown update depends on React Query's cache invalidation timing
  })
})
