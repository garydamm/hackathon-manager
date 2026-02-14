import { test, expect } from '@playwright/test';

const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
const generateUniqueHackathonName = () => `E2E EnhTeams ${Date.now()}`;
const TEST_PASSWORD = 'TestPassword123';

test.describe('Enhanced Teams Section on Hackathon Detail', () => {
  test.describe.configure({ mode: 'serial' });

  let organizerEmail: string;
  let organizerFirstName: string;
  let participantEmail: string;
  let participantFirstName: string;
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: string;
  let teamName: string;

  test.beforeAll(async ({ browser }) => {
    // === Create organizer user and hackathon ===
    organizerEmail = generateUniqueEmail();
    organizerFirstName = 'OrgEnhTeams';

    const organizerPage = await browser.newPage();
    await organizerPage.goto('/register');

    await organizerPage.getByLabel('First name').fill(organizerFirstName);
    await organizerPage.getByLabel('Last name').fill('User');
    await organizerPage.getByLabel('Email').fill(organizerEmail);
    await organizerPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await organizerPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await organizerPage.getByRole('button', { name: 'Create account' }).click();

    await expect(
      organizerPage.getByRole('heading', {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Create hackathon
    hackathonName = generateUniqueHackathonName();
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await organizerPage.goto('/hackathons/new');
    await organizerPage.getByLabel('Hackathon Name *').fill(hackathonName);
    await organizerPage.getByLabel('Description').fill('Test hackathon for enhanced teams section e2e.');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const endDate = dayAfter.toISOString().slice(0, 16);

    await organizerPage.getByLabel('Start Date & Time *').fill(startDate);
    await organizerPage.getByLabel('End Date & Time *').fill(endDate);
    await organizerPage.getByRole('button', { name: 'Create Hackathon' }).click();

    await expect(
      organizerPage.getByRole('heading', {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Get organizer token and hackathon ID, set status to registration_open
    const organizerToken = (await organizerPage.evaluate(() =>
      localStorage.getItem('accessToken')
    ))!;

    const hackathonRes = await organizerPage.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${organizerToken}` } }
    );
    const hackathon = await hackathonRes.json();
    hackathonId = hackathon.id;

    await organizerPage.request.put(`http://localhost:8080/api/hackathons/${hackathonId}`, {
      headers: {
        Authorization: `Bearer ${organizerToken}`,
        'Content-Type': 'application/json',
      },
      data: { status: 'registration_open' },
    });

    await organizerPage.evaluate(() => localStorage.clear());
    await organizerPage.close();

    // === Create participant user and register for hackathon ===
    participantEmail = generateUniqueEmail();
    participantFirstName = 'PartEnhTeams';

    const participantPage = await browser.newPage();
    await participantPage.goto('/register');

    await participantPage.getByLabel('First name').fill(participantFirstName);
    await participantPage.getByLabel('Last name').fill('User');
    await participantPage.getByLabel('Email').fill(participantEmail);
    await participantPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await participantPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await participantPage.getByRole('button', { name: 'Create account' }).click();

    await expect(
      participantPage.getByRole('heading', {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Register participant for the hackathon via API
    const participantToken = (await participantPage.evaluate(() =>
      localStorage.getItem('accessToken')
    ))!;

    await participantPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${participantToken}` } }
    );

    await participantPage.evaluate(() => localStorage.clear());
    await participantPage.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login as participant before each test
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel('Email').fill(participantEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByRole('heading', {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows Teams header with count (0) when no teams exist', async ({ page }) => {
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Header should show "Teams (0)"
    await expect(page.getByText('Teams (0)')).toBeVisible();
  });

  test('displays team thumbnails in grid and clicking navigates to team detail', async ({ page }) => {
    // Create a team via API first
    const token = (await page.evaluate(() => localStorage.getItem('accessToken')))!;

    teamName = `E2E Grid Team ${Date.now()}`;
    const createRes = await page.request.post('http://localhost:8080/api/teams', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        hackathonId,
        name: teamName,
        description: 'Test team for grid display',
        isOpen: true,
      },
    });
    const createdTeam = await createRes.json();

    // Navigate to hackathon detail
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Header should now show "Teams (1)"
    await expect(page.getByText('Teams (1)')).toBeVisible();

    // Team thumbnail should be visible - use the link containing the team name
    const teamLink = page.getByRole('link', { name: new RegExp(teamName) });
    await expect(teamLink).toBeVisible();

    // Click the team thumbnail to navigate to team detail
    await teamLink.click();

    // Should navigate to team detail page
    await page.waitForURL(/\/hackathons\/.*\/teams\/.*/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible({ timeout: 10000 });
  });

  test('creating a team updates the Teams grid and count', async ({ page }) => {
    // Navigate to hackathon detail
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Participant already has a team from the previous test, so the "Create Team" button
    // may not be available (depends on one-team-per-hackathon rule).
    // Instead, let's leave the team first via API, then create a new one via the UI.
    const token = (await page.evaluate(() => localStorage.getItem('accessToken')))!;

    // Leave current team via API
    const myTeamRes = await page.request.get(
      `http://localhost:8080/api/teams/hackathon/${hackathonId}/my-team`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (myTeamRes.ok()) {
      const myTeam = await myTeamRes.json();
      await page.request.post(`http://localhost:8080/api/teams/${myTeam.id}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Navigate to teams page with create modal open
    await page.goto(`/hackathons/${hackathonSlug}/teams?create=true`);
    await expect(page.locator('#team-name')).toBeVisible({ timeout: 10000 });

    const newTeamName = `E2E New Team ${Date.now()}`;
    await page.locator('#team-name').fill(newTeamName);
    await page.locator('#team-description').fill('New team created via E2E test');

    // Submit the form
    const submitButton = page.locator('form button[type="submit"]');
    await submitButton.click();

    // Should navigate to team detail page
    await page.waitForURL(/\/hackathons\/.*\/teams\/.*/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: newTeamName })).toBeVisible({ timeout: 10000 });

    // Navigate back to hackathon detail
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // The new team should appear in the grid
    await expect(page.getByRole('link', { name: new RegExp(newTeamName) })).toBeVisible();

    // Update teamName for subsequent tests
    teamName = newTeamName;
  });

  test('My Team / All Teams toggle filter works correctly', async ({ page }) => {
    // Navigate to hackathon detail - participant has a team from previous test
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // The toggle should be visible since the user has a team
    await expect(page.getByRole('button', { name: 'All Teams' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My Team' })).toBeVisible();

    // "All Teams" should be active by default - verify our team is visible
    const teamLink = page.getByRole('link', { name: new RegExp(teamName) });
    await expect(teamLink).toBeVisible();

    // Click "My Team" filter
    await page.getByRole('button', { name: 'My Team' }).click();

    // Our team should still be visible (it's our team)
    await expect(teamLink).toBeVisible();

    // Click "All Teams" to go back
    await page.getByRole('button', { name: 'All Teams' }).click();

    // Our team should still be visible
    await expect(teamLink).toBeVisible();
  });
});
