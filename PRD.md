# PRD: Enhanced Teams Section on Hackathon Detail Page

## Introduction

The Teams section on the Hackathon Detail page currently shows minimal information — just a count, a "My Team" link, and a "Browse Teams" button. This feature transforms it into a rich, visual grid of clickable team thumbnails (matching the style of the Projects section), with adaptive card sizing based on team count, a "My Team / All Teams" toggle filter, a persistent "Create Team" button, and a team count in the header.

## Goals

- Display teams as a visual grid of clickable thumbnails on the Hackathon Detail page
- Show detailed thumbnails (name, description, member count/max, open/closed status, member avatar row) when fewer than 10 teams
- Show compact thumbnails (name and member count only) when 10 or more teams
- Auto-adjust grid columns based on screen size and team count
- Provide a toggle to filter between "All Teams" and "My Team"
- Show team count next to the "Teams" header matching the Projects section format: "Teams (N)"
- Always show the "Create Team" button for eligible users
- Keep "View All Teams" link to the existing TeamsListPage

## User Stories

### US-001: Include members in teams-by-hackathon API response
**Description:** As a frontend developer, I need the teams list API to include member data so I can display member avatars on detailed team thumbnails.

**Acceptance Criteria:**
- [x] Update `TeamService.getTeamsByHackathon()` to call `TeamResponse.fromEntity(team, includeMembers = true)`
- [x] `GET /api/teams/hackathon/{hackathonId}` response now includes `members` array on each team, with each member's `user` (containing `displayName`, `avatarUrl`, `firstName`, `lastName`) and `isLeader` flag
- [x] Existing `TeamControllerTest` updated to verify members are included in the list response
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Create TeamThumbnail component with detailed and compact variants
**Description:** As a user, I want to see team thumbnails in the hackathon detail page so I can quickly browse teams and click through to their detail pages.

**Acceptance Criteria:**
- [x] Create `frontend/src/components/TeamThumbnail.tsx` with a `variant` prop: `"detailed"` or `"compact"`
- [x] **Detailed variant** shows: gradient header with team initial (matching TeamCard/ProjectCard style), team name, description (truncated, 2-line clamp), member count / max team size, open/closed badge, row of member avatar circles (use `avatarUrl` or first-letter initials fallback, show max 5 with "+N" overflow indicator)
- [x] **Compact variant** shows: smaller card with team initial, team name, and member count — no description, no avatars, no open/closed badge
- [x] Both variants are wrapped in a `Link` to `/hackathons/{slug}/teams/{teamId}`
- [x] Both variants use motion animations consistent with existing ProjectCard (fade + slide-up, staggered by index)
- [x] Hover effects match existing cards (shadow increase, slight upward translation)
- [x] Unit tests pass
- [x] Typecheck passes

### US-003: Refactor TeamsSection with grid layout, count header, and adaptive thumbnails
**Description:** As a user, I want the Teams section to display team thumbnails in a responsive grid so I can visually browse all teams without leaving the hackathon detail page.

**Acceptance Criteria:**
- [x] Teams header shows count in parentheses: "Teams (N)" matching the Projects section format
- [x] "Create Team" button always visible in the header row (for participants and organizers), links to `/hackathons/${slug}/teams?create=true`
- [x] Teams displayed in a responsive grid using TeamThumbnail components
- [x] Automatically selects `"detailed"` variant when < 10 teams, `"compact"` variant when >= 10 teams
- [x] Grid columns auto-adjust: detailed mode uses responsive 1 col (sm) → 2 cols (md) → 3 cols (lg); compact mode uses responsive 2 cols (sm) → 3 cols (md) → 4 cols (lg)
- [x] "View All Teams" link preserved at bottom of section, linking to TeamsListPage
- [x] Loading state shows spinner (matching current behavior)
- [x] Empty state message when no teams exist (e.g., "No teams yet")
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: Add My Team / All Teams toggle filter
**Description:** As a user, I want to toggle between viewing all teams and just my team so I can quickly find my team in a large hackathon.

**Acceptance Criteria:**
- [ ] Toggle filter with two options: "All Teams" and "My Team"
- [ ] Toggle uses the same pill/tab styling as the Projects section filter (`bg-muted rounded-lg` container with `bg-background shadow-sm` active state)
- [ ] Default selection is "All Teams"
- [ ] "My Team" filter shows only the user's team (filter the teams array using existing `myTeam` query data to match by ID)
- [ ] "My Team" option is hidden when the user is not on a team (no `myTeam` data)
- [ ] Toggle only appears when there is at least 1 team
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Add E2E tests for enhanced Teams section
**Description:** As a developer, I need end-to-end tests for the enhanced Teams section to verify the complete user flow works correctly.

**Acceptance Criteria:**
- [ ] E2E test: Navigate to hackathon detail page → verify Teams section header shows "Teams (N)" with correct count
- [ ] E2E test: Verify team thumbnails are displayed in grid layout and clicking one navigates to the team detail page
- [ ] E2E test: Create a team → navigate back to hackathon detail → verify the new team appears in the Teams grid with updated count
- [ ] E2E test: Toggle "My Team" filter → verify only user's team is shown; toggle "All Teams" → verify all teams are shown again
- [ ] E2E tests pass
- [ ] Typecheck passes

## Non-Goals

- No changes to the TeamsListPage (it remains as-is, accessible via "View All Teams" link)
- No search functionality within the inline teams grid (search stays on TeamsListPage)
- No inline team joining — users click through to Team Detail page to join
- No pagination or infinite scroll for the inline grid
- No drag-and-drop or reordering of teams
- No changes to TeamCard component (used only on TeamsListPage)

## Technical Considerations

- **API change required:** `TeamService.getTeamsByHackathon()` currently calls `TeamResponse.fromEntity(team)` which defaults to `includeMembers = false`, returning `members: null`. US-001 changes this to `includeMembers = true` so member avatars are available for the detailed thumbnails. This is backward-compatible (null → populated array).
- **Existing components to reference:** `ProjectCard.tsx` for visual card style, `TeamCard.tsx` for team-specific data patterns, `ProjectsSection` in `HackathonDetail.tsx` for header count format and filter toggle styling.
- **Data already fetched:** `teams` (via `getTeamsByHackathon`) and `myTeam` (via `getMyTeam`) are already queried in the current `TeamsSection` — reuse both.
- **Max team size:** The existing `TeamCard` on `TeamsListPage` receives `maxTeamSize` as a prop from the hackathon settings. Check if `Hackathon` type has `maxTeamSize` — if so, use it for the "N / M members" display; if not, just show the count.
- **Avatar fallback pattern:** TeamDetailPage uses first letter of `displayName` (or `firstName`) as initials when `avatarUrl` is null — reuse this pattern for thumbnail avatar circles.
- **New component vs modifying TeamCard:** Create a new `TeamThumbnail` component rather than modifying `TeamCard`, since they serve different contexts (inline detail page vs dedicated list page) with different data density requirements.
