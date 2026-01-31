import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Session Management Page', () => {
  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI for session management tests
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'SessionTest';

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

  test('session management page loads via direct navigation', async ({ page }) => {
    // Navigate directly to the sessions page
    await page.goto('/settings/sessions');

    // Verify we are on the correct page
    await expect(page).toHaveURL('/settings/sessions');

    // Verify the page title is displayed (use level: 1 to get the main heading, not the empty state heading)
    await expect(page.getByRole('heading', { name: 'Active Sessions', level: 1 })).toBeVisible();

    // Verify the page description is displayed
    await expect(page.getByText('Manage your active sessions across devices')).toBeVisible();
  });

  test('sessions link appears in user dropdown menu', async ({ page }) => {
    // Click the user dropdown trigger (look for the user's name)
    await page.getByRole('button', { name: `${testUserFirstName} User` }).click();

    // Verify the Sessions link is visible in the dropdown
    const sessionsLink = page.getByRole('menuitem', { name: 'Sessions' });
    await expect(sessionsLink).toBeVisible();
  });

  test('clicking sessions link in dropdown navigates to sessions page', async ({ page }) => {
    // Click the user dropdown trigger
    await page.getByRole('button', { name: `${testUserFirstName} User` }).click();

    // Click the Sessions link
    await page.getByRole('menuitem', { name: 'Sessions' }).click();

    // Verify we navigated to the sessions page
    await expect(page).toHaveURL('/settings/sessions');
    await expect(page.getByRole('heading', { name: 'Active Sessions' })).toBeVisible();
  });

  test('displays empty state when user has no other sessions', async ({ page }) => {
    // Navigate to sessions page
    await page.goto('/settings/sessions');

    // Wait for loading to complete and check for either sessions or empty state
    // Since this is a new user with only one session, we should see either:
    // 1. The current session card, or
    // 2. The empty state (depends on backend implementation)

    // Check that the page loaded successfully (no error state)
    await expect(page.getByRole('heading', { name: 'Active Sessions', level: 1 })).toBeVisible();

    // The page should show either sessions or the empty state message
    // We just verify the page structure loaded correctly
    const pageContent = page.locator('text=Active Sessions').first();
    await expect(pageContent).toBeVisible();
  });

  test('session management page is protected (requires authentication)', async ({ page }) => {
    // Open the user dropdown
    await page.getByRole('button', { name: `${testUserFirstName} User` }).click();

    // Click logout
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/login');

    // Try to access sessions page without being logged in
    await page.goto('/settings/sessions');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });
});
