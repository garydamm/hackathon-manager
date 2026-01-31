import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Empty Participants ${Date.now()}`;

// Generate slug from name
const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Hackathon Participants - Empty State', () => {
  test.describe.configure({ mode: 'serial' });

  let organizerEmail: string;
  let organizerFirstName: string;
  let organizerToken: string;
  let unregisteredUserEmail: string;
  let unregisteredUserFirstName: string;
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: number;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // === Create organizer user ===
    organizerEmail = generateUniqueEmail();
    organizerFirstName = 'OrganizerEmpty';

    await page.goto('/register');
    await page.getByLabel('First name').fill(organizerFirstName);
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(organizerEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${organizerFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Get auth token for API calls
    organizerToken = await page.evaluate(() => localStorage.getItem('accessToken')) as string;

    // === Create a hackathon with registration open but no participants ===
    hackathonName = generateUniqueHackathonName();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const createHackathonRes = await page.request.post('http://localhost:8080/api/hackathons', {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: {
        name: hackathonName,
        slug: generateSlug(hackathonName),
        description: 'Test hackathon for empty participants state',
        startsAt: tomorrow.toISOString(),
        endsAt: dayAfterTomorrow.toISOString(),
        status: 'registration_open',
      },
    });
    expect(createHackathonRes.ok()).toBeTruthy();
    const hackathonData = await createHackathonRes.json();
    hackathonId = hackathonData.id;
    hackathonSlug = hackathonData.slug;

    // === Create unregistered user ===
    unregisteredUserEmail = generateUniqueEmail();
    unregisteredUserFirstName = 'UnregisteredUser';

    const unregPage = await browser.newPage();
    await unregPage.goto('/register');
    await unregPage.getByLabel('First name').fill(unregisteredUserFirstName);
    await unregPage.getByLabel('Last name').fill('Tester');
    await unregPage.getByLabel('Email').fill(unregisteredUserEmail);
    await unregPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await unregPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await unregPage.getByRole('button', { name: 'Create account' }).click();
    await expect(unregPage.getByRole('heading', { name: new RegExp(`Welcome back, ${unregisteredUserFirstName}`) })).toBeVisible({ timeout: 15000 });

    await page.close();
    await unregPage.close();
  });

  test('displays empty state message when no participants registered', async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    await page.getByLabel('Email').fill(organizerEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${organizerFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify empty state message is visible
    await expect(page.getByText('No participants registered yet')).toBeVisible();
    await expect(page.getByText('Be the first to join this hackathon!')).toBeVisible();
  });

  test('empty state has appropriate styling consistent with app design', async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel('Email').fill(organizerEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${organizerFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify the empty state container has proper spacing and centering
    // Select the container with the specific flex layout classes used in the empty state
    const emptyStateContainer = page.locator('div.flex.flex-col.items-center.text-center').first();
    await expect(emptyStateContainer).toBeVisible();

    // Check that the container has flex and center classes
    const containerClass = await emptyStateContainer.getAttribute('class');
    expect(containerClass).toContain('flex');
    expect(containerClass).toContain('items-center');
    expect(containerClass).toContain('text-center');
  });

  test('displays registration CTA button when user not registered and registration is open', async ({ page }) => {
    // Login as unregistered user
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel('Email').fill(unregisteredUserEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${unregisteredUserFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);

    // Wait for page to load
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Verify Register Now button is visible in the empty state
    const registerButton = page.getByRole('button', { name: 'Register Now' });
    await expect(registerButton).toBeVisible();
  });

  test('does not display registration CTA when user is already registered', async ({ page }) => {
    // Login as unregistered user
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel('Email').fill(unregisteredUserEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${unregisteredUserFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Register for the hackathon
    const registerButton = page.getByRole('button', { name: 'Register', exact: true }).first();
    await registerButton.click();

    // Confirm registration in modal
    await expect(page.getByRole('heading', { name: `Register for ${hackathonName}?` })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Registration' }).click();

    // Wait for success message
    await expect(page.getByRole('heading', { name: "You're registered!" })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: '', exact: true }).click(); // Close modal

    // Wait for page to update (hackathon data will refresh)
    await page.waitForTimeout(1000);

    // Reload to ensure we get the latest state
    await page.reload();
    await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // After registering, user becomes a participant (count = 1), so participants list should show
    // Verify the Participants section shows 1 participant
    await expect(page.getByRole('heading', { name: /Participants \(1\)/ })).toBeVisible({ timeout: 5000 });

    // Verify the participant (current user) is listed in the participants section
    await expect(page.locator('.space-y-3 p.font-medium', { hasText: unregisteredUserFirstName })).toBeVisible();
  });
});
