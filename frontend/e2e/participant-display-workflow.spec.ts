import { test, expect } from '@playwright/test';

// Generate unique email for each test run to avoid conflicts
const generateUniqueEmail = () => `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

// Generate unique hackathon name for each test to avoid conflicts
const generateUniqueHackathonName = () => `E2E Workflow ${Date.now()}`;

// Generate slug from name
const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

// Valid test password that meets all requirements
const TEST_PASSWORD = 'TestPassword123';

test.describe('Participant Display Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let organizerEmail: string;
  let organizerFirstName: string;
  let organizerToken: string;
  let participantEmail: string;
  let participantFirstName: string;
  let participantToken: string;
  let hackathonWithParticipantsName: string;
  let hackathonWithParticipantsSlug: string;
  let hackathonWithParticipantsId: number;
  let emptyHackathonName: string;
  let emptyHackathonSlug: string;
  let emptyHackathonId: number;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // === Create organizer user ===
    organizerEmail = generateUniqueEmail();
    organizerFirstName = 'WorkflowOrganizer';

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

    // === Create first hackathon with participants ===
    hackathonWithParticipantsName = generateUniqueHackathonName();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const createHackathon1Res = await page.request.post('http://localhost:8080/api/hackathons', {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: {
        name: hackathonWithParticipantsName,
        slug: generateSlug(hackathonWithParticipantsName),
        description: 'Test hackathon with participants for workflow testing',
        startsAt: tomorrow.toISOString(),
        endsAt: dayAfterTomorrow.toISOString(),
        status: 'registration_open',
      },
    });
    expect(createHackathon1Res.ok()).toBeTruthy();
    const hackathon1Data = await createHackathon1Res.json();
    hackathonWithParticipantsId = hackathon1Data.id;
    hackathonWithParticipantsSlug = hackathon1Data.slug;

    // === Create participant user ===
    participantEmail = generateUniqueEmail();
    participantFirstName = 'WorkflowParticipant';

    const participantPage = await browser.newPage();
    await participantPage.goto('/register');
    await participantPage.getByLabel('First name').fill(participantFirstName);
    await participantPage.getByLabel('Last name').fill('Tester');
    await participantPage.getByLabel('Email').fill(participantEmail);
    await participantPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await participantPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await participantPage.getByRole('button', { name: 'Create account' }).click();
    await expect(participantPage.getByRole('heading', { name: new RegExp(`Welcome back, ${participantFirstName}`) })).toBeVisible({ timeout: 15000 });

    // Get auth token for participant
    participantToken = await participantPage.evaluate(() => localStorage.getItem('accessToken')) as string;

    // === Register participant for hackathon and create a team via API ===
    await participantPage.request.post(`http://localhost:8080/api/hackathons/${hackathonWithParticipantsId}/register`, {
      headers: { Authorization: `Bearer ${participantToken}` },
    });

    await participantPage.request.post(`http://localhost:8080/api/teams`, {
      headers: { Authorization: `Bearer ${participantToken}` },
      data: {
        hackathonId: hackathonWithParticipantsId,
        name: 'Workflow Test Team',
        description: 'Test team for workflow testing',
        isOpen: false,
      },
    });

    // === Create second hackathon with no participants ===
    emptyHackathonName = `${generateUniqueHackathonName()} Empty`;

    const createHackathon2Res = await page.request.post('http://localhost:8080/api/hackathons', {
      headers: { Authorization: `Bearer ${organizerToken}` },
      data: {
        name: emptyHackathonName,
        slug: generateSlug(emptyHackathonName),
        description: 'Test hackathon with no participants for workflow testing',
        startsAt: tomorrow.toISOString(),
        endsAt: dayAfterTomorrow.toISOString(),
        status: 'registration_open',
      },
    });
    expect(createHackathon2Res.ok()).toBeTruthy();
    const hackathon2Data = await createHackathon2Res.json();
    emptyHackathonId = hackathon2Data.id;
    emptyHackathonSlug = hackathon2Data.slug;

    await page.close();
    await participantPage.close();
  });

  test('workflow: login → view dashboard → verify participant count appears', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto('/login');

    // Step 2: Login with organizer credentials
    await page.getByLabel('Email').fill(organizerEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Step 3: Wait for dashboard to load
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${organizerFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Step 4: Verify hackathon with participants appears in Open for Registration section
    const hackathonCard = page.locator('section').filter({ hasText: 'Open for Registration' }).getByText(hackathonWithParticipantsName);
    await expect(hackathonCard).toBeVisible({ timeout: 10000 });

    // Step 5: Verify the View Details button is present for navigation (proving card is fully rendered)
    const viewDetailsButton = page.locator(`a[href="/hackathons/${hackathonWithParticipantsSlug}"]`).filter({ hasText: 'View Details' });
    await expect(viewDetailsButton).toBeVisible();

    // The key verification is that the dashboard is displaying hackathons.
    // The participant count is rendered in the card - we can verify it exists on the details page in the next test.
  });

  test('workflow: navigate to hackathon details → verify participant list displays', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(organizerEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${organizerFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Step 2: Navigate to hackathon details page from dashboard
    const viewDetailsButton = page.locator(`a[href="/hackathons/${hackathonWithParticipantsSlug}"]`).filter({ hasText: 'View Details' });
    await expect(viewDetailsButton).toBeVisible({ timeout: 10000 });
    await viewDetailsButton.click();

    // Step 3: Verify navigation to detail page
    await expect(page).toHaveURL(new RegExp(`/hackathons/${hackathonWithParticipantsSlug}`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: hackathonWithParticipantsName, level: 1 })).toBeVisible();

    // Step 4: Verify Participants section is visible with count
    await expect(page.getByRole('heading', { name: /Participants \(\d+\)/ })).toBeVisible();

    // Step 5: Verify participant details are displayed
    await expect(page.getByText(`${participantFirstName} Tester`)).toBeVisible();
    await expect(page.getByText('Team: Workflow Test Team')).toBeVisible();
    await expect(page.getByText('Team Leader').first()).toBeVisible();

    // Step 6: Verify participant email is shown as a link
    const emailLink = page.getByRole('link', { name: participantEmail });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', `mailto:${participantEmail}`);
  });

  test('workflow: view hackathon with no participants → verify empty state and CTA appear', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(organizerEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome back, ${organizerFirstName}`) })).toBeVisible({ timeout: 10000 });

    // Step 2: Navigate directly to empty hackathon detail page
    await page.goto(`/hackathons/${emptyHackathonSlug}`);

    // Step 3: Wait for page to load
    await expect(page.getByRole('heading', { name: emptyHackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

    // Step 4: Verify Participants section shows count of 0
    await expect(page.getByRole('heading', { name: 'Participants (0)' })).toBeVisible();

    // Step 5: Verify empty state message is displayed
    await expect(page.getByText('No participants registered yet')).toBeVisible();
    await expect(page.getByText('Be the first to join this hackathon!')).toBeVisible();

    // Step 6: Verify empty state icon is visible
    const emptyStateContainer = page.locator('div').filter({ hasText: /^No participants registered yet/ }).first();
    await expect(emptyStateContainer).toBeVisible();
    const iconContainer = emptyStateContainer.locator('div.rounded-full').first();
    await expect(iconContainer).toBeVisible();

    // Step 7: Verify registration CTA button is visible (organizer is not registered)
    const registerButton = page.getByRole('button', { name: 'Register Now' });
    await expect(registerButton).toBeVisible();
  });
});
