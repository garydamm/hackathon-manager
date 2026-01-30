import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Participants ${Date.now()}`;

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Hackathon Detail - Participants Section', () => {
  // Run tests serially since they share state (hackathon created in beforeAll)
  test.describe.configure({ mode: 'serial' });

  // Shared test user credentials - registered once per test file run
  let testUserEmail: string;
  let testUserFirstName: string;
  let secondUserEmail: string;
  let secondUserFirstName: string;
  // Store created hackathon info for tests
  let hackathonName: string;
  let hackathonSlug: string;

  test.beforeAll(async ({ browser }) => {
    // Register first test user via the UI
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'ParticipantTester';

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

    // Create a hackathon with registration_open status for participants tests
    hackathonName = generateUniqueHackathonName();
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    // Fill out hackathon form
    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('This is a test hackathon for participants section e2e testing.');

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

    // Go to hackathon detail page and change status to registration_open
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Click Edit button to edit the hackathon
    await page.getByRole('button', { name: 'Edit' }).click();

    // Change status to registration_open
    await page.getByLabel('Status').selectOption('registration_open');

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Wait for edit mode to close
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 10000 });

    // Register for the hackathon
    await page.getByRole('button', { name: 'Register' }).click();
    await page.getByRole('button', { name: 'Confirm Registration' }).click();
    await expect(page.getByText('Registered', { exact: true })).toBeVisible({ timeout: 10000 });

    // Create a team so we have participants
    await page.getByRole('link', { name: 'Create Team' }).click();
    await page.getByLabel('Team Name').fill('Test Team');
    await page.getByRole('button', { name: 'Create Team' }).click();
    await expect(page.getByRole('heading', { name: 'Test Team', level: 1 })).toBeVisible({ timeout: 10000 });

    // Register and join a second user
    secondUserEmail = generateUniqueEmail();
    secondUserFirstName = 'SecondUser';

    await page.goto('/register');
    await page.getByLabel('First name').fill(secondUserFirstName);
    await page.getByLabel('Last name').fill('Tester');
    await page.getByLabel('Email').fill(secondUserEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${secondUserFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Register second user for hackathon
    await page.goto(`/hackathons/${hackathonSlug}`);
    await page.getByRole('button', { name: 'Register' }).click();
    await page.getByRole('button', { name: 'Confirm Registration' }).click();
    await expect(page.getByText('Registered', { exact: true })).toBeVisible({ timeout: 10000 });

    // Join the team using invite code
    await page.getByRole('link', { name: 'Browse Teams' }).click();
    await expect(page.getByRole('heading', { name: 'Teams', level: 1 })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Join Team' }).click();
    // Get invite code from test team (we'll just create another team for simplicity)
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('link', { name: 'Create Team' }).click();
    await page.getByLabel('Team Name').fill('Second Team');
    await page.getByRole('button', { name: 'Create Team' }).click();
    await expect(page.getByRole('heading', { name: 'Second Team', level: 1 })).toBeVisible({ timeout: 10000 });

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

  test('displays Participants section on hackathon detail page', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Participants section is visible with count
    await expect(page.getByRole('heading', { name: /Participants \(\d+\)/ })).toBeVisible();
  });

  test('displays participant count in section header', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Participants section shows count (should be 2)
    await expect(page.getByRole('heading', { name: /Participants \(2\)/ })).toBeVisible();
  });

  test('displays participant details including name, email, and team', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify first participant details are visible
    await expect(page.getByText(`${testUserFirstName} User`)).toBeVisible();
    await expect(page.getByRole('link', { name: testUserEmail })).toBeVisible();
    await expect(page.getByText('Team: Test Team')).toBeVisible();
    await expect(page.getByText('Team Leader')).toBeVisible();

    // Verify second participant details are visible
    await expect(page.getByText(`${secondUserFirstName} Tester`)).toBeVisible();
    await expect(page.getByRole('link', { name: secondUserEmail })).toBeVisible();
    await expect(page.getByText('Team: Second Team')).toBeVisible();
  });

  test('participants are sorted alphabetically by name', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Get all participant name elements
    const participantCards = page.locator('.font-medium').filter({ hasText: /User|Tester/ });

    // Get text content of participant names
    const names = await participantCards.allTextContents();

    // Verify they are sorted alphabetically (ParticipantTester User comes before SecondUser Tester)
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });
});
