# PRD: Teams Frontend Feature

## Introduction

Add team management UI to the hackathon frontend, allowing participants to create teams, browse existing teams, join via invite code, and manage team membership. Team leaders can edit team details and regenerate invite codes. This builds on the existing backend teams API.

## Goals

- Allow registered participants to create and manage teams within a hackathon
- Enable team discovery through a browsable list of all teams
- Provide invite code sharing and joining functionality
- Give team leaders full management capabilities (edit details, regenerate invite, view members)
- Display team information within hackathon detail pages
- Show users their teams in a dedicated section on hackathon detail

## User Stories

### US-001: Teams service layer
**Description:** As a developer, I need API client functions for teams so that frontend components can interact with the backend.

**Acceptance Criteria:**
- [x] Create `/src/services/teams.ts` with typed functions
- [x] `getTeamsByHackathon(hackathonId)` - GET teams list for a hackathon
- [x] `getTeam(teamId)` - GET single team details with members
- [x] `getMyTeam(hackathonId)` - GET current user's team in a hackathon
- [x] `createTeam(data)` - POST to create team
- [x] `updateTeam(teamId, data)` - PUT to update team
- [x] `joinTeamByCode(inviteCode)` - POST to join via invite code
- [x] `leaveTeam(teamId)` - POST to leave team
- [x] `regenerateInviteCode(teamId)` - POST to regenerate invite code
- [x] Add Team and TeamMember types to `/src/types/index.ts`
- [x] Typecheck passes

### US-002: TeamCard component
**Description:** As a user, I want to see team information displayed consistently so I can quickly understand team details.

**Acceptance Criteria:**
- [x] Create `/src/components/TeamCard.tsx` component
- [x] Displays team name, description preview (truncated), member count
- [x] Shows open/closed badge with appropriate colors (green for open, gray for closed)
- [x] Shows "X / Y members" where Y is max team size
- [x] Card is clickable and navigates to team detail page
- [x] Matches existing HackathonCard styling patterns
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-003: Teams list page
**Description:** As a participant, I want to browse all teams in a hackathon so I can find one to join.

**Acceptance Criteria:**
- [x] New route: `/hackathons/:slug/teams` renders teams browse page
- [x] Page header shows "Teams" with hackathon name
- [x] Fetches and displays all teams using TeamCard components
- [x] Filter toggle: "Show open teams only" (default off - shows all teams)
- [x] Search input filters teams by name (client-side filtering)
- [x] Empty state message when no teams exist or match filters
- [x] Back link to hackathon detail page
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: Teams section on hackathon detail page
**Description:** As a participant, I want to see team information on the hackathon page so I can quickly access team features.

**Acceptance Criteria:**
- [x] Add "Teams" section/card to hackathon detail page
- [x] Shows count of total teams in the hackathon
- [x] "Browse Teams" button links to `/hackathons/:slug/teams`
- [x] "Create Team" button visible for registered participants without a team
- [x] If user has a team, show "My Team" card with team name and "View Team" link
- [x] Section only visible for hackathons with status registration_open or in_progress
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: Team detail page - view mode
**Description:** As a participant, I want to view a team's profile so I can learn about them before joining.

**Acceptance Criteria:**
- [x] New route: `/hackathons/:slug/teams/:teamId` renders team detail page
- [x] Displays team name, full description, open/closed status badge
- [x] Shows member list with names and leader badge indicator
- [x] Shows hackathon name with link back to hackathon detail
- [x] Shows "X of Y members" capacity indicator
- [x] Back link to teams list page
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-006: Create team functionality
**Description:** As a registered participant, I want to create a team so I can start forming my group.

**Acceptance Criteria:**
- [x] Create team form/modal accessible from hackathon detail and teams list pages
- [x] Form fields: team name (required), description (optional), open for joining toggle (default true)
- [x] Form validates name is not empty
- [x] Uses React Hook Form with Zod validation (matching existing patterns)
- [x] Successful creation shows success toast and navigates to new team detail page
- [x] Error displays appropriate message (already on team, not registered, etc.)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-007: Join team via invite code
**Description:** As a participant, I want to join a team using an invite code so I can join teams that aren't publicly open.

**Acceptance Criteria:**
- [x] "Join with Invite Code" button on teams list page
- [x] Opens modal with single input field for invite code
- [x] Validates code is not empty
- [x] Successful join shows success toast and navigates to team detail page
- [x] Error displays appropriate message (invalid code, team full, already on team)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-008: Join open team from detail page
**Description:** As a participant, I want to join an open team directly so I can quickly join teams accepting members.

**Acceptance Criteria:**
- [x] "Join Team" button visible on team detail page for open teams
- [x] Button hidden if user already on a team in this hackathon
- [x] Button hidden if user is not registered for the hackathon
- [x] Button shows "Team Full" (disabled) if at max capacity
- [x] Clicking join shows confirmation dialog
- [x] Successful join shows success toast and refreshes page to show member view
- [x] Error displays appropriate message
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-009: Leave team functionality
**Description:** As a team member, I want to leave my team so I can join a different one.

**Acceptance Criteria:**
- [x] "Leave Team" button visible on team detail page for team members
- [x] Button shows confirmation dialog explaining consequences
- [x] If user is leader and other members exist, dialog explains leadership will transfer
- [x] Successful leave shows toast and redirects to hackathon detail page
- [x] Error displays appropriate message
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-010: Team leader - edit team
**Description:** As a team leader, I want to edit my team's details so I can keep information accurate.

**Acceptance Criteria:**
- [x] "Edit Team" button visible on team detail page for team leader only
- [x] Opens modal/form with: name, description, is_open toggle (pre-filled with current values)
- [x] Uses same form component/pattern as create team
- [x] Save updates team and shows success toast
- [x] Cancel closes modal without changes
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-011: Team leader - invite code management
**Description:** As a team leader, I want to share and regenerate my team's invite code so I can invite specific people.

**Acceptance Criteria:**
- [x] Invite code section visible on team detail page for team members
- [x] Shows current invite code in a copyable format
- [x] "Copy" button copies code to clipboard with toast confirmation
- [x] "Regenerate Code" button visible for team leader only
- [x] Regenerate shows confirmation dialog (old code will stop working)
- [x] Successful regenerate shows new code and success toast
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-012: Navigation and routing setup
**Description:** As a developer, I need routes configured for team pages so users can navigate to them.

**Acceptance Criteria:**
- [x] Add route `/hackathons/:slug/teams` for teams list page
- [x] Add route `/hackathons/:slug/teams/:teamId` for team detail page
- [x] Routes are protected (require authentication)
- [x] Typecheck passes

## Non-Goals

- Team chat or messaging functionality
- Join request/approval workflow (direct join for open teams, invite code for closed)
- Team matching or recommendation algorithms
- Team deletion UI (teams persist, members can leave)
- Team avatars/logo upload
- Notification system for team events
- Member removal by leader (out of scope for initial release)
- "My Teams" dashboard section across all hackathons (may add later)

## Technical Considerations

- Backend APIs already exist at `/api/teams/*` endpoints - use existing service patterns
- Reuse existing UI patterns: Cards similar to HackathonCard, modals using existing Dialog patterns
- Use React Query for data fetching (consistent with hackathons patterns)
- Use React Hook Form + Zod for form validation (consistent with existing forms)
- Team routes nested under hackathon slug for context
- Filter state can use URL search params for shareability
