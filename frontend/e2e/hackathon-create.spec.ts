import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Test Hackathon ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Hackathon Creation', () => {
  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI for hackathon creation tests
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'HackathonCreator';

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

  test('navigates to create hackathon page via dashboard button', async ({ page }) => {
    // Click the Create Hackathon link on the dashboard
    await page.getByRole('link', { name: /Create Hackathon/ }).click();

    // Verify navigation to create hackathon page
    await expect(page).toHaveURL('/hackathons/new');

    // Verify the page title is displayed
    await expect(page.getByRole('heading', { name: 'Create Hackathon' })).toBeVisible();
  });

  test('displays all form sections', async ({ page }) => {
    // Navigate to create hackathon page
    await page.goto('/hackathons/new');

    // Verify all form sections are visible
    // Basic Information section
    await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
    await expect(page.getByText('The essentials for your hackathon')).toBeVisible();

    // Date & Time section
    await expect(page.getByRole('heading', { name: 'Date & Time' })).toBeVisible();
    await expect(page.getByText('When does the hackathon take place?')).toBeVisible();

    // Location section
    await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible();
    await expect(page.getByText('Where will the hackathon take place?')).toBeVisible();

    // Team Settings section
    await expect(page.getByRole('heading', { name: 'Team Settings' })).toBeVisible();
    await expect(page.getByText('Configure team size limits and participant caps')).toBeVisible();
  });

  test('fills out required fields and submits successfully', async ({ page }) => {
    // Navigate to create hackathon page
    await page.goto('/hackathons/new');

    // Generate unique hackathon name
    const hackathonName = generateUniqueHackathonName();

    // Fill out Basic Information
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    // Slug is auto-generated from name

    await page.getByLabel('Description').fill('This is an e2e test hackathon description');

    // Fill out Date & Time (required fields)
    // Set start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm

    // Set end date to day after tomorrow
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endDate = dayAfterTomorrow.toISOString().slice(0, 16);

    await page.getByLabel('Start Date & Time *').fill(startDate);
    await page.getByLabel('End Date & Time *').fill(endDate);

    // Submit the form
    await page.getByRole('button', { name: 'Create Hackathon' }).click();

    // Wait for successful creation - should redirect to dashboard
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Verify we're back on the dashboard
    await expect(page).toHaveURL('/');
  });

  test('redirects to dashboard after successful creation', async ({ page }) => {
    // Navigate to create hackathon page
    await page.goto('/hackathons/new');

    // Generate unique hackathon name
    const hackathonName = generateUniqueHackathonName();

    // Fill out required fields only
    await page.getByLabel('Hackathon Name *').fill(hackathonName);

    // Set dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16);

    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endDate = dayAfterTomorrow.toISOString().slice(0, 16);

    await page.getByLabel('Start Date & Time *').fill(startDate);
    await page.getByLabel('End Date & Time *').fill(endDate);

    // Submit the form
    await page.getByRole('button', { name: 'Create Hackathon' }).click();

    // Verify redirect to dashboard (the app redirects to / after creation)
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Verify dashboard is loaded
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible();
  });
});
