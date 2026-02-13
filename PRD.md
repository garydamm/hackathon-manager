# PRD: Decouple Projects from Teams

## Introduction

Currently, projects are tightly coupled to teams — a project **requires** a `team_id` (NOT NULL) and can only be created from within a team context. This PRD updates the application end-to-end so that projects can exist independently within a hackathon, with an optional one-to-one association to a team. Any team member can link or unlink a project to their team, and projects can be created either independently or from within a team context.

## Goals

- Make `team_id` on projects nullable so projects can exist without a team
- Add `created_by` to projects to track the project creator independently of team ownership
- Allow project creation from both hackathon context (no team) and team context
- Enable any team member to link an unlinked project to their team (one-to-one: a team can have at most one project)
- Enable team members to unlink a project from their team
- Update all frontend pages and components to support the new independent project model
- Maintain backward compatibility with existing data (migrate existing projects to populate `created_by`)

## User Stories

### US-001: Database migration to decouple projects from teams
**Description:** As a developer, I need to update the database schema so that projects can exist without a team and track their creator independently.

**Acceptance Criteria:**
- [x] Add new migration file that:
  - Makes `team_id` column nullable on `projects` table (ALTER COLUMN DROP NOT NULL)
  - Adds `created_by` column (UUID, FK to `users`, NOT NULL for new rows)
  - Backfills `created_by` for existing projects using the team's `created_by` value
  - Drops existing unique constraint `uq_projects_team_hackathon` on `(team_id, hackathon_id)`
  - Adds new partial unique index: `(team_id, hackathon_id) WHERE team_id IS NOT NULL AND archived_at IS NULL` — ensures one active project per team per hackathon, but allows unlinked projects
  - Adds index on `created_by` column
  - Adds index on `(hackathon_id, created_by)` for querying user's projects in a hackathon
- [x] Migration runs successfully against existing data
- [x] Existing projects retain their team associations and gain `created_by` values
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Update Project entity, DTOs, and repository
**Description:** As a developer, I need to update the Kotlin entity, DTOs, and repository to support nullable team and new created_by field.

**Acceptance Criteria:**
- [ ] Update `Project` entity: make `team` property nullable (`var team: Team?`), add `createdBy` ManyToOne relationship to `User`
- [ ] Update `ProjectResponse` DTO: make `teamId` and `teamName` nullable, add `createdById: UUID` and `createdByName: String` fields
- [ ] Update `ProjectResponse.fromEntity()` to handle null team and include createdBy info
- [ ] Update `CreateProjectRequest`: make `teamId` nullable (`val teamId: UUID?`), add required `hackathonId: UUID` field
- [ ] Update `ProjectRepository`:
  - Add `findByHackathonIdAndCreatedByIdAndArchivedAtIsNull(hackathonId: UUID, userId: UUID): List<Project>` for user's projects
  - Add `findByHackathonIdAndTeamIsNullAndArchivedAtIsNull(hackathonId: UUID): List<Project>` for unlinked projects
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-003: Update ProjectService for independent project creation
**Description:** As a user, I want to create a project within a hackathon without needing to be on a team, so that I can start working on my idea independently.

**Acceptance Criteria:**
- [ ] `createProject` handles two flows:
  - **With teamId**: validates user is team member, links project to team (existing behavior), sets `createdBy` to the requesting user
  - **Without teamId**: validates user is registered in hackathon, creates project with null team, sets `createdBy` to the requesting user
- [ ] When creating with a team, hackathonId from request must match the team's hackathon (or is derived from team)
- [ ] `updateProject` authorization: allow if user is project creator OR a member of the linked team
- [ ] `submitProject` / `unsubmitProject` / `archiveProject`: allow if user is project creator OR a member of the linked team
- [ ] `getProjectsByHackathon` returns all non-archived projects (both linked and unlinked)
- [ ] Unit tests added for independent project creation flow
- [ ] Unit tests added for updated authorization logic (creator vs team member)
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-004: Add team-project link and unlink API endpoints
**Description:** As a team member, I want to link an unlinked project to my team (or unlink it) so that our team can claim a project for the hackathon.

**Acceptance Criteria:**
- [ ] New service method `linkProjectToTeam(projectId: UUID, teamId: UUID, userId: UUID): ProjectResponse`
  - Validates user is a member of the target team
  - Validates project exists and is in the same hackathon as the team
  - Validates project is not already linked to a team
  - Validates team does not already have an active (non-archived) project
  - Sets project's `team` to the target team
- [ ] New service method `unlinkProjectFromTeam(projectId: UUID, userId: UUID): ProjectResponse`
  - Validates user is a member of the currently linked team
  - Sets project's `team` to null
