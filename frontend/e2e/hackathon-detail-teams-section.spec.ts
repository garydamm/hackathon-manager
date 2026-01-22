import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Detail Teams ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Hackathon Detail - Teams Section', () => {
  // Run tests serially since they share state (hackathon created in beforeAll)
  test.describe.configure({ mode: 'serial' });

  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;
  // Store created hackathon info for tests
  let hackathonName: string;
  let hackathonSlug: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'DetailTester';

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

    // Create a hackathon with registration_open status for teams tests
    hackathonName = generateUniqueHackathonName();
    // Slug is typically generated from name - lowercase with dashes
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    // Fill out hackathon form
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('This is a test hackathon for teams section e2e testing.');

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

    // Wait for redirect to dashboard (wait for welcome heading to confirm redirect complete)
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL('/');

    // Go to hackathon detail page and change status to registration_open
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Click Edit button to edit the hackathon
    await page.getByRole('button', { name: 'Edit' }).click();

    // Change status to registration_open
    await page.getByLabel('Status').selectOption('registration_open');

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Wait for edit mode to close (save button disappears, edit button appears)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 10000 });

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

  test('displays Teams section on hackathon detail page with registration_open status', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Teams section is visible (use exact: true to avoid matching hackathon name that contains "Teams")
    await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeVisible();
  });

  test('displays teams count in Teams section', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Teams section shows count (0 teams initially)
    await expect(page.getByText(/0 teams in this hackathon/i)).toBeVisible();
  });

  test('has Browse Teams button that navigates to teams list', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Click Browse Teams button
    await page.getByRole('link', { name: 'Browse Teams' }).click();

    // Verify navigation to teams list page
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(`/hackathons/${hackathonSlug}/teams`);
  });
});
