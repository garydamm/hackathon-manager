# PRD: Frontend E2E Test Coverage

## Introduction

Complete the frontend end-to-end test suite to cover all current application features. The existing test suite covers authentication flows (login/registration). This PRD addresses the remaining untested features: dashboard, hackathon creation, hackathon viewing, basic editing, navigation, and logout functionality.

## Goals

- Achieve comprehensive e2e test coverage for all user-facing features
- Focus on happy path testing with minimal error case coverage
- Ensure tests are independent and can run in parallel
- Follow existing test patterns established in `auth.spec.ts`
- All tests pass reliably in CI environment

## User Stories

### US-001: Add dashboard display tests
**Description:** As a developer, I want e2e tests for the dashboard page so that I can verify hackathons display correctly after login.

**Acceptance Criteria:**
- [x] Test navigates to dashboard after login and verifies welcome message with user's name
- [x] Test verifies "Create Hackathon" button is visible
- [x] Test verifies dashboard section headings are present (Your Drafts, Happening Now, etc.)
- [x] Test file created at `e2e/dashboard.spec.ts`
- [x] Typecheck passes
- [x] All tests pass with `npm run test:e2e`

### US-002: Add navigation and logout tests
**Description:** As a developer, I want e2e tests for navigation and logout so that I can verify users can navigate the app and sign out.

**Acceptance Criteria:**
- [x] Test verifies clicking logo/home navigates to dashboard
- [x] Test verifies logout button is visible in nav when authenticated
- [x] Test verifies clicking logout clears session and redirects to login page
- [x] Test file created at `e2e/navigation.spec.ts`
- [x] Typecheck passes
- [x] All tests pass with `npm run test:e2e`

### US-003: Add hackathon creation happy path tests
**Description:** As a developer, I want e2e tests for hackathon creation so that I can verify the create flow works correctly.

**Acceptance Criteria:**
- [x] Test navigates to create hackathon page via dashboard button
- [x] Test verifies all form sections are visible (Basic Info, Dates, Location, Team Settings)
- [x] Test fills out required fields and submits successfully
- [x] Test verifies redirect to hackathon detail page after creation
- [x] Test file created at `e2e/hackathon-create.spec.ts`
- [x] Typecheck passes
- [x] All tests pass with `npm run test:e2e`

### US-004: Add hackathon detail view tests
**Description:** As a developer, I want e2e tests for viewing hackathon details so that I can verify the detail page displays correctly.

**Acceptance Criteria:**
- [ ] Test navigates to a hackathon detail page
- [ ] Test verifies hackathon name, description, and status badge are displayed
- [ ] Test verifies quick info cards show (start date, end date, location, participants)
- [ ] Test verifies rules section is displayed
- [ ] Test file created at `e2e/hackathon-detail.spec.ts`
- [ ] Typecheck passes
- [ ] All tests pass with `npm run test:e2e`

### US-005: Add hackathon basic edit tests
**Description:** As a developer, I want e2e tests for basic hackathon editing so that I can verify organizers can update hackathon fields.

**Acceptance Criteria:**
- [ ] Test clicks edit button on hackathon detail page (as organizer)
- [ ] Test verifies edit form appears with current values populated
- [ ] Test modifies hackathon name and description fields
- [ ] Test saves changes and verifies updated values display
- [ ] Tests added to `e2e/hackathon-detail.spec.ts`
- [ ] Typecheck passes
- [ ] All tests pass with `npm run test:e2e`

### US-006: Add hackathon card navigation tests
**Description:** As a developer, I want e2e tests for hackathon card interactions so that I can verify users can navigate from dashboard to hackathon details.

**Acceptance Criteria:**
- [ ] Test creates a hackathon, returns to dashboard
- [ ] Test verifies hackathon card appears in appropriate section
- [ ] Test clicks on hackathon card and verifies navigation to detail page
- [ ] Tests added to `e2e/dashboard.spec.ts`
- [ ] Typecheck passes
- [ ] All tests pass with `npm run test:e2e`

## Non-Goals

- Protected route redirect testing (e.g., unauthenticated access)
- Session expiry or token refresh testing
- Comprehensive form validation testing (only happy paths)
- Mobile/responsive layout testing
- Performance or load testing
- Visual regression testing
- Testing all possible error states

## Technical Considerations

- Follow existing patterns from `e2e/auth.spec.ts`:
  - Use `test.beforeAll()` to register test user once per file
  - Use `test.beforeEach()` to clear session and login fresh
  - Use `generateUniqueEmail()` pattern for unique test data
  - Use semantic locators: `getByLabel()`, `getByRole()`, `getByText()`
- Each test file should be independent and not rely on state from other files
- Use unique hackathon names with timestamps to avoid conflicts
- Tests run against `http://localhost:5173` (Vite dev server)
