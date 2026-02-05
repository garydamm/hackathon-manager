# PRD: Archive Projects

## Introduction

Add the ability to archive projects (team submissions) within hackathons. Archiving a project completely removes it from hackathon and team associations, effectively soft-deleting it from the UI while retaining the data in the database. This allows teams and organizers to clean up unwanted or invalid submissions without losing historical data.

## Goals

- Enable permanent removal of projects from hackathon/team views
- Allow both team members and hackathon organizers to archive projects
- Retain archived project data in database for records/auditing
- Allow teams to create new projects after archiving their current one
- Completely hide archived projects from all user-facing views

## User Stories

### US-001: Add archived timestamp to projects table
**Description:** As a developer, I need to mark projects as archived so the system can filter them from queries.

**Acceptance Criteria:**
- [x] Add `archivedAt` timestamp column to projects table (nullable)
- [x] Generate and run database migration successfully
- [x] Column defaults to NULL for active projects
- [x] Unit tests added for database schema validation
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Add archive project server action
**Description:** As a developer, I need a server action to archive projects with proper permission checks.

**Acceptance Criteria:**
- [x] Server action `archiveProject(projectId)` sets archivedAt to current timestamp
- [x] Validates user is either team member OR hackathon organizer
- [x] Returns error if user lacks permission
- [x] Returns error if project is already archived
- [x] Unit tests added for archive logic and permission checks
- [x] Unit tests pass
- [x] Typecheck passes

### US-003: Filter archived projects from all queries
**Description:** As a user, I should not see archived projects in any lists or views.

**Acceptance Criteria:**
- [ ] All project list queries filter WHERE archivedAt IS NULL
- [ ] Archived projects excluded from hackathon project lists
- [ ] Archived projects excluded from team project views
- [ ] Archived projects excluded from search results
- [ ] Attempting to view archived project directly shows 404 or error
- [ ] Unit tests added for query filtering logic
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-004: Add archive button to project UI
**Description:** As a team member or organizer, I want to archive a project so I can remove it from the hackathon.

**Acceptance Criteria:**
- [ ] Archive button appears in project settings or actions menu
- [ ] Button only visible to team members and hackathon organizers
- [ ] Clicking shows confirmation dialog with warning about permanence
- [ ] Successful archive redirects to appropriate page (hackathon or team view)
- [ ] Shows error message if archive fails
- [ ] Unit tests added for UI component and button visibility logic
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Verify team can create new project after archiving
**Description:** As a team member, I want to create a new project after archiving our old one.

**Acceptance Criteria:**
- [ ] Team can access project creation after archiving
- [ ] No validation errors about existing projects
- [ ] New project appears normally in lists
- [ ] Unit tests added for project creation logic after archive
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-006: Add UI system tests for project archive workflow
**Description:** As a developer, I need end-to-end tests to ensure the complete archive workflow functions correctly.

**Acceptance Criteria:**
- [ ] UI system test: Team member archives project → Verify project disappears from lists
- [ ] UI system test: Organizer archives project → Verify project disappears from lists
- [ ] UI system test: Archive project → Team creates new project → Verify new project appears
- [ ] UI system test: Attempt to view archived project directly → Verify 404 or error
- [ ] UI system tests pass
- [ ] Typecheck passes

## Non-Goals

- No ability to unarchive/restore archived projects (archiving is permanent)
- No separate "archived projects" view or admin panel
- No email notifications when projects are archived
- Archiving a project does NOT affect the team status or members
- Archiving a project does NOT affect hackathon registrations or other hackathon data
- No archive reason or audit log (just timestamp)

## Technical Considerations

- Similar to existing hackathon archive functionality (refer to recent commits)
- Use `archivedAt` timestamp pattern for consistency with hackathon archives
- Ensure all project queries include archive filter to prevent leaks
- Consider adding database index on `archivedAt` column for query performance
- Permission check should validate against both team membership and hackathon organizer role
