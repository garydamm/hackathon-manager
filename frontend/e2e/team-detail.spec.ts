import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Team Detail ${Date.now()}`;

// Generate unique team name
const generateUniqueTeamName = () => `E2E Team ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Team Detail Page', () => {
  // Run tests serially since they share state (hackathon and team created in beforeAll)
  test.describe.configure({ mode: 'serial' });

  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;
  // Store created hackathon info for tests
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: string;
  // Store created team info for tests
  let teamName: string;
  let teamId: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'TeamDetailTester';

    const page = await browser.newPage();
    await page.goto('/register');

    await page.getByLabel('First name').fill(testUserFirstName);
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Wait for successful registration (redirect to dashboard)
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Create a hackathon for team detail tests
    hackathonName = generateUniqueHackathonName();
    // Slug is typically generated from name - lowercase with dashes
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    // Fill out hackathon form
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('This is a test hackathon for team detail e2e testing.');

    // Set start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16);

    // Set end date to day after tomorrow
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endDate = dayAfterTomorrow.toISOString().slice(0, 16);

    await page.getByLabel('Start Date & Time *').fill(startDate);
    await page.getByLabel('End Date & Time *').fill(endDate);

    // Submit the form
    await page.getByRole('button', { name: 'Create Hackathon' }).click();

    // Wait for redirect to dashboard
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL('/');

    // Navigate to hackathon detail to get hackathon ID
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Get hackathon ID from URL or API response
    // Since the hackathon page might not expose the ID directly, we need to create a team via API
    // Let's use the browser to create a team through the API directly

    // Get auth token from localStorage
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));

    // First get hackathon by slug to get ID
    const hackathonResponse = await page.request.get(`http://localhost:8080/api/hackathons/${hackathonSlug}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const hackathon = await hackathonResponse.json();
    hackathonId = hackathon.id;

    // Create a team via API
    teamName = generateUniqueTeamName();
    const teamResponse = await page.request.post('http://localhost:8080/api/teams', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        hackathonId: hackathonId,
        name: teamName,
        description: 'Test team description for e2e testing.',
        isOpen: true
      }
    });
    const team = await teamResponse.json();
    teamId = team.id;

    // Log out by clearing localStorage
    await page.evaluate(() => localStorage.clear());
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Clear any existing session and login fresh
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    // Login with test user
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 10000 });
  });

  test('navigates to team detail page directly', async ({ page }) => {
    // Navigate directly to the team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load - should show team name as heading
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('displays team name and status badge', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Verify team name is shown
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify status badge (team was created as open)
    await expect(page.getByText('Open to join')).toBeVisible();
  });

  test('displays hackathon name with link back to hackathon detail', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify "Participating in" label
    await expect(page.getByText('Participating in')).toBeVisible();

    // Verify hackathon name link is present
    const hackathonLink = page.getByRole('link', { name: hackathonName });
    await expect(hackathonLink).toBeVisible();

    // Click hackathon link and verify navigation
    await hackathonLink.click();
    await expect(page).toHaveURL(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('displays team description', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify description card and content
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    await expect(page.getByText('Test team description for e2e testing.')).toBeVisible();
  });

  test('displays members section with capacity indicator', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Members heading
    await expect(page.getByRole('heading', { name: /Members/ })).toBeVisible();

    // Verify member capacity indicator (e.g., "1 of 5 members" depending on hackathon settings)
    await expect(page.getByText(/\d+ of \d+ members/)).toBeVisible();
  });

  test('displays member list with leader badge', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // The creator should be shown as a member with Leader badge
    await expect(page.getByText('Leader')).toBeVisible();

    // Verify the user's name is shown in the member list (displayName or firstName + lastName)
    await expect(page.getByRole('listitem').getByText(testUserFirstName)).toBeVisible();
  });

  test('back to teams link navigates to teams list', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Click back link
    await page.getByRole('button', { name: 'Back to Teams' }).click();

    // Verify navigation to teams list page
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(`/hackathons/${hackathonSlug}/teams`);
  });
});
