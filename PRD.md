# PRD: Project Management UI

## Introduction

Add UI for managing hackathon projects using the existing backend APIs. This feature enables team members to create, edit, and submit their projects, while also allowing hackathon organizers/admins to view and manage all projects within a hackathon. Projects will be accessible from both the team detail page (for team-specific management) and the hackathon detail page (for hackathon-wide project listing).

## Goals

- Allow team members to create a project for their team within a hackathon
- Enable editing of project details (name, tagline, description, URLs)
- Support the full submission workflow (submit and unsubmit)
- Display all projects for a hackathon on the hackathon detail page
- Provide admins visibility into all projects across a hackathon
- Show full project details including demo, video, repository, and presentation URLs

## User Stories

### US-001: Add Project TypeScript types
**Description:** As a developer, I need TypeScript type definitions for projects so that the frontend can work with project data in a type-safe manner.

**Acceptance Criteria:**
- [x] Add `Project` interface to `/frontend/src/types/index.ts` matching the backend `ProjectResponse` DTO
- [x] Add `CreateProjectRequest` interface for project creation
- [x] Add `UpdateProjectRequest` interface for project updates
- [x] Add `ProjectStatus` type for submission status enum (draft, submitted, under_review, accepted, rejected)
- [x] Typecheck passes

### US-002: Add project service layer
**Description:** As a developer, I need a service layer to interact with the project backend APIs so that components can fetch and mutate project data.

**Acceptance Criteria:**
- [x] Create `/frontend/src/services/projects.ts` with functions for all project endpoints
- [x] Implement `getProjectsByHackathon(hackathonId)` - GET `/api/projects/hackathon/{hackathonId}`
- [x] Implement `getProjectById(id)` - GET `/api/projects/{id}`
- [x] Implement `getProjectByTeam(teamId)` - GET `/api/projects/team/{teamId}`
- [x] Implement `createProject(request)` - POST `/api/projects`
- [x] Implement `updateProject(id, request)` - PUT `/api/projects/{id}`
- [x] Implement `submitProject(id)` - POST `/api/projects/{id}/submit`
- [x] Implement `unsubmitProject(id)` - POST `/api/projects/{id}/unsubmit`
- [x] Typecheck passes

### US-003: Create ProjectCard component
**Description:** As a user, I want to see project information displayed in a card format so that I can quickly view project details.

**Acceptance Criteria:**
- [x] Create `ProjectCard.tsx` component in `/frontend/src/components/`
- [x] Display project name, tagline, and status badge
- [x] Display team name
- [x] Show submission date if submitted
- [x] Include links/icons for demo, video, repository, and presentation URLs (only if present)
- [x] Card is clickable to view full project details
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: Create ProjectDetailModal component
**Description:** As a user, I want to view full project details in a modal so that I can see all project information without navigating away.

**Acceptance Criteria:**
- [x] Create `ProjectDetailModal.tsx` component in `/frontend/src/components/`
- [x] Display all project fields: name, tagline, description, status
- [x] Display all URL fields as clickable links (demo, video, repository, presentation)
- [x] Show team name and submission timestamp
- [x] Include close button to dismiss modal
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Create ProjectForm component
**Description:** As a team member, I want a form to create and edit project details so that I can manage my team's project submission.

**Acceptance Criteria:**
- [x] Create `ProjectForm.tsx` component in `/frontend/src/components/`
- [x] Include fields: name (required), tagline, description, demoUrl, videoUrl, repositoryUrl, presentationUrl
- [x] Support both create mode (new project) and edit mode (existing project)
- [x] Pre-populate fields when editing an existing project
- [x] Show validation error if name is empty
- [x] Include Save and Cancel buttons
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Add project section to TeamDetailPage
**Description:** As a team member, I want to manage my team's project from the team detail page so that I can create, edit, and submit our project.

**Acceptance Criteria:**
- [ ] Add "Project" section to `TeamDetailPage.tsx`
- [ ] If team has no project: show "Create Project" button that opens ProjectForm in create mode
- [ ] If team has a project: display project details using ProjectCard
- [ ] Add "Edit Project" button that opens ProjectForm in edit mode (only for draft projects)
- [ ] Fetch project data using `getProjectByTeam(teamId)` on page load
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-007: Add submit/unsubmit actions to team project section
**Description:** As a team member, I want to submit and unsubmit my project so that I can control when it's ready for judging.

**Acceptance Criteria:**
- [ ] Add "Submit Project" button for projects in draft status
- [ ] Add "Unsubmit Project" button for projects in submitted status
- [ ] Show confirmation modal before submit/unsubmit actions
- [ ] Call appropriate service functions on confirmation
- [ ] Refresh project data after successful action
- [ ] Disable edit functionality for submitted projects
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-008: Add projects list to HackathonDetail page
**Description:** As a hackathon organizer, I want to see all projects for a hackathon so that I can monitor submissions and review projects.

**Acceptance Criteria:**
- [ ] Add "Projects" section to `HackathonDetail.tsx`
- [ ] Fetch all projects using `getProjectsByHackathon(hackathonId)`
- [ ] Display projects using ProjectCard components in a grid/list layout
- [ ] Show project count in section header
- [ ] Show empty state message when no projects exist
- [ ] Clicking a ProjectCard opens ProjectDetailModal
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals

- Project deletion (no delete endpoint exists in backend)
- Project media/gallery management (using URLs only)
- Technologies list display or editing
- Filtering or sorting projects
- Search functionality
- Thumbnail image upload
- Admin-specific project management actions (status changes beyond submit/unsubmit)
- Judge assignment UI
- Prize winner assignment UI

## Technical Considerations

- Reuse existing modal patterns from the codebase (e.g., registration confirmation modals)
- Reuse existing form styling and validation patterns
- Reuse existing card/badge components for consistent UI
- Projects in "submitted" status should be read-only (backend enforces this)
- Handle 404 gracefully when team has no project (returns null from API)
