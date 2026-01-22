import { test, expect } from "@playwright/test"

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
const generateUniqueHackathonName = () => `Edit Team E2E ${Date.now()}`
const TEST_PASSWORD = "TestPassword123"

test.describe("Edit Team functionality", () => {
  test.describe.configure({ mode: "serial" })

  // Organizer user (creates hackathon)
  let organizerEmail: string
  let organizerFirstName: string

  // Team leader (creates the team)
  let teamLeaderEmail: string
  let teamLeaderFirstName: string

  // Regular participant (not leader)
  let participantEmail: string
  let participantFirstName: string

  let hackathonName: string
  let hackathonSlug: string
  let hackathonId: string
  let teamId: string
  let teamName: string

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
    await organizerPage.getByLabel("Description").fill("Test hackathon for edit team tests")

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
    teamName = `Test Team ${Date.now()}`

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
        name: teamName,
        description: "Original team description",
        isOpen: true,
      },
    })
    const teamData = await teamRes.json()
    teamId = teamData.id

    await leaderPage.close()

    // === Create regular participant user and register (but don't create/join a team) ===
    participantEmail = generateUniqueEmail()
    participantFirstName = "RegularParticipant"

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

    // Get auth token and register for hackathon
    const participantToken = await participantPage.evaluate(() =>
      localStorage.getItem("accessToken")
    )

    // Register for hackathon
    await participantPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${participantToken}` } }
    )

    await participantPage.close()
  })

  test("shows Edit Team button for team leader", async ({ page }) => {
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

    // Wait for page to load - check for Members section
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Should see Edit Team button
    await expect(page.getByRole("button", { name: "Edit Team" })).toBeVisible({ timeout: 10000 })
  })

  test("does not show Edit Team button for non-member users", async ({ page }) => {
    // Login as participant who is NOT on the team
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

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`)

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Should NOT see Edit Team button (user is not a member)
    await expect(page.getByRole("button", { name: "Edit Team" })).not.toBeVisible()

    // Should NOT see Leave Team button either (user is not a member)
    await expect(page.getByRole("button", { name: "Leave Team" })).not.toBeVisible()
  })

  test("opens Edit Team modal with pre-filled values", async ({ page }) => {
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

    // Click Edit Team button
    await page.getByRole("button", { name: "Edit Team" }).click()

    // Should see Edit Team modal
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Check that form is pre-filled with current values
    await expect(page.locator("#edit-team-name")).toHaveValue(teamName)
    await expect(page.locator("#edit-team-description")).toHaveValue("Original team description")

    // Check buttons are present
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible()
  })

  test("can cancel Edit Team modal without changes", async ({ page }) => {
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

    // Click Edit Team button
    await page.getByRole("button", { name: "Edit Team" }).click()

    // Wait for modal
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Make changes but don't save
    await page.locator("#edit-team-name").fill("Changed Name That Will Not Save")

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click()

    // Modal should close
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).not.toBeVisible()

    // Team name on page should still be the original
    await expect(page.getByRole("heading", { name: teamName, level: 1 })).toBeVisible()
  })

  test("can successfully edit team name and description", async ({ page }) => {
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

    // Click Edit Team button
    await page.getByRole("button", { name: "Edit Team" }).click()

    // Wait for modal
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Update team name and description
    const updatedName = `Updated Team ${Date.now()}`
    const updatedDescription = "This is the updated team description"

    await page.locator("#edit-team-name").clear()
    await page.locator("#edit-team-name").fill(updatedName)
    await page.locator("#edit-team-description").clear()
    await page.locator("#edit-team-description").fill(updatedDescription)

    // Save changes
    await page.getByRole("button", { name: "Save Changes" }).click()

    // Modal should close
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).not.toBeVisible({
      timeout: 5000,
    })

    // Team page should show updated values
    await expect(page.getByRole("heading", { name: updatedName, level: 1 })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText(updatedDescription)).toBeVisible()

    // Update teamName for subsequent tests
    teamName = updatedName
  })

  test("can toggle team open/closed status", async ({ page }) => {
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

    // Check current status and determine expected behavior
    const isCurrentlyOpen = await page.getByText("Open to join").isVisible()

    // Click Edit Team button
    await page.getByRole("button", { name: "Edit Team" }).click()

    // Wait for modal
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Toggle the switch - click on the switch itself (the label wrapping the checkbox)
    // The switch is in a flex row with the "Open for Joining" text, we need to click the switch element
    await page.locator("label.relative.inline-flex.cursor-pointer").click()

    // Should show the opposite message after toggle
    if (isCurrentlyOpen) {
      await expect(page.getByText("Only people with invite code can join")).toBeVisible()
    } else {
      await expect(page.getByText("Anyone can browse and join your team")).toBeVisible()
    }

    // Save changes
    await page.getByRole("button", { name: "Save Changes" }).click()

    // Modal should close
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).not.toBeVisible({
      timeout: 5000,
    })

    // Team page should show toggled badge
    if (isCurrentlyOpen) {
      await expect(page.getByText("Closed")).toBeVisible({ timeout: 5000 })
    } else {
      await expect(page.getByText("Open to join")).toBeVisible({ timeout: 5000 })
    }
  })

  test("validates that team name cannot be empty", async ({ page }) => {
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

    // Click Edit Team button
    await page.getByRole("button", { name: "Edit Team" }).click()

    // Wait for modal
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).toBeVisible({
      timeout: 5000,
    })

    // Clear the team name
    await page.locator("#edit-team-name").clear()

    // Try to save
    await page.getByRole("button", { name: "Save Changes" }).click()

    // Should show validation error
    await expect(page.getByText("Team name is required")).toBeVisible()

    // Modal should still be open
    await expect(page.getByRole("heading", { name: "Edit Team", level: 2 })).toBeVisible()
  })
})
