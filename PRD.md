# PRD: Hackathon Registration UI

## Introduction

Enable logged-in users to register and unregister for hackathons through the UI. The backend `registerForHackathon` endpoint already exists on `HackathonController`. Users should be able to register from both the hackathon detail page and the hackathon list/card view. Registration status should be clearly visible through badges and button states, with confirmation modals providing next steps after actions.

## Goals

- Allow users to register for hackathons with open registration
- Display clear "Registered" status on hackathons the user has joined
- Provide confirmation modals with next steps after registration/unregistration
- Enable users to unregister from hackathons they've joined
- Support registration from both list view (cards) and detail page
- Handle edge cases gracefully (full capacity, registration closed, already registered)

## User Stories

### US-001: Add unregister backend endpoint
**Description:** As a registered participant, I want to unregister from a hackathon so that I can free up my spot if I can no longer attend.

**Acceptance Criteria:**
- [x] Add `DELETE /api/hackathons/{id}/register` endpoint to `HackathonController`
- [x] Service validates user is currently registered (returns 404 if not)
- [x] Service removes the `HackathonUser` record for this user/hackathon
- [x] Returns updated `HackathonResponse` with decremented participant count
- [x] Add `unregister(hackathonId: string)` method to frontend `hackathonService`
- [x] Typecheck passes

### US-002: Add Registered badge to hackathon detail page
**Description:** As a user, I want to see a clear "Registered" indicator on hackathon detail pages so I know my registration status at a glance.

**Acceptance Criteria:**
- [x] Display "Registered" badge next to status badge when `userRole === 'participant'`
- [x] Badge uses green styling (bg-green-100 text-green-700) with checkmark icon
- [x] Badge is visible in the header area near the hackathon title/status
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-003: Add Register button with confirmation modal to hackathon detail page
**Description:** As a user viewing a hackathon detail page, I want to click a Register button and see a confirmation modal with next steps so I understand what happens after registration.

**Acceptance Criteria:**
- [x] Show "Register" button when `status === 'registration_open'` AND user is not already registered
- [x] Button is disabled with "Registration Full" text when `participantCount >= maxParticipants`
- [x] Button is hidden when registration is not open
- [x] Clicking Register opens confirmation modal asking "Register for {hackathon name}?"
- [x] Modal shows hackathon dates and participant count
- [x] Modal has Cancel and "Confirm Registration" buttons
- [x] On confirm, calls `hackathonService.register()` with loading state
- [x] On success, shows success modal with next steps: "You're registered! You can now create or join a team."
- [x] Success modal has "Browse Teams" and "Create Team" action buttons
- [x] On error, displays error message in modal (capacity full, registration closed, etc.)
- [x] Invalidates hackathon query cache on success to refresh UI state
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: Add Unregister button with confirmation to hackathon detail page
**Description:** As a registered participant, I want to unregister from a hackathon so I can free up my spot if plans change.

**Acceptance Criteria:**
- [ ] Show "Unregister" button (outline/secondary variant) when user is registered participant
- [ ] Clicking Unregister opens confirmation modal: "Are you sure you want to unregister from {hackathon name}?"
- [ ] Modal warns: "You will be removed from any team you've joined."
- [ ] Modal has Cancel and "Confirm Unregister" buttons (destructive variant)
- [ ] On confirm, calls `hackathonService.unregister()` with loading state
- [ ] On success, closes modal and shows brief success message
- [ ] On error, displays error message in modal
- [ ] Invalidates hackathon query cache on success
- [ ] Register button reappears after successful unregistration
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Add registration status and actions to HackathonCard
**Description:** As a user browsing hackathons, I want to see my registration status on each card and be able to register directly from the list so I don't have to navigate to the detail page.

**Acceptance Criteria:**
- [ ] Display small "Registered" badge on cards where `userRole === 'participant'`
- [ ] Badge positioned in top-right corner of card or near status badge
- [ ] Show "Register" button on cards with `status === 'registration_open'` and user not registered
- [ ] Register button disabled with tooltip when at max capacity
- [ ] Hide Register button for non-open hackathons
- [ ] Clicking Register opens same confirmation modal flow as detail page
- [ ] Reuse modal components created in US-003
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals

- No email notifications for registration/unregistration (future feature)
- No waitlist functionality when hackathon is full
- No automatic team assignment upon registration
- No registration deadline warnings/reminders
- No bulk registration for multiple hackathons
- No registration approval workflow (registration is immediate)

## Technical Considerations

- Reuse existing modal pattern from `CreateTeamModal.tsx` and `JoinTeamModal.tsx`
- Use existing `hackathonService.register()` method in frontend
- Follow existing badge color patterns for consistency
- Use React Query's `invalidateQueries` for cache management after mutations
- The `userRole` field on `Hackathon` response indicates registration status
- Handle 409 Conflict (already registered), 400 Bad Request (full/closed), 404 Not Found errors
