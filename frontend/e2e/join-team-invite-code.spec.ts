import { test, expect } from "@playwright/test"

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
const generateUniqueHackathonName = () => `Join Team E2E ${Date.now()}`
const TEST_PASSWORD = "TestPassword123"

test.describe("Join Team via Invite Code", () => {
  test.describe.configure({ mode: "serial" })

  // Organizer user (creates hackathon)
  let organizerEmail: string
  let organizerFirstName: string

  // Team leader (creates the team)
  let teamLeaderEmail: string
  let teamLeaderFirstName: string

  // Participant who will join the team
  let participantEmail: string
  let participantFirstName: string

  let hackathonName: string
  let hackathonSlug: string
  let hackathonId: string
  let teamInviteCode: string
  let teamId: string

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
    await organizerPage.getByLabel("Description").fill("Test hackathon for join team tests")

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

    // === Create team leader user, register, and create a team ===
    teamLeaderEmail = generateUniqueEmail()
    teamLeaderFirstName = "TeamLeader"

    const leaderPage = await browser.newPage()
    await leaderPage.goto("/register")

    await leaderPage.getByLabel("First name").fill(teamLeaderFirstName)
    await leaderPage.getByLabel("Last name").fill("Test")
    await leaderPage.getByLabel("Email").fill(teamLeaderEmail)
    await leaderPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await leaderPage.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await leaderPage.getByRole("button", { name: "Create account" }).click()

    await expect(
      leaderPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${teamLeaderFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Get auth token and register for hackathon
    const leaderToken = await leaderPage.evaluate(() => localStorage.getItem("accessToken"))

    const hackathonRes = await leaderPage.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${leaderToken}` } }
    )
    const hackathonData = await hackathonRes.json()
    hackathonId = hackathonData.id

    // Register for hackathon
    await leaderPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${leaderToken}` } }
    )

    // Create a team (open - for invite code testing)
    // Note: Backend currently requires isOpen=true for invite code joining
    const teamRes = await leaderPage.request.post("http://localhost:8080/api/teams", {
      headers: {
        Authorization: `Bearer ${leaderToken}`,
        "Content-Type": "application/json",
      },
      data: {
        hackathonId,
        name: `Test Team ${Date.now()}`,
        description: "A team for testing invite code joining",
        isOpen: true,
      },
    })
    const teamData = await teamRes.json()
    teamInviteCode = teamData.inviteCode
    teamId = teamData.id

    await leaderPage.close()

    // === Create participant user and register for hackathon ===
    participantEmail = generateUniqueEmail()
    participantFirstName = "JoiningUser"

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

    // Register for hackathon
    const participantToken = await participantPage.evaluate(() =>
      localStorage.getItem("accessToken")
    )

    await participantPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${participantToken}` } }
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

  test("shows Join with Invite Code button for registered participants", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    // Join with Invite Code button should be visible
    await expect(page.getByRole("button", { name: "Join with Invite Code" })).toBeVisible({
      timeout: 5000,
    })
  })

  test("opens join team modal when clicking Join with Invite Code button", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Join with Invite Code" }).click()

    // Modal should be visible with invite code field
    await expect(page.locator("#invite-code")).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("heading", { name: "Join with Invite Code" })).toBeVisible()
  })

  test("validates that invite code is required", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Join with Invite Code" }).click()
    await expect(page.locator("#invite-code")).toBeVisible({ timeout: 5000 })

    // Try to submit without filling invite code
    const submitButton = page.locator('form button[type="submit"]')
    await submitButton.click()

    // Should show validation error
    await expect(page.getByText("Invite code is required")).toBeVisible()
  })

  test("can close modal with Cancel button", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Join with Invite Code" }).click()
    await expect(page.locator("#invite-code")).toBeVisible({ timeout: 5000 })

    await page.getByRole("button", { name: "Cancel" }).click()

    // Modal should be closed
    await expect(page.locator("#invite-code")).not.toBeVisible()
  })

  test("shows error for invalid invite code", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Join with Invite Code" }).click()
    await expect(page.locator("#invite-code")).toBeVisible({ timeout: 5000 })

    // Enter an invalid invite code
    await page.locator("#invite-code").fill("invalid-code-12345")
    const submitButton = page.locator('form button[type="submit"]')
    await submitButton.click()

    // Should show error message
    await expect(page.locator(".bg-destructive\\/10")).toBeVisible({ timeout: 5000 })
  })

  test("successfully joins team with valid invite code", async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}/teams`)
    await expect(page.getByRole("heading", { name: "Teams", level: 1 })).toBeVisible({
      timeout: 10000,
    })

    await page.getByRole("button", { name: "Join with Invite Code" }).click()
    await expect(page.locator("#invite-code")).toBeVisible({ timeout: 5000 })

    // Enter the valid invite code
    await page.locator("#invite-code").fill(teamInviteCode)
    const submitButton = page.locator('form button[type="submit"]')
    await submitButton.click()

    // Should navigate to team detail page
    await page.waitForURL(/\/hackathons\/.*\/teams\/.*/, { timeout: 10000 })

    // Should see the team detail page with the participant as a member
    await expect(page.getByText(participantFirstName)).toBeVisible({ timeout: 10000 })
  })
})
