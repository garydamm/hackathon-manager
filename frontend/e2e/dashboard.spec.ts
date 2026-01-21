import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Dashboard Test ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Dashboard Display', () => {
  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI for dashboard tests
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'DashboardTest';

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

  test('displays welcome message with user name after login', async ({ page }) => {
    // Verify welcome message includes user's first name
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible();

    // Verify the subtitle is also present
    await expect(page.getByText('Discover hackathons and start building something amazing.')).toBeVisible();
  });

  test('displays Create Hackathon button', async ({ page }) => {
    // Verify the Create Hackathon button is visible
    const createButton = page.getByRole('link', { name: /Create Hackathon/ });
    await expect(createButton).toBeVisible();

    // Verify it links to the correct page
    await expect(createButton).toHaveAttribute('href', '/hackathons/new');
  });

  test('displays Open for Registration section heading', async ({ page }) => {
    // The "Open for Registration" section is always displayed (even if empty)
    await expect(page.getByRole('heading', { name: 'Open for Registration' })).toBeVisible();
    await expect(page.getByText('Sign up now and secure your spot')).toBeVisible();
  });
});

test.describe('Hackathon Card Navigation', () => {
  // These tests need to run in serial order since they share state
  test.describe.configure({ mode: 'serial' });

  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;
  let hackathonName: string;
  let hackathonSlug: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI for card navigation tests
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'CardNavTest';

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

  test('creates a hackathon and returns to dashboard', async ({ page }) => {
    // Generate unique hackathon name and store it for subsequent tests
    hackathonName = generateUniqueHackathonName();
    // Slug is generated from name: lowercase with spaces replaced by dashes
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    // Navigate to create hackathon page
    await page.getByRole('link', { name: /Create Hackathon/ }).click();
    await expect(page).toHaveURL('/hackathons/new');

    // Fill out required fields
    await page.getByLabel('Hackathon Name *').fill(hackathonName);

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
    await expect(page).toHaveURL('/', { timeout: 15000 });

    // Verify we're back on the dashboard
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible();
  });

  test('verifies hackathon card appears in Open for Registration section', async ({ page }) => {
    // Verify the "Open for Registration" section is visible
    await expect(page.getByRole('heading', { name: 'Open for Registration' })).toBeVisible();

    // Find the hackathon card with our hackathon name in the section
    // The hackathon should appear with status "Registration Open" by default
    const hackathonCard = page.locator('section').filter({ hasText: 'Open for Registration' }).getByText(hackathonName);
    await expect(hackathonCard).toBeVisible({ timeout: 10000 });
  });

  test('clicks on hackathon card and verifies navigation to detail page', async ({ page }) => {
    // Find the "View Details" link for our specific hackathon using the href attribute
    // The href contains the slug which is unique to our hackathon
    const viewDetailsButton = page.locator(`a[href="/hackathons/${hackathonSlug}"]`).filter({ hasText: 'View Details' });
    await expect(viewDetailsButton).toBeVisible({ timeout: 10000 });
    await viewDetailsButton.click();

    // Verify navigation to detail page
    await expect(page).toHaveURL(new RegExp(`/hackathons/${hackathonSlug}`), { timeout: 10000 });

    // Verify hackathon name is displayed on detail page
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible();
  });
});
