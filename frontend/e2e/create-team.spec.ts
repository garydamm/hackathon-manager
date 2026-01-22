import { test, expect } from "@playwright/test"

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
const generateUniqueHackathonName = () => `Create Team E2E ${Date.now()}`
const TEST_PASSWORD = "TestPassword123"

test.describe("Create Team", () => {
  test.describe.configure({ mode: "serial" })

  // Organizer user (creates hackathon)
  let organizerEmail: string
  let organizerFirstName: string

  // Participant user (registers for hackathon and creates team)
  let participantEmail: string
  let participantFirstName: string

  let hackathonName: string
  let hackathonSlug: string

  test.beforeAll(async ({ browser }) => {
    // === Create organizer user and hackathon ===
    organizerEmail = generateUniqueEmail()
    organizerFirstName = "OrganizerUser"

    const organizerPage = await browser.newPage()
    await organizerPage.goto("/register")

    await organizerPage.getByLabel("First name").fill(organizerFirstName)
    await organizerPage.getByLabel("Last name").fill("Test")
    await organizerPage.getByLabel("Email").fill(organizerEmail)
    await organizerPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await organizerPage.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await organizerPage.getByRole("button", { name: "Create account" }).click()

    await expect(
      organizerPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Create hackathon
    hackathonName = generateUniqueHackathonName()
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, "-")

    await organizerPage.goto("/hackathons/new")
    await organizerPage.getByLabel("Hackathon Name *").fill(hackathonName)
    await organizerPage.getByLabel("Description").fill("Test hackathon for create team tests")

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const startDate = tomorrow.toISOString().slice(0, 16)

    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    const endDate = dayAfter.toISOString().slice(0, 16)

    await organizerPage.getByLabel("Start Date & Time *").fill(startDate)
    await organizerPage.getByLabel("End Date & Time *").fill(endDate)
    await organizerPage.getByRole("button", { name: "Create Hackathon" }).click()

    await expect(
      organizerPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    await organizerPage.close()

    // === Create participant user and register for hackathon ===
    participantEmail = generateUniqueEmail()
    participantFirstName = "ParticipantUser"

    const participantPage = await browser.newPage()
    await participantPage.goto("/register")

    await participantPage.getByLabel("First name").fill(participantFirstName)
    await participantPage.getByLabel("Last name").fill("Test")
    await participantPage.getByLabel("Email").fill(participantEmail)
    await participantPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await participantPage.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await participantPage.getByRole("button", { name: "Create account" }).click()

    await expect(
      participantPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Get auth token and hackathon ID to register via API
    const token = await participantPage.evaluate(() => localStorage.getItem("accessToken"))

    // Get hackathon by slug first (endpoint is /hackathons/:slug, not /hackathons/slug/:slug)
    const hackathonRes = await participantPage.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const hackathonData = await hackathonRes.json()
    const hackathonId = hackathonData.id

    // Register for the hackathon via API
    await participantPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    await participantPage.close()
  })

  test.beforeEach(async ({ page }) => {
    // Login as the participant user before each test
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(participantEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })
  })

  test("shows Create Team button for registered participants", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Create Team button should be visible for registered participants (exact match)
    await expect(page.getByRole("button", { name: "Create Team", exact: true })).toBeVisible({
      timeout: 5000,
    })
  })

  test("opens create team modal when clicking Create Team button", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Create Team", exact: true }).click()

    // Modal should be visible with form fields
    await expect(page.locator("#team-name")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("#team-description")).toBeVisible()
    await expect(page.getByText("Open for Joining")).toBeVisible()
  })

  test("opens create team modal via URL param ?create=true", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams?create=true`)

    // Modal should be visible automatically
    await expect(page.locator("#team-name")).toBeVisible({ timeout: 10000 })
  })

  test("validates that team name is required", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams?create=true`)
    await expect(page.locator("#team-name")).toBeVisible({ timeout: 10000 })

    // Try to submit without filling name
    const submitButton = page.locator('form button[type="submit"]')
    await submitButton.click()

    // Should show validation error
    await expect(page.getByText("Team name is required")).toBeVisible()
  })

  test("can close modal with Cancel button", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams?create=true`)
    await expect(page.locator("#team-name")).toBeVisible({ timeout: 10000 })

    await page.getByRole("button", { name: "Cancel" }).click()

    // Modal should be closed
    await expect(page.locator("#team-name")).not.toBeVisible()
  })

  test("can close modal with X button", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams?create=true`)
    await expect(page.locator("#team-name")).toBeVisible({ timeout: 10000 })

    await page.locator("button:has(svg.lucide-x)").click()

    // Modal should be closed
    await expect(page.locator("#team-name")).not.toBeVisible()
  })

  test("successfully creates a team and navigates to team detail", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams?create=true`)
    await expect(page.locator("#team-name")).toBeVisible({ timeout: 10000 })

    const teamName = `E2E Test Team ${Date.now()}`

    // Fill the form
    await page.locator("#team-name").fill(teamName)
    await page.locator("#team-description").fill("This is a test team description")

    // Submit
    const submitButton = page.locator('form button[type="submit"]')
    await submitButton.click()

    // Should navigate to team detail page
    await page.waitForURL(/\/hackathons\/.*\/teams\/.*/, { timeout: 10000 })

    // Should see the team name on the detail page
    await expect(page.getByRole("heading", { name: teamName })).toBeVisible({ timeout: 10000 })
  })
})