- [ ] New controller endpoint: `POST /api/projects/{id}/link-team/{teamId}` — links project to team
- [ ] New controller endpoint: `POST /api/projects/{id}/unlink-team` — unlinks project from team
- [ ] Unit tests added for link/unlink logic including all validation cases
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-005: Update frontend types and API service layer
**Description:** As a developer, I need to update the TypeScript types and API service to support the new optional team association and link/unlink operations.

**Acceptance Criteria:**
- [ ] Update `Project` interface: make `teamId` and `teamName` optional (`string | null`), add `createdById: string` and `createdByName: string`
- [ ] Update `CreateProjectRequest` interface: make `teamId` optional, add required `hackathonId: string`
- [ ] Add `linkProjectToTeam(projectId: string, teamId: string): Promise<Project>` to `projectService`
- [ ] Add `unlinkProjectFromTeam(projectId: string): Promise<Project>` to `projectService`
- [ ] Add `getUnlinkedProjects(hackathonId: string): Promise<Project[]>` to `projectService`
- [ ] Existing API calls still work correctly
- [ ] Typecheck passes

### US-006: Update project creation UI for independent projects
**Description:** As a hackathon participant, I want to create a project from the hackathon projects page (without needing a team) so I can start building immediately.

**Acceptance Criteria:**
- [ ] Add "Create Project" button on the hackathon projects list page (visible to registered participants)
- [ ] Button opens a project creation form/modal that does NOT require a team
- [ ] The form sends `hackathonId` and omits `teamId`
- [ ] Existing team-context project creation on `TeamDetailPage` still works (sends both `teamId` and `hackathonId`)
- [ ] After creation, the list refreshes to show the new project
- [ ] Verify changes work in browser
- [ ] Typecheck passes

### US-007: Add team-project linking and unlinking UI
**Description:** As a team member, I want to link an unlinked project to my team from the team detail page, and unlink it if needed.

**Acceptance Criteria:**
- [ ] On `TeamDetailPage`, when the team has no linked project, show a "Link Project" button/section
- [ ] "Link Project" opens a modal/dropdown listing unlinked projects in the hackathon that the current user created
- [ ] Selecting a project and confirming calls `linkProjectToTeam` API
- [ ] On `TeamDetailPage`, when the team has a linked project, show an "Unlink Project" option with confirmation dialog
- [ ] Unlinking calls `unlinkProjectFromTeam` API and refreshes the team's project section
- [ ] React Query caches are invalidated after link/unlink operations
- [ ] Verify changes work in browser
- [ ] Typecheck passes

### US-008: Update project display components for optional team
**Description:** As a user, I want project cards and detail views to gracefully handle projects that have no team, showing the creator instead.

**Acceptance Criteria:**
- [ ] `ProjectCard` component: when `teamName` is null, display "By [createdByName]" instead of team name
- [ ] Project detail view: when no team linked, show creator info and hide team-specific actions
- [ ] Project detail view: when team is linked, show team name with link to team detail page
- [ ] Projects list page: add filter option to show "All" / "Team Projects" / "Independent Projects"
- [ ] Verify changes work in browser
- [ ] Typecheck passes

### US-009: UI system tests for decoupled project-team workflow
**Description:** As a developer, I need end-to-end tests to verify the complete project-team decoupling workflow.

**Acceptance Criteria:**
- [ ] UI system test: Create project independently (no team) within a hackathon, verify it appears in projects list
- [ ] UI system test: Create project from team context, verify it appears linked to team
- [ ] UI system test: Link an unlinked project to a team, verify team shows the project
- [ ] UI system test: Unlink a project from a team, verify team no longer shows the project and project still exists
- [ ] UI system tests pass
- [ ] Typecheck passes

## Non-Goals

- No change to the team-hackathon relationship (teams remain hackathon-scoped)
- No multi-team associations (a project links to at most one team — strictly one-to-one)
- No transfer of project ownership between users
- No changes to judging, prize winners, or judge assignment flows (these reference projects and are unaffected)
- No changes to project media management
- No drag-and-drop or bulk linking operations

## Technical Considerations

- **Existing data migration**: All current projects have a `team_id`. The migration must backfill `created_by` from `teams.created_by` before adding the NOT NULL constraint on `created_by`.
- **Partial unique constraint**: PostgreSQL supports `CREATE UNIQUE INDEX ... WHERE condition` for the one-active-project-per-team rule while allowing NULLs.
- **Hibernate enum handling**: Remember to use `CAST(column AS text)` in any native queries involving PostgreSQL named enums (per project conventions).
- **Authorization complexity**: Two authorization paths now exist — project creator and team member. Service methods must check both.
- **React Query cache invalidation**: Link/unlink operations affect both team and project caches — invalidate `["team", teamId]`, `["projects", hackathonId]`, and `["teamProject", teamId]` query keys.
- **Existing `ProjectForm` component**: Reuse for both team-context and independent creation flows by making team fields conditional.
