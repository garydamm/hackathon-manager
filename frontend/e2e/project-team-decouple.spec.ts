import { test, expect } from '@playwright/test';

// Generate unique values for test isolation
const generateUniqueEmail = () =>
  `e2etest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
const generateUniqueHackathonName = () => `E2E Decouple ${Date.now()}`;
const generateUniqueTeamName = () => `E2E Team ${Date.now()}`;

const TEST_PASSWORD = 'TestPassword123';

test.describe('Decoupled Project-Team Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  let testUserEmail: string;
  let testUserFirstName: string;
  let hackathonName: string;
  let hackathonSlug: string;
  let hackathonId: string;
  let teamName: string;
  let teamId: string;
  let accessToken: string;

  // Track project IDs across tests
  let independentProjectId: string;
  let teamProjectId: string;

  test.beforeAll(async ({ browser }) => {
    // Register a test user
    testUserEmail = generateUniqueEmail();
    testUserFirstName = 'DecoupleTest';

    const page = await browser.newPage();
    await page.goto('/register');

    await page.getByLabel('First name').fill(testUserFirstName);
    await page.getByLabel('Last name').fill('User');
    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
      page.getByRole('heading', {
        name: new RegExp(`Welcome back, ${testUserFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Create a hackathon
    hackathonName = generateUniqueHackathonName();
    hackathonSlug = hackathonName.toLowerCase().replace(/\s+/g, '-');

    await page.goto('/hackathons/new');

    await page.getByLabel('Hackathon Name *').fill(hackathonName);
    await page.getByLabel('Description').fill('Test hackathon for project-team decouple e2e tests.');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDate = tomorrow.toISOString().slice(0, 16);

    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const endDate = dayAfterTomorrow.toISOString().slice(0, 16);

    await page.getByLabel('Start Date & Time *').fill(startDate);
    await page.getByLabel('End Date & Time *').fill(endDate);

    await page.getByRole('button', { name: 'Create Hackathon' }).click();

    await expect(
      page.getByRole('heading', {
        name: new RegExp(`Welcome back, ${testUserFirstName}`),
      })
    ).toBeVisible({ timeout: 15000 });

    // Get auth token and hackathon ID
    accessToken = (await page.evaluate(() => localStorage.getItem('accessToken')))!;

    const hackathonResponse = await page.request.get(
      `http://localhost:8080/api/hackathons/${hackathonSlug}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const hackathon = await hackathonResponse.json();
    hackathonId = hackathon.id;

    // Create a team via API
    teamName = generateUniqueTeamName();
    const teamResponse = await page.request.post('http://localhost:8080/api/teams', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        hackathonId,
        name: teamName,
        description: 'Test team for project-team decouple e2e testing.',
        isOpen: true,
      },
    });
    const team = await teamResponse.json();
    teamId = team.id;

    await page.evaluate(() => localStorage.clear());
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Login fresh before each test
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByLabel('Email').fill(testUserEmail);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByRole('heading', {
        name: new RegExp(`Welcome back, ${testUserFirstName}`),
      })
    ).toBeVisible({ timeout: 10000 });
  });

  test('create project independently (no team) within a hackathon', async ({ page }) => {
    // Navigate to hackathon detail page
    await page.goto(`/hackathons/${hackathonSlug}`);
    await expect(
      page.getByRole('heading', { name: hackathonName, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Scroll to the Projects section and find the Create Project button
    const createProjectButton = page.getByRole('button', { name: /Create Project/i }).first();
    await expect(createProjectButton).toBeVisible({ timeout: 5000 });
    await createProjectButton.click();

    // Fill the project form
    await page.getByLabel('Project Name').fill('Independent E2E Project');
    await page.getByLabel('Description').fill('A project created without a team for e2e testing.');

    // Submit the form
    await page.locator('form').getByRole('button', { name: /Create Project/i }).click();

    // Wait for the project to appear in the projects list
    await expect(page.getByText('Independent E2E Project')).toBeVisible({ timeout: 10000 });

    // Verify the project shows as independent (created by user, no team)
    await expect(page.getByText(`By ${testUserFirstName}`)).toBeVisible();

    // Store project ID via API for later tests
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const projectsResponse = await page.request.get(
      `http://localhost:8080/api/projects/hackathon/${hackathonId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const projects = await projectsResponse.json();
    const independentProject = projects.find(
      (p: { name: string }) => p.name === 'Independent E2E Project'
    );
    expect(independentProject).toBeTruthy();
    independentProjectId = independentProject.id;

    // Verify teamId is null (independent project)
    expect(independentProject.teamId).toBeNull();
  });

  test('create project from team context, verify it appears linked to team', async ({ page }) => {
    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);
    await expect(
      page.getByRole('heading', { name: teamName, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Click Create Project button in the team's project section
    await page.getByRole('button', { name: /Create Project/i }).first().click();

    // Fill the project form
    await page.getByLabel('Project Name').fill('Team E2E Project');
    await page.getByLabel('Description').fill('A project created from team context for e2e testing.');

    // Submit the form
    await page.locator('form').getByRole('button', { name: /Create Project/i }).click();

    // Wait for the project to appear on the team detail page
    await expect(page.getByText('Team E2E Project')).toBeVisible({ timeout: 10000 });

    // Verify via API that project is linked to the team
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const projectsResponse = await page.request.get(
      `http://localhost:8080/api/projects/hackathon/${hackathonId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const projects = await projectsResponse.json();
    const teamProject = projects.find(
      (p: { name: string }) => p.name === 'Team E2E Project'
    );
    expect(teamProject).toBeTruthy();
    expect(teamProject.teamId).toBe(teamId);
    expect(teamProject.teamName).toBe(teamName);
    teamProjectId = teamProject.id;
  });

  test('unlink a project from a team, verify team no longer shows project and project still exists', async ({
    page,
  }) => {
    // Navigate to team detail page (team should have the project from previous test)
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);
    await expect(
      page.getByRole('heading', { name: teamName, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Verify the team project is shown
    await expect(page.getByText('Team E2E Project')).toBeVisible({ timeout: 10000 });

    // Click "Unlink Project" button
    await page.getByRole('button', { name: /Unlink Project/i }).click();

    // Confirm the unlink dialog
    await expect(page.getByText(/Are you sure you want to unlink/)).toBeVisible({ timeout: 5000 });
    // Click the confirm button in the dialog (the one that says "Unlink Project" inside the dialog)
    await page
      .locator('.fixed')
      .getByRole('button', { name: /Unlink Project/i })
      .click();

    // Wait for project to disappear from team view
    await expect(page.getByText("Your team doesn't have a linked project yet.")).toBeVisible({
      timeout: 10000,
    });

    // Verify the project still exists via API
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const projectResponse = await page.request.get(
      `http://localhost:8080/api/projects/${teamProjectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(projectResponse.ok()).toBeTruthy();
    const project = await projectResponse.json();
    expect(project.name).toBe('Team E2E Project');
    // Project should now have no team
    expect(project.teamId).toBeNull();
  });

  test('link an unlinked project to a team, verify team shows the project', async ({ page }) => {
    // At this point, the team has no project (unlinked in previous test)
    // and there are two unlinked projects: "Independent E2E Project" and "Team E2E Project"

    // Navigate to team detail page
    await page.goto(`/hackathons/${hackathonSlug}/teams/${teamId}`);
    await expect(
      page.getByRole('heading', { name: teamName, level: 1 })
    ).toBeVisible({ timeout: 10000 });

    // Verify no project is linked
    await expect(page.getByText("Your team doesn't have a linked project yet.")).toBeVisible({
      timeout: 10000,
    });

    // Click "Link Existing Project" button
    await page.getByRole('button', { name: /Link Existing Project/i }).click();

    // Wait for the link project modal
    await expect(page.getByText('Select an unlinked project to link to your team.')).toBeVisible({
      timeout: 5000,
    });

    // Select "Independent E2E Project" from the list
    await page.getByText('Independent E2E Project').click();

    // Click the "Link Project" confirm button
    await page
      .locator('.fixed')
      .getByRole('button', { name: /Link Project/i })
      .click();

    // Wait for the project to appear on the team detail page
    await expect(page.getByText('Independent E2E Project')).toBeVisible({ timeout: 10000 });

    // Verify via API that the project is now linked to the team
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const projectResponse = await page.request.get(
      `http://localhost:8080/api/projects/${independentProjectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(projectResponse.ok()).toBeTruthy();
    const project = await projectResponse.json();
    expect(project.teamId).toBe(teamId);
    expect(project.teamName).toBe(teamName);
  });
});
