import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

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
