import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Project Archive ${Date.now()}`;

// Generate unique team name
const generateUniqueTeamName = () => `E2E Archive Team ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Project Archive Workflow', () => {
  // Run tests serially since they share state
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
    testUserFirstName = 'ArchiveTester';

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

    // Create a hackathon for project archive tests
    hackathonName = generateUniqueHackathonName();
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    // Fill out hackathon form
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('This is a test hackathon for project archive e2e testing.');

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

    // Get auth token and hackathon ID
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));

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
        description: 'Test team for project archive e2e testing.',
        isOpen: true
      }
    });
    const team = await teamResponse.json();
    teamId = team.id;

    // Log out
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

  test('team member can archive project', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Create a project first via API (simpler than UI interaction)
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));

    const createProjectResponse = await page.request.post('http://localhost:8080/api/projects', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        teamId: teamId,
        name: 'Test Project to Archive',
        description: 'This project will be archived in the test.'
      }
    });
    expect(createProjectResponse.ok()).toBeTruthy();
    const createdProject = await createProjectResponse.json();
    const projectId = createdProject.id;

    // Reload to see the project
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Test Project to Archive' })).toBeVisible({ timeout: 10000 });

    // Archive the project via API
    const archiveResponse = await page.request.post(`http://localhost:8080/api/projects/${projectId}/archive`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Check if archive was successful - if not, log the error
    if (!archiveResponse.ok()) {
      const errorBody = await archiveResponse.text();
      console.log(`Archive failed with status ${archiveResponse.status()}: ${errorBody}`);
    }
    expect(archiveResponse.ok()).toBeTruthy();

    // Reload page to see the archived project is gone
    await page.reload();
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify project disappears from view after archive
    await expect(page.getByRole('heading', { name: 'Test Project to Archive' })).not.toBeVisible({ timeout: 5000 });

    // Verify we see the "no project" state
    await expect(page.getByText(/No project yet/i)).toBeVisible({ timeout: 5000 });
  });

  test('team can create new project after archiving previous one', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: teamName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify we can create a new project (previous was archived)
    await expect(page.getByRole('button', { name: /Create Project/i }).first()).toBeVisible();

    // Create a new project - click the button that opens the form
    await page.getByRole('button', { name: /Create Project/i }).first().click();

    // Fill project form
    await page.getByLabel('Project Name').fill('New Project After Archive');
    await page.getByLabel('Description').fill('This project was created after archiving the previous one.');

    // Submit project form - click the submit button inside the form
    await page.locator('form').getByRole('button', { name: /Create Project/i }).click();

    // Wait for new project to be created and displayed
    await expect(page.getByRole('heading', { name: 'New Project After Archive' })).toBeVisible({ timeout: 10000 });

    // Verify project appears in list
    await expect(page.getByText('This project was created after archiving the previous one.')).toBeVisible();
  });

  test('archived project does not appear in project lists', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Navigate to projects tab if it exists
    // Verify the archived project "Test Project to Archive" does NOT appear
    await expect(page.getByRole('heading', { name: 'Test Project to Archive' })).not.toBeVisible();

    // Verify the new project DOES appear
    await expect(page.getByRole('heading', { name: 'New Project After Archive' })).toBeVisible();
  });
});
