# PRD: Hackathon Detail Page Section Navigation

## Introduction

The hackathon detail page (`HackathonDetail.tsx`) contains 10+ vertically stacked sections that vary by user role and hackathon state. Currently there is no way to see all available sections at a glance or quickly jump between them. This feature adds a sticky horizontal underline tab bar (similar to GitHub repository tabs) below the hero area that shows all page sections, highlights the active one via scrollspy, and allows click-to-jump navigation. Tabs for role-restricted sections are visible but grayed out for users who cannot access them.

## Goals

- Provide at-a-glance visibility of all sections on the hackathon detail page
- Enable one-click jump to any section via smooth scrolling
- Auto-highlight the active section tab as the user scrolls (scrollspy)
- Show all section tabs regardless of role, with inaccessible ones visually disabled
- Maintain consistency with the existing shadcn/Tailwind design language
- Work well on both desktop and mobile (horizontal scroll on small screens)

## Section Mapping

The nav bar consolidates the page's many sections into these tabs:

| Tab Label | Anchors To | Disabled When |
|-----------|-----------|---------------|
| Overview | About / Rules / Team Settings area | Never |
| Organizers | OrganizersSection | Never |
| Participants | ParticipantsSection | User not authenticated |
| Teams | TeamsSection | Hackathon not in registration_open/in_progress |
| Projects | ProjectsSection | Never |
| Schedule | ScheduleManagementSection | User is not an organizer |
| Judging | JudgingCriteriaSection + JudgesSection | User is not an organizer |
| Leaderboard | LeaderboardSection | User is not an organizer |
| Results | ResultsSection | User is not a participant or hackathon not completed |

## User Stories

### US-001: Create SectionNav component
**Description:** As a developer, I need a reusable sticky horizontal tab bar component so that it can be placed on the hackathon detail page for section navigation.

**Acceptance Criteria:**
- [x] New component `SectionNav.tsx` in `frontend/src/components/`
- [x] Accepts a list of sections with `id`, `label`, `disabled`, and `active` properties
- [x] Renders as a horizontal row of text tabs with underline styling
- [x] Active tab has `border-b-2 border-primary text-foreground` styling
- [x] Inactive tabs use `text-muted-foreground` with hover state `hover:text-foreground`
- [x] Disabled tabs use `text-muted-foreground/50` with `cursor-not-allowed` and no hover effect
- [x] Component uses `sticky` positioning (top value configurable via prop or CSS variable to account for app header)
- [x] Has solid `bg-background` and bottom border for visual separation when stuck
- [x] On small screens, tabs are horizontally scrollable with hidden scrollbar (`overflow-x-auto`, `scrollbar-hide`)
- [x] Fires an `onTabClick(sectionId)` callback when a non-disabled tab is clicked
- [x] Minimum touch target of 44px height on mobile
- [x] Unit tests pass
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-002: Add section anchors and integrate SectionNav into HackathonDetail
**Description:** As a user, I want to see a sticky navigation bar on the hackathon detail page so that I can see all sections and click to jump to any of them.

**Acceptance Criteria:**
- [ ] Each section in `HackathonDetail.tsx` ViewMode has an `id` attribute matching the section mapping (e.g., `id="overview"`, `id="teams"`, `id="projects"`)
- [ ] Each section has `scroll-margin-top` CSS set to the combined height of the app header + nav bar (~112px) so sections don't hide behind sticky elements
- [ ] SectionNav is rendered between the Quick Info cards and the first content section
- [ ] Section list is computed based on current user role and hackathon state — all tabs appear, inaccessible ones are marked `disabled`
- [ ] Clicking a non-disabled tab smooth-scrolls to the corresponding section using `scrollIntoView({ behavior: 'smooth', block: 'start' })`
- [ ] Clicking a disabled tab does nothing
- [ ] Respects `prefers-reduced-motion` by using `behavior: 'auto'` when motion is reduced
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-003: Implement scrollspy with IntersectionObserver
**Description:** As a user, I want the active section tab to auto-update as I scroll through the page so that I always know which section I'm viewing.

**Acceptance Criteria:**
- [ ] New custom hook `useScrollSpy` in `frontend/src/hooks/useScrollSpy.ts`
- [ ] Uses `IntersectionObserver` to observe all section elements by their IDs
- [ ] Returns the currently active section ID based on which section is most visible in the viewport
- [ ] Updates the active tab in SectionNav as the user scrolls
- [ ] During programmatic scroll (click-to-jump), scrollspy updates are temporarily suppressed to prevent flickering
- [ ] On mobile, the active tab auto-scrolls into view within the horizontally scrollable nav bar
- [ ] Unit tests added for the useScrollSpy hook
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-004: E2E tests for section navigation
**Description:** As a developer, I need end-to-end tests for the section navigation feature to ensure the complete user flow works correctly.

**Acceptance Criteria:**
- [ ] E2E test: Navigate to hackathon detail page → section nav bar is visible with expected tabs
- [ ] E2E test: Click a section tab → page scrolls to that section
- [ ] E2E test: Disabled tabs are visually distinct and not clickable
- [ ] E2E test: Scroll down the page → active tab updates to reflect visible section
- [ ] E2E tests pass
- [ ] Typecheck passes

## Non-Goals

- No count badges on tabs (just labels)
- No dropdown or nested menus for grouped sections
- No sidebar/TOC navigation variant
- No edit-mode navigation (only applies to ViewMode)
- No changes to the existing AppLayout header or breadcrumb navigation
- No collapsible/expandable sections — sections remain as-is, nav just jumps to them

## Technical Considerations

- The app header in `AppLayout.tsx` is `sticky top-0 z-50` with height ~64px; the SectionNav should use `z-40` and `top-16` (64px) to stack below it
- Use `cn()` utility (already in the project) for conditional class merging
- Framer Motion is available if entry animations are desired, but not required
- The `scrollbar-hide` utility may need to be added to Tailwind config or use inline styles (`scrollbarWidth: 'none'`, `msOverflowStyle: 'none'`, `WebkitOverflowScrolling: 'touch'`)
- IntersectionObserver `rootMargin` should be set to offset for the sticky header + nav bar height
- Existing section components (`OrganizersSection`, `ParticipantsSection`, etc.) should not need internal changes — IDs will be added to their wrapper elements in `HackathonDetail.tsx`
