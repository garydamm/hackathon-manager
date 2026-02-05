# PRD: Hackathon Archive Functionality

## Introduction

Add the ability to archive hackathons so they are hidden from the public dashboard but remain accessible via direct URL for authenticated users. This allows organizers to clean up their active hackathon list while preserving historical events and their data. Archived hackathons become read-only to prevent new registrations or submissions.

## Goals

- Hide archived hackathons from the main dashboard listing
- Preserve all hackathon data (participants, teams, submissions) when archived
- Allow authenticated users to view archived hackathons via direct slug URL
- Enable organizers to archive/unarchive hackathons from settings
- Prevent new registrations and submissions to archived hackathons
- Maintain read-only access to all existing data in archived hackathons

## User Stories

### US-001: Add archived field to hackathon database schema
**Description:** As a developer, I need to store the archived status of hackathons so the system can differentiate between active and archived events.

**Acceptance Criteria:**
- [x] Add `archived` boolean column to hackathons table with default `false`
- [x] Generate and run database migration successfully
- [x] Update Prisma schema with archived field
- [x] Unit tests added for schema validation
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Filter archived hackathons from dashboard queries
**Description:** As a user, I want to see only active hackathons on the dashboard so I'm not overwhelmed by old events.

**Acceptance Criteria:**
- [ ] Update dashboard query to exclude hackathons where `archived = true`
- [ ] Verify dashboard only shows active hackathons
- [ ] Unit tests added for filtering logic
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-003: Add authentication check for archived hackathon access
**Description:** As a security measure, archived hackathons should require user authentication when accessed via direct URL.

**Acceptance Criteria:**
- [ ] Add middleware/check to redirect unauthenticated users to login when accessing archived hackathon
- [ ] Authenticated users can view archived hackathon details
- [ ] Show "This hackathon is archived" banner on archived hackathon pages
- [ ] Unit tests added for authentication check
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Prevent registrations and submissions for archived hackathons
**Description:** As an organizer, I want archived hackathons to be read-only so no new data is added after archiving.

**Acceptance Criteria:**
- [ ] Block new participant registrations for archived hackathons (return error or show message)
- [ ] Block new team creation for archived hackathons
- [ ] Block new submissions for archived hackathons
- [ ] Show appropriate "This hackathon is archived" message when actions are blocked
- [ ] Unit tests added for blocking logic
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Add archive/unarchive actions to backend
**Description:** As an organizer, I need backend endpoints to archive and unarchive hackathons so I can manage their visibility.

**Acceptance Criteria:**
- [ ] Create server action to archive a hackathon (sets `archived = true`)
- [ ] Create server action to unarchive a hackathon (sets `archived = false`)
- [ ] Actions verify user is an organizer of the hackathon
- [ ] Actions return success/error status
- [ ] Unit tests added for archive/unarchive logic and permissions
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-006: Add archive/unarchive UI controls in hackathon settings
**Description:** As an organizer, I want to archive or unarchive a hackathon from the settings page so I can control its visibility.

**Acceptance Criteria:**
- [ ] Add "Archive Hackathon" button in hackathon settings (visible when hackathon is active)
- [ ] Add "Unarchive Hackathon" button in hackathon settings (visible when hackathon is archived)
- [ ] Show confirmation dialog before archiving/unarchiving
- [ ] Display success message after action completes
- [ ] Button only visible to hackathon organizers
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-007: Add UI system tests for archive workflow
**Description:** As a developer, I need end-to-end tests for the archive feature to ensure the complete user flow works correctly.

**Acceptance Criteria:**
- [ ] UI system test: Organizer archives hackathon → Verify it disappears from dashboard
- [ ] UI system test: Access archived hackathon via slug as authenticated user → Verify it displays with archived banner
- [ ] UI system test: Attempt to register for archived hackathon → Verify blocked with message
- [ ] UI system test: Organizer unarchives hackathon → Verify it reappears on dashboard
- [ ] UI system tests pass
- [ ] Typecheck passes

## Non-Goals

- No automatic archiving based on hackathon end date
- No separate "Archived" section in dashboard for organizers (archived hackathons only accessible via direct URL)
- No notifications sent to participants when hackathon is archived
- No export/backup functionality specifically for archived hackathons
- No public archive listing or search functionality

## Technical Considerations

- Reuse existing authentication middleware for archived hackathon access checks
- Use existing permission checks for organizer verification on archive actions
- Archive banner component should be consistent with other system messages/banners
- Consider adding `archived` field to TypeScript types for hackathon data
- Existing queries should be reviewed to ensure they filter archived hackathons where appropriate
- UI system tests should use Playwright for end-to-end testing
