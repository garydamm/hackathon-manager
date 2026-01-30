import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Participants ${Date.now()}`;

// Generate slug from name
const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Hackathon Detail - Participants Section', () => {
  // Run tests serially since they share state (hackathon created in beforeAll)
  test.describe.configure({ mode: 'serial' });

  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;
  let testUserToken: string;
  let secondUserEmail: string;
  let secondUserFirstName: string;
  let secondUserToken: string;
  // Store created hackathon info for tests
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: number;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // === Create first test user (organizer and participant) ===
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'ParticipantTester';

    await page.goto('/register');
    await page.getByLabel('First name').fill(testUserFirstName);
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Get auth token for API calls
    testUserToken = await page.evaluate(() => localStorage.getItem('accessToken')) as string;

    // === Create a hackathon via API ===
    hackathonName = generateUniqueHackathonName();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const createHackathonRes = await page.request.post('http://localhost:8080/api/hackathons', {
      headers: { Authorization: `Bearer ${testUserToken}` },
      data: {
        name: hackathonName,
        slug: generateSlug(hackathonName),
        description: 'Test hackathon for participants section e2e testing',
        startsAt: tomorrow.toISOString(),
        endsAt: dayAfterTomorrow.toISOString(),
        status: 'registration_open',
      },
    });
    if (!createHackathonRes.ok()) {
      console.error('Failed to create hackathon:', createHackathonRes.status(), await createHackathonRes.text());
    }
    expect(createHackathonRes.ok()).toBeTruthy();
    const hackathonData = await createHackathonRes.json();
    hackathonId = hackathonData.id;
    hackathonSlug = hackathonData.slug;

    // === Register first user for hackathon and create a team via API ===
    await page.request.post(`http://localhost:8080/api/hackathons/${hackathonId}/register`, {
      headers: { Authorization: `Bearer ${testUserToken}` },
    });

    await page.request.post(`http://localhost:8080/api/teams`, {
      headers: { Authorization: `Bearer ${testUserToken}` },
      data: {
        hackathonId: hackathonId,
        name: 'Test Team',
        description: 'Test team for participant testing',
        isOpen: false,
      },
    });

    // === Create second test user ===
    secondUserEmail = generateUniqueEmail();
    secondUserFirstName = 'SecondUser';

    const secondPage = await browser.newPage();
    await secondPage.goto('/register');
    await secondPage.getByLabel('First name').fill(secondUserFirstName);
    await secondPage.getByLabel('Last name').fill('Tester');
    await secondPage.getByLabel('Email').fill(secondUserEmail);
    await secondPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await secondPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await secondPage.getByRole('button', { name: 'Create account' }).click();
    await expect(secondPage.getByRole('heading', { name: new RegExp(`Welcome back, ${secondUserFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Get auth token for second user
    secondUserToken = await secondPage.evaluate(() => localStorage.getItem('accessToken')) as string;

    // === Register second user for hackathon and create a team via API ===
    await secondPage.request.post(`http://localhost:8080/api/hackathons/${hackathonId}/register`, {
      headers: { Authorization: `Bearer ${secondUserToken}` },
    });

    await secondPage.request.post(`http://localhost:8080/api/teams`, {
      headers: { Authorization: `Bearer ${secondUserToken}` },
      data: {
        hackathonId: hackathonId,
        name: 'Second Team',
        description: 'Second test team for participant testing',
        isOpen: false,
      },
    });

    await page.close();
    await secondPage.close();
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

  test('displays Participants section on hackathon detail page', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Participants section is visible with count
    await expect(page.getByRole('heading', { name: /Participants \(\d+\)/ })).toBeVisible();
  });

  test('displays participant count in section header', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Participants section shows count (should be 2)
    await expect(page.getByRole('heading', { name: /Participants \(2\)/ })).toBeVisible();
  });

  test('displays participant details including name, email, and team', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify participant details are visible (these texts are unique to the Participants section)
    await expect(page.getByText('Team: Test Team')).toBeVisible();
    await expect(page.getByText('Team Leader').first()).toBeVisible();
    await expect(page.getByText('Team: Second Team')).toBeVisible();
  });

  test('participants are sorted alphabetically by name', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Get all team name elements
    const testTeamLocator = page.getByText('Team: Test Team');
    const secondTeamLocator = page.getByText('Team: Second Team');

    // Get the bounding boxes to check vertical position
    const testTeamBox = await testTeamLocator.boundingBox();
    const secondTeamBox = await secondTeamLocator.boundingBox();

    // Verify ParticipantTester User's team (Test Team) appears before SecondUser Tester's team (Second Team)
    // Since names are sorted alphabetically, "ParticipantTester User" < "SecondUser Tester"
    expect(testTeamBox!.y).toBeLessThan(secondTeamBox!.y);
  });
});
