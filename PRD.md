# PRD: Display Hackathon Participants

## Introduction

Add participant visibility to the hackathon manager by displaying participant counts on the dashboard and a full participant list on the hackathon details page. Participants are already stored in the database but not currently displayed to users.

## Goals

- Display accurate participant count on dashboard (currently shows zero)
- Show detailed participant list on hackathon details page
- Display participant information: name, email, registration date, and team/role
- Sort participants alphabetically by name
- Show registration CTA when no participants registered
- Ensure only authenticated users can view participant information

## User Stories

### US-001: Fix participant count query
**Description:** As a developer, I need to ensure the participant count query correctly retrieves the number of registered participants so the dashboard shows accurate data.

**Acceptance Criteria:**
- [x] Verify/fix query that counts participants per hackathon
- [x] Query returns correct count from database
- [x] Query handles hackathons with zero participants
- [x] Unit tests added for participant count logic
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Create participant list query
**Description:** As a developer, I need a server action to fetch the full participant list with details so it can be displayed on the details page.

**Acceptance Criteria:**
- [x] Server action fetches participants for a specific hackathon
- [x] Returns name, email, registration date, and team/role for each participant
- [x] Results sorted alphabetically by name
- [x] Requires authentication to access
- [x] Unit tests added for participant list query
- [x] Unit tests pass
- [x] Typecheck passes

### US-003: Display participant list on details page
**Description:** As an authenticated user, I want to see all registered participants on the hackathon details page so I know who's participating.

**Acceptance Criteria:**
- [ ] Participants section added to hackathon details page
- [ ] Displays participant name, email, registration date, and team/role
- [ ] Participants sorted alphabetically by name
- [ ] Section shows participant count in header (e.g., "Participants (12)")
- [ ] Unit tests added for participant list component
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Add empty state with registration CTA
**Description:** As an authenticated user viewing a hackathon with no participants, I want to see a registration call-to-action so I know how to register.

**Acceptance Criteria:**
- [ ] Empty state shown when participant count is zero
- [ ] Displays message: "No participants registered yet"
- [ ] Shows registration button/CTA
- [ ] Empty state has appropriate styling consistent with app design
- [ ] Unit tests added for empty state component
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Update dashboard participant count
**Description:** As an authenticated user, I want to see accurate participant counts on the dashboard so I can quickly assess hackathon engagement.

**Acceptance Criteria:**
- [ ] Dashboard uses fixed participant count query
- [ ] Each hackathon card shows correct participant count
- [ ] Count updates reflect actual database state
- [ ] Zero participants displays as "0" (not hidden or showing placeholder)
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-006: Add UI system tests for participant display workflow
**Description:** As a developer, I need end-to-end tests for the participant display feature to ensure the complete user flow works correctly.

**Acceptance Criteria:**
- [ ] UI system test: Login → View dashboard → Verify participant count appears
- [ ] UI system test: Navigate to hackathon details → Verify participant list displays
- [ ] UI system test: View hackathon with no participants → Verify empty state and CTA appear
- [ ] UI system tests pass
- [ ] Typecheck passes

## Non-Goals

- No participant registration functionality (assumes existing registration system)
- No participant editing or removal from these views
- No pagination for participant lists (acceptable for MVP)
- No participant search or filtering
- No email obfuscation or privacy controls beyond authentication
- No participant profile pages or detailed views
- No export functionality for participant lists

## Technical Considerations

- Reuse existing authentication middleware for access control
- Leverage existing UI components for cards, lists, and empty states
- Participant data model already exists in database
- Registration CTA should link to existing registration flow if available
- Consider performance if participant lists grow large (future iteration may need pagination)
