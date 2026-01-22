import { test, expect } from "@playwright/test"

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`
const generateUniqueHackathonName = () => `Invite Code E2E ${Date.now()}`
const TEST_PASSWORD = "TestPassword123"

test.describe("Invite Code Management functionality", () => {
  test.describe.configure({ mode: "serial" })

  // Organizer user (creates hackathon)
  let organizerEmail: string
  let organizerFirstName: string

  // Team leader (creates the team)
  let teamLeaderEmail: string
  let teamLeaderFirstName: string

  // Non-member participant
  let nonMemberEmail: string
  let nonMemberFirstName: string

  let hackathonName: string
  let hackathonSlug: string
  let hackathonId: string
  let teamId: string
  let teamName: string
  let inviteCode: string

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
    await organizerPage.getByLabel("Description").fill("Test hackathon for invite code tests")

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
        description: "Team for invite code testing",
        isOpen: true,
      },
    })
    const teamData = await teamRes.json()
    teamId = teamData.id
    inviteCode = teamData.inviteCode

    await leaderPage.close()

    // === Create non-member participant user ===
    nonMemberEmail = generateUniqueEmail()
    nonMemberFirstName = "NonMember"

    const nonMemberPage = await browser.newPage()
    await nonMemberPage.goto("/register")

    await nonMemberPage.getByLabel("First name").fill(nonMemberFirstName)
    await nonMemberPage.getByLabel("Last name").fill("Test")
    await nonMemberPage.getByLabel("Email").fill(nonMemberEmail)
    await nonMemberPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD)
    await nonMemberPage.getByLabel("Confirm password").fill(TEST_PASSWORD)
    await nonMemberPage.getByRole("button", { name: "Create account" }).click()

    await expect(
      nonMemberPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${nonMemberFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 })

    // Get auth token and register for hackathon
    const nonMemberToken = await nonMemberPage.evaluate(() =>
      localStorage.getItem("accessToken")
    )

    // Register for hackathon (but don't join the team)
    await nonMemberPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${nonMemberToken}` } }
    )

    await nonMemberPage.close()
  })

  test("shows invite code section for team leader", async ({ page }) => {
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

    // Should see Invite Code section
    await expect(page.getByRole("heading", { name: "Invite Code" })).toBeVisible()

    // Should see the invite code displayed
    await expect(page.getByText(inviteCode)).toBeVisible()

    // Should see Regenerate Code button (leader only)
    await expect(page.getByRole("button", { name: "Regenerate Code" })).toBeVisible()
  })

  // Note: Non-leader team members would also see the invite code section
  // (based on `isOnThisTeam` check), but without the Regenerate button.
  // This is validated by the leader test which also checks section visibility.

  test("does not show invite code section for non-members", async ({ page }) => {
    // Login as non-member
    await page.goto("/login")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await page.getByLabel("Email").fill(nonMemberEmail)
    await page.getByLabel("Password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${nonMemberFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 })

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`)

    // Wait for page to load
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible({ timeout: 15000 })

    // Should NOT see Invite Code section (user is not on the team)
    await expect(page.getByRole("heading", { name: "Invite Code" })).not.toBeVisible()

    // Should NOT see the invite code
    await expect(page.getByText(inviteCode)).not.toBeVisible()
  })

  test("can copy invite code to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"])

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
    await expect(page.getByRole("heading", { name: "Invite Code" })).toBeVisible({ timeout: 15000 })

    // Click Copy button
    await page.locator("button").filter({ has: page.locator('svg[class*="lucide-copy"]') }).click()

    // Should show "Copied to clipboard!" message
    await expect(page.getByText("Copied to clipboard!")).toBeVisible()

    // Verify clipboard contents
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe(inviteCode)
  })

  test("shows regenerate confirmation dialog", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: "Invite Code" })).toBeVisible({ timeout: 15000 })

    // Click Regenerate Code button
    await page.getByRole("button", { name: "Regenerate Code" }).click()

    // Should show confirmation dialog
    await expect(page.getByRole("heading", { name: "Regenerate Invite Code" })).toBeVisible()

    // Should show warning text
    await expect(
      page.getByText("The current code will stop working immediately")
    ).toBeVisible()

    // Should have Cancel and Regenerate buttons
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Regenerate Code" }).nth(1)
    ).toBeVisible()

    // Cancel dialog
    await page.getByRole("button", { name: "Cancel" }).click()

    // Dialog should close
    await expect(page.getByRole("heading", { name: "Regenerate Invite Code" })).not.toBeVisible()
  })

  test("can successfully regenerate invite code", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: "Invite Code" })).toBeVisible({ timeout: 15000 })

    // Store old invite code
    const oldInviteCode = inviteCode

    // Click Regenerate Code button
    await page.getByRole("button", { name: "Regenerate Code" }).click()

    // Wait for dialog
    await expect(page.getByRole("heading", { name: "Regenerate Invite Code" })).toBeVisible()

    // Click confirm in dialog - use .nth(1) to get the second button (in the dialog)
    // The first one is on the page, the second is in the confirmation dialog
    await page.getByRole("button", { name: "Regenerate Code" }).nth(1).click()

    // Dialog should close
    await expect(page.getByRole("heading", { name: "Regenerate Invite Code" })).not.toBeVisible({
      timeout: 5000,
    })

    // Wait for the new code to appear - old code should no longer be visible
    await expect(page.getByText(oldInviteCode)).not.toBeVisible({ timeout: 5000 })

    // The invite code section should still be visible with a new code
    await expect(page.getByRole("heading", { name: "Invite Code" })).toBeVisible()

    // Get the new invite code from the page
    const newCodeElement = page.locator(".font-mono.text-lg.tracking-wider")
    await expect(newCodeElement).toBeVisible()
    const newInviteCode = await newCodeElement.textContent()

    // New code should be different from old code
    expect(newInviteCode).not.toBe(oldInviteCode)
    expect(newInviteCode).toBeTruthy()

    // Update inviteCode for any subsequent tests
    inviteCode = newInviteCode!
  })
})
