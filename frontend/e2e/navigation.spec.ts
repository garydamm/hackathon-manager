import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Navigation and Logout', () => {
  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI for navigation tests
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'NavTest';

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

  test('clicking logo navigates to dashboard', async ({ page }) => {
    // Navigate to a different page first (e.g., create hackathon page)
    await page.getByRole('link', { name: /Create Hackathon/ }).click();
    await expect(page).toHaveURL('/hackathons/new');

    // Click the logo/home link in the nav
    await page.getByRole('link', { name: 'HackathonHub' }).click();

    // Verify we are back on the dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible();
  });

  test('logout button is visible in nav when authenticated', async ({ page }) => {
    // Click the user dropdown trigger to open it
    await page.getByRole('button', { name: `${testUserFirstName} User` }).click();

    // Verify the logout menu item is visible in the dropdown
    const logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
    await expect(logoutMenuItem).toBeVisible();
  });

  test('clicking logout clears session and redirects to login page', async ({ page }) => {
    // Verify we're on the dashboard first
    await expect(page).toHaveURL('/');

    // Open the user dropdown
    await page.getByRole('button', { name: `${testUserFirstName} User` }).click();

    // Click the logout menu item
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    // Verify redirect to login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Verify we can't access the dashboard without logging in again
    await page.goto('/');
    // Should redirect back to login since session is cleared
    await expect(page).toHaveURL('/login');
  });
});
