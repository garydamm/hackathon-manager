import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Teams Test ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Teams List Page', () => {
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
    testUserFirstName = 'TeamsTester';

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

    // Create a hackathon for teams tests
    hackathonName = generateUniqueHackathonName();
    // Slug is typically generated from name - lowercase with dashes
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    // Fill out hackathon form
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('This is a test hackathon for teams e2e testing.');

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

  test('navigates to teams list page directly', async ({ page }) => {
    // Navigate directly to the teams list page using the slug
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Wait for page to load - should show "Teams" heading
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('displays teams page with correct header and hackathon context', async ({ page }) => {
    // Navigate to teams list page
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Verify header
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify hackathon context in description
    await expect(page.getByText(`Browse teams participating in ${hackathonName}`)).toBeVisible();

    // Verify back link is present with hackathon name
    await expect(page.getByRole('button', { name: `Back to ${hackathonName}` })).toBeVisible();
  });

  test('displays search input and filter toggle', async ({ page }) => {
    // Navigate to teams list page
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify search input is present
    await expect(page.getByPlaceholder('Search teams by name...')).toBeVisible();

    // Verify filter toggle is present
    await expect(page.getByText('Show open teams only')).toBeVisible();
  });

  test('displays empty state when no teams exist', async ({ page }) => {
    // Navigate to teams list page
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify empty state is shown (no teams created yet)
    await expect(page.getByText('No teams found')).toBeVisible();
    await expect(page.getByText('No teams have been created for this hackathon yet.')).toBeVisible();
  });

  test('back link navigates to hackathon detail page', async ({ page }) => {
    // Navigate to teams list page
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });

    // Click back link
    await page.getByRole('button', { name: `Back to ${hackathonName}` }).click();

    // Verify navigation to hackathon detail page
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(`/hackathons/${hackathonSlug}`);
  });

  test('search input accepts user input', async ({ page }) => {
    // Navigate to teams list page
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });

    // Type in search input and verify it accepts input
    const searchInput = page.getByPlaceholder('Search teams by name...');
    await searchInput.fill('test search');

    // Verify input value was set
    await expect(searchInput).toHaveValue('test search');

    // Since there are no teams, the empty state should still show
    await expect(page.getByText('No teams found')).toBeVisible();
  });

  test('filter toggle can be toggled', async ({ page }) => {
    // Navigate to teams list page
    await page.goto(`/hackathons/${hackathonSlug}/teams`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });

    // Find the checkbox by its ID (the actual input is sr-only, so we use the label for clicking)
    const switchCheckbox = page.locator('#open-only');
    const switchLabel = page.getByText('Show open teams only');

    // Verify label is visible and checkbox is unchecked by default
    await expect(switchLabel).toBeVisible();
    await expect(switchCheckbox).not.toBeChecked();

    // Toggle it on by clicking the label text
    await switchLabel.click();
    await expect(switchCheckbox).toBeChecked();

    // Toggle it off
    await switchLabel.click();
    await expect(switchCheckbox).not.toBeChecked();
  });
});
