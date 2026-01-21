import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Detail Test ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Hackathon Detail View', () => {
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

    // Create a hackathon for detail view tests
    hackathonName = generateUniqueHackathonName();
    // Slug is typically generated from name - lowercase with dashes
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    // Fill out hackathon form
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('This is a test hackathon description for e2e testing.');

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

  test('navigates to hackathon detail page', async ({ page }) => {
    // Navigate directly to the hackathon detail page using the slug
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load - should show the hackathon name
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('displays hackathon name, description, and status badge', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Verify hackathon name is displayed
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify description is displayed (in About section)
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
    await expect(page.getByText('This is a test hackathon description for e2e testing.')).toBeVisible();

    // Verify status badge is displayed (Registration Open is the default when created with publishImmediately=true)
    await expect(page.getByText('Registration Open')).toBeVisible();
  });

  test('displays quick info cards (start date, end date, location, participants)', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify quick info cards are displayed
    // Start date card
    await expect(page.getByText('Starts')).toBeVisible();

    // End date card
    await expect(page.getByText('Ends')).toBeVisible();

    // Location card - should show "Virtual" or a location
    await expect(page.getByText('Location')).toBeVisible();

    // Participants card
    await expect(page.getByText('Participants')).toBeVisible();
  });

  test('displays rules section when rules are present', async ({ page }) => {
    // First, edit the hackathon to add rules (since we're the organizer)
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Click edit button
    await page.getByRole('button', { name: 'Edit' }).click();

    // Wait for edit form to appear
    await expect(page.getByLabel('Name')).toBeVisible();

    // Add rules
    const rulesText = 'Test rules for the hackathon: 1. Be respectful. 2. Have fun!';
    await page.getByLabel('Rules & Guidelines').fill(rulesText);

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Wait for save to complete and return to view mode
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 10000 });

    // Verify Rules & Guidelines section is now displayed
    await expect(page.getByRole('heading', { name: 'Rules & Guidelines' })).toBeVisible();
    await expect(page.getByText(rulesText)).toBeVisible();
  });
});
