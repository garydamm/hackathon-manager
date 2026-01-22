import { test, expect } from "@playwright/test"

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
const generateUniqueHackathonName = () => `Leave Team E2E ${Date.now()}`
const TEST_PASSWORD = "TestPassword123"

test.describe("Leave Team functionality", () => {
  test.describe.configure({ mode: "serial" })

  // Organizer user (creates hackathon)
  let organizerEmail: string
  let organizerFirstName: string

  // Team leader (creates the team)
  let teamLeaderEmail: string
  let teamLeaderFirstName: string

  let hackathonName: string
  let hackathonSlug: string
  let hackathonId: string
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
    await organizerPage.getByLabel("Description").fill("Test hackathon for leave team tests")

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

    // === Create team leader user, register, and create team ===
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

    // Create a team
    const teamRes = await leaderPage.request.post("http://localhost:8080/api/teams", {
      headers: {
        Authorization: `Bearer ${leaderToken}`,
        "Content-Type": "application/json",
      },
      data: {
        hackathonId,
        name: `Test Team ${Date.now()}`,
        description: "A team for testing leave functionality",
        isOpen: true,
      },
    })
    const teamData = await teamRes.json()
    teamId = teamData.id

    await leaderPage.close()
  })

  test("shows Leave Team button for team leader (who created the team)", async ({ page }) => {
    // Login as team leader (who is already a member by creating the team)
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(teamLeaderEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${teamLeaderFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`)

    // Wait for page to load - check for Members section
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Should see Leave Team button
    await expect(page.getByRole("button", { name: "Leave Team" })).toBeVisible({ timeout: 10000 })
  })

  test("opens confirmation dialog when clicking Leave Team", async ({ page }) => {
    // Login as team leader
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(teamLeaderEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${teamLeaderFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`)

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Click Leave Team button
    await page.getByRole("button", { name: "Leave Team" }).click()

    // Should see confirmation dialog
    await expect(page.getByRole("heading", { name: "Leave Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText("Are you sure you want to leave")).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
  })

  test("can cancel leave confirmation dialog", async ({ page }) => {
    // Login as team leader
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(teamLeaderEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${teamLeaderFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`)

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Click Leave Team button
    await page.getByRole("button", { name: "Leave Team" }).click()

    // Wait for dialog
    await expect(page.getByRole("heading", { name: "Leave Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click()

    // Dialog should close
    await expect(page.getByRole("heading", { name: "Leave Team", level: 2 })).not.toBeVisible()

    // Leave Team button should still be visible
    await expect(page.getByRole("button", { name: "Leave Team" })).toBeVisible()
  })

  test("leader can leave team and is redirected to hackathon page", async ({ page }) => {
    // Login as team leader
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(teamLeaderEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${teamLeaderFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`)

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Click Leave Team button
    await page.getByRole("button", { name: "Leave Team" }).click()

    // Wait for dialog
    await expect(page.getByRole("heading", { name: "Leave Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Confirm leave - find the button inside the dialog
    const dialog = page.locator(".bg-background.rounded-xl")
    await dialog.getByRole("button", { name: "Leave Team" }).click()

    // Should redirect to hackathon detail page
    await expect(page).toHaveURL(new RegExp(`/hackathons/${hackathonSlug}$`), { timeout: 10000 })
  })

})
