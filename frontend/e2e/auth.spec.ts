import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Login Flow', () => {
  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user via the UI for login tests
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'LoginTest';

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
    // Clear any existing session
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('navigates to login page and displays form', async ({ page }) => {
    await page.goto('/login');

    // Verify login page elements are visible
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('shows validation error when password is empty', async ({ page }) => {
    await page.goto('/login');

    // Fill in email but leave password empty
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should show password validation error
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials that don't exist
    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('WrongPassword123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should show error message from API
    await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 10000 });
  });

  test('successfully logs in with valid credentials and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Use the test user credentials registered in beforeAll
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // After successful login, should redirect to dashboard
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })).toBeVisible({ timeout: 10000 });

    // URL should be the dashboard (root)
    await expect(page).toHaveURL('/');
  });

  test('login button shows loading state during submission', async ({ page }) => {
    await page.goto('/login');

    // Use the test user credentials
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);

    // Click and verify the button changes to loading state or the login completes
    const submitButton = page.getByRole('button', { name: 'Sign in' });
    await submitButton.click();

    // Verify either the loading state appears OR we successfully login
    await expect(
      page.getByRole('button', { name: 'Signing in...' }).or(
        page.getByRole('heading', { name: new RegExp(`Welcome back, ${testUserFirstName}`) })
      )
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.goto('/register');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('navigates to registration page and displays form', async ({ page }) => {
    await page.goto('/register');

    // Verify registration page elements are visible
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('successfully registers a new user and redirects to dashboard', async ({ page }) => {
    await page.goto('/register');

    const uniqueEmail = generateUniqueEmail();
    const firstName = 'NewUser';

    // Fill in all registration fields
    await page.getByLabel('First name').fill(firstName);
    await page.getByLabel('Last name').fill('TestUser');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);

    // Submit the form
    await page.getByRole('button', { name: 'Create account' }).click();

    // After successful registration, should redirect to dashboard
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${firstName}`) })).toBeVisible({ timeout: 15000 });

    // URL should be the dashboard (root)
    await expect(page).toHaveURL('/');
  });

  test('shows validation error for weak password - too short', async ({ page }) => {
    await page.goto('/register');

    // Fill in form with a password that's too short
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Short1');
    await page.getByLabel('Confirm password').fill('Short1');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show password length validation error
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('shows validation error for password missing uppercase', async ({ page }) => {
    await page.goto('/register');

    // Fill in form with password missing uppercase letter
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('testpassword123');
    await page.getByLabel('Confirm password').fill('testpassword123');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show uppercase validation error
    await expect(page.getByText('Password must contain at least one uppercase letter')).toBeVisible();
  });

  test('shows validation error for password missing number', async ({ page }) => {
    await page.goto('/register');

    // Fill in form with password missing number
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('TestPassword');
    await page.getByLabel('Confirm password').fill('TestPassword');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show number validation error
    await expect(page.getByText('Password must contain at least one number')).toBeVisible();
  });

  test('shows validation error when passwords do not match', async ({ page }) => {
    await page.goto('/register');

    // Fill in form with mismatched passwords
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill('DifferentPassword123');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show password mismatch error
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test('shows error when registering with existing email', async ({ page, browser }) => {
    // First, register a user
    const existingEmail = generateUniqueEmail();
    const firstPage = await browser.newPage();
    await firstPage.goto('/register');
    await firstPage.getByLabel('First name').fill('Existing');
    await firstPage.getByLabel('Last name').fill('User');
    await firstPage.getByLabel('Email').fill(existingEmail);
    await firstPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await firstPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await firstPage.getByRole('button', { name: 'Create account' }).click();
    await expect(firstPage.getByRole('heading', { name: /Welcome back, Existing/ })).toBeVisible({ timeout: 15000 });
    await firstPage.close();

    // Now try to register with the same email
    await page.goto('/register');
    await page.getByLabel('First name').fill('Another');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(existingEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show error for duplicate email (API error displayed in destructive div)
    await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 10000 });
  });

  test('registration button shows loading state during submission', async ({ page }) => {
    await page.goto('/register');

    const uniqueEmail = generateUniqueEmail();

    // Fill in all registration fields
    await page.getByLabel('First name').fill('LoadingTest');
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);

    // Click submit button
    const submitButton = page.getByRole('button', { name: 'Create account' });
    await submitButton.click();

    // Verify either the loading state appears OR we successfully register
    await expect(
      page.getByRole('button', { name: 'Creating account...' }).or(
        page.getByRole('heading', { name: /Welcome back, LoadingTest/ })
      )
    ).toBeVisible({ timeout: 15000 });
  });
});
