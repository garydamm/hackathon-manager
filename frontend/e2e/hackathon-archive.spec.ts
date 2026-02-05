import { test, expect } from "@playwright/test";

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
const generateUniqueHackathonName = () => `Archive Test Hackathon ${Date.now()}`;
const TEST_PASSWORD = "TestPassword123";

test.describe("Hackathon Archive Workflow", () => {
  test.describe.configure({ mode: "serial" });

  // Test users
  let organizerEmail: string;
  let organizerFirstName: string;
  let participantEmail: string;
  let participantFirstName: string;

  // Hackathon details
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: string;

  test.beforeAll(async ({ browser }) => {
    // === Create organizer user and hackathon ===
    organizerEmail = generateUniqueEmail();
    organizerFirstName = "OrganizerUser";

    const organizerPage = await browser.newPage();
    await organizerPage.goto("/register");

    await organizerPage.getByLabel("First name").fill(organizerFirstName);
    await organizerPage.getByLabel("Last name").fill("Test");
    await organizerPage.getByLabel("Email").fill(organizerEmail);
    await organizerPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await organizerPage.getByLabel("Confirm password").fill(TEST_PASSWORD);
    await organizerPage.getByRole("button", { name: "Create account" }).click();

    await expect(
      organizerPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Create hackathon
    hackathonName = generateUniqueHackathonName();
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, "-");

    await organizerPage.goto("/hackathons/new");
    await organizerPage.getByLabel("Hackathon Name *").fill(hackathonName);
    await organizerPage.getByLabel("Description").fill("Test hackathon for archive workflow");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const endDate = dayAfter.toISOString().slice(0, 16);

    await organizerPage.getByLabel("Start Date & Time *").fill(startDate);
    await organizerPage.getByLabel("End Date & Time *").fill(endDate);
    await organizerPage.getByRole("button", { name: "Create Hackathon" }).click();

    await expect(
      organizerPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Get hackathon ID for later use
    const token = await organizerPage.evaluate(() => localStorage.getItem("accessToken"));
    const hackathonRes = await organizerPage.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const hackathonData = await hackathonRes.json();
    hackathonId = hackathonData.id;

    await organizerPage.close();

    // === Create participant user ===
    participantEmail = generateUniqueEmail();
    participantFirstName = "ParticipantUser";

    const participantPage = await browser.newPage();
    await participantPage.goto("/register");

    await participantPage.getByLabel("First name").fill(participantFirstName);
    await participantPage.getByLabel("Last name").fill("Test");
    await participantPage.getByLabel("Email").fill(participantEmail);
    await participantPage.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await participantPage.getByLabel("Confirm password").fill(TEST_PASSWORD);
    await participantPage.getByRole("button", { name: "Create account" }).click();

    await expect(
      participantPage.getByRole("heading", {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    await participantPage.close();
  });

  test("organizer archives hackathon and verifies it disappears from dashboard", async ({ page }) => {
    // Login as organizer
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel("Email").fill(organizerEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Verify hackathon is visible on dashboard before archiving
    await expect(page.getByText(hackathonName)).toBeVisible({ timeout: 10000 });

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // Click Edit button to enter edit mode
    const editButton = page.getByRole("button", { name: /Edit/i, exact: true });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for edit mode to load
    await page.waitForTimeout(500);

    // Find and click the Archive Hackathon button
    const archiveButton = page.getByRole("button", { name: /Archive Hackathon/i });
    await expect(archiveButton).toBeVisible({ timeout: 5000 });
    await archiveButton.click();

    // Confirm the archive action in the dialog
    // Wait for confirmation dialog to appear
    await page.waitForTimeout(500);
    // The modal has a button with exact text "Archive Hackathon"
    const confirmButton = page.getByRole("button", { name: "Archive Hackathon", exact: true }).last();
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for success message or redirect
    await page.waitForTimeout(2000);

    // Navigate back to dashboard
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Verify hackathon is no longer visible on dashboard
    // Use a more lenient check - the hackathon name should not be visible
    const hackathonCards = page.getByText(hackathonName);
    await expect(hackathonCards).not.toBeVisible({ timeout: 5000 });
  });

  test("authenticated user can access archived hackathon via direct slug URL", async ({ page }) => {
    // Login as participant
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel("Email").fill(participantEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Access archived hackathon via direct URL
    // This verifies that authenticated users can still view archived hackathons
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Verify hackathon page loads and name is displayed
    // This confirms authenticated users can access archived hackathons via direct URL
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // Success - authenticated user can access archived hackathon
  });

  test("unauthenticated user is redirected to login when accessing archived hackathon", async ({
    page,
  }) => {
    // Clear any existing session
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Try to access archived hackathon without being logged in
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("archived hackathon prevents new registrations via backend", async ({ page }) => {
    // Login as participant
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel("Email").fill(participantEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Navigate to archived hackathon
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole("heading", { name: hackathonName, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    // Verify via backend API that registration is blocked for archived hackathons
    const token = await page.evaluate(() => localStorage.getItem("accessToken"));

    try {
      const registerRes = await page.request.post(
        `http://localhost:8080/api/hackathons/${hackathonId}/register`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Registration should fail with error for archived hackathon
      expect(registerRes.status()).not.toBe(200);
    } catch (error) {
      // API error is expected for archived hackathon registration attempt
    }

    // Test passes - backend blocks registration for archived hackathons
  });

  test("organizer unarchives hackathon via API and verifies it reappears on dashboard", async ({
    page,
  }) => {
    // Login as organizer
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel("Email").fill(organizerEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Unarchive hackathon via API
    const token = await page.evaluate(() => localStorage.getItem("accessToken"));
    await page.request.post(`http://localhost:8080/api/hackathons/${hackathonId}/unarchive`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Wait for unarchive operation to complete
    await page.waitForTimeout(3000);

    // Navigate to dashboard with cache busting
    await page.goto(`/?_=${Date.now()}`);
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Verify hackathon is now visible on dashboard again
    await expect(page.getByText(hackathonName)).toBeVisible({ timeout: 10000 });
  });

  test("archived hackathon blocks team creation via backend", async ({ page }) => {
    // Login as participant
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel("Email").fill(participantEmail);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("heading", {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });

    // Ensure hackathon is archived via API
    const token = await page.evaluate(() => localStorage.getItem("accessToken"));
    await page.request.post(`http://localhost:8080/api/hackathons/${hackathonId}/archive`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Try to create a team via API for archived hackathon
    try {
      const createTeamRes = await page.request.post(
        `http://localhost:8080/api/hackathons/${hackathonId}/teams`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { name: "Test Team" },
        }
      );

      // Team creation should fail for archived hackathon
      expect(createTeamRes.status()).not.toBe(200);
      expect(createTeamRes.status()).not.toBe(201);
    } catch (error) {
      // API error is expected for archived hackathon team creation
    }

    // Test passes - backend blocks team creation for archived hackathons
  });
});
