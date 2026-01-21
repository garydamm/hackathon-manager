# PRD: Frontend Tests with Playwright

## Introduction

Add end-to-end testing capability to the frontend using Playwright. This establishes a testing foundation focused on critical authentication flows (login and registration), running against the real backend. The setup will serve as a foundation for expanding test coverage later.

## Goals

- Install and configure Playwright for the frontend project
- Create reliable tests for login and registration flows
- Ensure tests can run against the real backend server
- Establish patterns and conventions for future test development

## User Stories

### US-001: Install and configure Playwright
**Description:** As a developer, I need Playwright installed and configured so I can write and run end-to-end tests.

**Acceptance Criteria:**
- [ ] Playwright and @playwright/test installed as dev dependencies in frontend
- [ ] playwright.config.ts created with base configuration (baseURL pointing to local dev server)
- [ ] Test script added to package.json: `"test:e2e": "playwright test"`
- [ ] .gitignore updated to exclude playwright test artifacts (test-results/, playwright-report/)
- [ ] Example test file structure created: `e2e/` directory in frontend
- [ ] Typecheck passes

### US-002: Add login flow test
**Description:** As a developer, I want a test for the login flow so I can verify authentication works correctly.

**Acceptance Criteria:**
- [ ] Test file created at `frontend/e2e/auth.spec.ts`
- [ ] Test navigates to login page
- [ ] Test fills in email and password fields
- [ ] Test submits the form
- [ ] Test verifies successful login (redirect to dashboard or authenticated state)
- [ ] Test verifies error state for invalid credentials
- [ ] Typecheck passes
- [ ] Test passes when run against running backend

### US-003: Add registration flow test
**Description:** As a developer, I want a test for the registration flow so I can verify new user signup works correctly.

**Acceptance Criteria:**
- [ ] Test added to `frontend/e2e/auth.spec.ts`
- [ ] Test navigates to registration page
- [ ] Test fills in required registration fields (name, email, password)
- [ ] Test submits the form
- [ ] Test verifies successful registration (redirect or success message)
- [ ] Test verifies validation errors for invalid input (e.g., weak password, existing email)
- [ ] Typecheck passes
- [ ] Test passes when run against running backend

## Non-Goals

- Visual regression testing
- Mocked API responses (tests run against real backend)
- Tests for non-authentication pages (Dashboard, CreateHackathon, HackathonDetail)
- CI/CD integration (can be added later)
- Cross-browser testing configuration (defaults are fine for now)
- Test data seeding/cleanup automation

## Technical Considerations

- Tests require both frontend (`npm run dev`) and backend servers running
- Use Playwright's built-in test assertions and locators
- Follow Playwright best practices: use `data-testid` attributes where needed, prefer user-visible text/roles for selectors
- Registration tests may need unique email generation to avoid conflicts on repeated runs
