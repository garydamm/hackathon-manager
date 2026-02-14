import { test, expect } from '@playwright/test';

const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
const generateUniqueHackathonName = () => `E2E SectNav ${Date.now()}`;
const TEST_PASSWORD = 'TestPassword123';

test.describe('Section Navigation on Hackathon Detail', () => {
  test.describe.configure({ mode: 'serial' });

  let organizerEmail: string;
  let organizerFirstName: string;
  let participantEmail: string;
  let participantFirstName: string;
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: string;

  test.beforeAll(async ({ browser }) => {
    // === Create organizer user and hackathon ===
    organizerEmail = generateUniqueEmail();
    organizerFirstName = 'OrgSectNav';

    const organizerPage = await browser.newPage();
    await organizerPage.goto('/register');

    await organizerPage.getByLabel('First name').fill(organizerFirstName);
    await organizerPage.getByLabel('Last name').fill('User');
    await organizerPage.getByLabel('Email').fill(organizerEmail);
    await organizerPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await organizerPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await organizerPage.getByRole('button', { name: 'Create account' }).click();

    await expect(
      organizerPage.getByRole('heading', {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Create hackathon
    hackathonName = generateUniqueHackathonName();
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await organizerPage.goto('/hackathons/new');
    await organizerPage.getByLabel('Hackathon Name *').fill(hackathonName);
    await organizerPage.getByLabel('Description').fill('Test hackathon for section nav e2e.');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const endDate = dayAfter.toISOString().slice(0, 16);

    await organizerPage.getByLabel('Start Date & Time *').fill(startDate);
    await organizerPage.getByLabel('End Date & Time *').fill(endDate);
    await organizerPage.getByRole('button', { name: 'Create Hackathon' }).click();

    await expect(
      organizerPage.getByRole('heading', {
        name: new RegExp(`Welcome back, ${organizerFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Get organizer token and hackathon ID, set status to registration_open
    const organizerToken = (await organizerPage.evaluate(() =>
      localStorage.getItem('accessToken')
    ))!;

    const hackathonRes = await organizerPage.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${organizerToken}` } }
    );
    const hackathon = await hackathonRes.json();
    hackathonId = hackathon.id;

    await organizerPage.request.put(`http://localhost:8080/api/hackathons/${hackathonId}`, {
      headers: {
        Authorization: `Bearer ${organizerToken}`,
        'Content-Type': 'application/json',
      },
      data: { status: 'registration_open' },
    });

    await organizerPage.evaluate(() => localStorage.clear());
    await organizerPage.close();

    // === Create participant user and register for hackathon ===
    participantEmail = generateUniqueEmail();
    participantFirstName = 'PartSectNav';

    const participantPage = await browser.newPage();
    await participantPage.goto('/register');

    await participantPage.getByLabel('First name').fill(participantFirstName);
    await participantPage.getByLabel('Last name').fill('User');
    await participantPage.getByLabel('Email').fill(participantEmail);
    await participantPage.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await participantPage.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await participantPage.getByRole('button', { name: 'Create account' }).click();

    await expect(
      participantPage.getByRole('heading', {
        name: new RegExp(`Welcome back, ${participantFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Register participant for the hackathon via API
    const participantToken = (await participantPage.evaluate(() =>
      localStorage.getItem('accessToken')
    ))!;

    await participantPage.request.post(
      `http://localhost:8080/api/hackathons/${hackathonId}/register`,
      { headers: { Authorization: `Bearer ${participantToken}` } }
    );

    await participantPage.evaluate(() => localStorage.clear());
    await participantPage.close();
  });

  // --- Organizer tests ---

  test.describe('as organizer', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.getByLabel('Email').fill(organizerEmail);
      await page.getByLabel('Password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(
        page.getByRole('heading', {
          name: new RegExp(`Welcome back, ${organizerFirstName}`),
        })
      ).toBeVisible({ timeout: 10000 });
    });

    test('section nav bar is visible with expected tabs', async ({ page }) => {
      await page.goto(`/hackathons/${hackathonSlug}`);
      await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

      // The tablist should be visible
      const nav = page.getByRole('tablist', { name: 'Page sections' });
      await expect(nav).toBeVisible();

      // All 9 tabs should be present
      const expectedTabs = ['Overview', 'Organizers', 'Participants', 'Teams', 'Projects', 'Schedule', 'Judging', 'Leaderboard', 'Results'];
      for (const label of expectedTabs) {
        await expect(page.getByRole('tab', { name: label })).toBeVisible();
      }
    });

    test('clicking a section tab scrolls to that section', async ({ page }) => {
      await page.goto(`/hackathons/${hackathonSlug}`);
      await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

      // Record scroll position before clicking
      const scrollYBefore = await page.evaluate(() => window.scrollY);

      // Click "Organizers" tab
      await page.getByRole('tab', { name: 'Organizers' }).click();

      // Wait for scroll to complete
      await page.waitForTimeout(1200);

      // Page should have scrolled down
      const scrollYAfter = await page.evaluate(() => window.scrollY);
      expect(scrollYAfter).toBeGreaterThan(scrollYBefore);

      // The organizers section should be near the top of the viewport
      const isInView = await page.evaluate(() => {
        const el = document.getElementById('organizers');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        // Section top should be within the visible area (after sticky headers ~112px)
        return rect.top >= 50 && rect.top < 300;
      });
      expect(isInView).toBe(true);
    });

    test('disabled tabs are visually distinct and not clickable', async ({ page }) => {
      await page.goto(`/hackathons/${hackathonSlug}`);
      await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

      // For an organizer, "Results" tab should be disabled
      const resultsTab = page.getByRole('tab', { name: 'Results' });
      await expect(resultsTab).toBeVisible();
      await expect(resultsTab).toHaveAttribute('aria-disabled', 'true');

      // Verify disabled styling (cursor-not-allowed class)
      await expect(resultsTab).toHaveClass(/cursor-not-allowed/);

      // Click the disabled tab — page should NOT scroll (results section not in DOM for organizer)
      const scrollYBefore = await page.evaluate(() => window.scrollY);
      await resultsTab.click({ force: true });
      await page.waitForTimeout(500);
      const scrollYAfter = await page.evaluate(() => window.scrollY);
      expect(scrollYAfter).toBe(scrollYBefore);
    });

    test('scrolling down updates the active tab', async ({ page }) => {
      await page.goto(`/hackathons/${hackathonSlug}`);
      await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

      // Scroll to the bottom of the page so the last section fills the viewport
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }));

      // Wait for IntersectionObserver to fire and update state
      await page.waitForTimeout(1500);

      // After scrolling to bottom, the active tab should no longer be "Overview" (the first section)
      // It should be one of the sections near the bottom of the page
      const overviewTab = page.getByRole('tab', { name: 'Overview' });
      await expect(overviewTab).toHaveAttribute('aria-selected', 'false', { timeout: 5000 });
    });
  });

  // --- Participant tests ---

  test.describe('as participant', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await page.getByLabel('Email').fill(participantEmail);
      await page.getByLabel('Password').fill(TEST_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(
        page.getByRole('heading', {
          name: new RegExp(`Welcome back, ${participantFirstName}`),
        })
      ).toBeVisible({ timeout: 10000 });
    });

    test('participant sees correct disabled tabs', async ({ page }) => {
      await page.goto(`/hackathons/${hackathonSlug}`);
      await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

      // Schedule, Judging, Leaderboard should be disabled for participant
      for (const label of ['Schedule', 'Judging', 'Leaderboard']) {
        const tab = page.getByRole('tab', { name: label });
        await expect(tab).toHaveAttribute('aria-disabled', 'true');
      }

      // Overview, Organizers, Participants, Teams, Projects should be enabled
      for (const label of ['Overview', 'Organizers', 'Participants', 'Teams', 'Projects']) {
        const tab = page.getByRole('tab', { name: label });
        await expect(tab).not.toHaveAttribute('aria-disabled', 'true');
      }
    });

    test('participant can click enabled tab to scroll to section', async ({ page }) => {
      await page.goto(`/hackathons/${hackathonSlug}`);
      await expect(page.getByRole('heading', { name: hackathonName, level: 1 })).toBeVisible({ timeout: 10000 });

      // Record scroll position before clicking
      const scrollYBefore = await page.evaluate(() => window.scrollY);

      // Click "Organizers" tab (a section that's below the fold)
      await page.getByRole('tab', { name: 'Organizers' }).click();

      // Wait for scroll
      await page.waitForTimeout(1200);

      // Page should have scrolled down from where it was
      const scrollYAfter = await page.evaluate(() => window.scrollY);
      expect(scrollYAfter).toBeGreaterThan(scrollYBefore);

      // The organizers section should be near the top of the viewport
      // (accounting for sticky header + nav bar = ~112px scroll-margin-top)
      const isInView = await page.evaluate(() => {
        const el = document.getElementById('organizers');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        // Section top should be within the visible area (after sticky headers)
        return rect.top >= 50 && rect.top < 300;
      });
      expect(isInView).toBe(true);
    });
  });
});
