# PRD: Breadcrumb Navigation

## Introduction

Replace all back links throughout the application with a breadcrumb navigation bar integrated into the sticky navbar. The current back-link approach causes circular navigation loops (e.g., Hackathon Detail → Schedule → back → Hackathon Detail → back → Schedule). A breadcrumb provides a deterministic, hierarchy-based navigation path so users can always navigate to any ancestor page without loops.

## Goals

- Eliminate circular navigation loops caused by `navigate(-1)` and inconsistent back links
- Provide a clear, always-visible navigation hierarchy integrated into the existing sticky navbar
- Allow one-click navigation to any ancestor page (e.g., jump from Team Detail directly to Dashboard)
- Truncate long hackathon names (30+ chars) with ellipsis to keep the breadcrumb compact
- Only show the breadcrumb on pages that are at least 1 level deep (not on Dashboard)

## Route Hierarchy

The breadcrumb is derived from the URL path. The hierarchy is:

```
Dashboard (/)
├── Create Hackathon (/hackathons/new)
├── Hackathon: <name> (/hackathons/:slug)
│   ├── Schedule (/hackathons/:slug/schedule)
│   ├── Teams (/hackathons/:slug/teams)
│   │   └── Team: <name> (/hackathons/:slug/teams/:teamId)
│   └── Judging (/hackathons/:slug/judge)
│       └── Score Project (/hackathons/:slug/judge/:projectId)
└── Settings (/settings)
    └── Sessions (/settings/sessions)
```

## User Stories

### US-001: Create Breadcrumb UI component
**Description:** As a developer, I need a reusable Breadcrumb UI component so that it can be used across all pages.

**Acceptance Criteria:**
- [x] Create `frontend/src/components/ui/breadcrumb.tsx` with composable parts: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, `BreadcrumbPage` (current/non-clickable segment)
- [x] Uses `ChevronRight` from lucide-react as separator between segments
- [x] `BreadcrumbLink` renders as React Router `Link` for client-side navigation
- [x] `BreadcrumbPage` renders as plain text (no link) for the current page
- [x] Follows existing UI component patterns (forwardRef, `cn` utility, Tailwind styling)
- [x] Text uses `text-muted-foreground` for links, `text-foreground` for current page
- [x] Supports a `maxLength` prop on `BreadcrumbLink` and `BreadcrumbPage` to truncate text with ellipsis via CSS (`max-width`, `overflow: hidden`, `text-overflow: ellipsis`, `whitespace: nowrap`)
- [x] Unit tests added for Breadcrumb component rendering and truncation behavior
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Create useBreadcrumbs hook
**Description:** As a developer, I need a hook that derives breadcrumb segments from the current route so pages don't have to manually construct breadcrumbs.

**Acceptance Criteria:**
- [x] Create `frontend/src/hooks/useBreadcrumbs.ts` that returns an array of `{ label: string, href?: string }` segments based on the current URL path
- [x] The hook accepts an optional `overrides` map of `{ [pathSegment: string]: string }` to replace URL slugs with human-readable names (e.g., `{ "my-hackathon-slug": "My Hackathon" }`)
- [x] Static segment mappings: `hackathons` → (skipped, not shown), `new` → `"New Hackathon"`, `schedule` → `"Schedule"`, `teams` → `"Teams"`, `judge` → `"Judging"`, `settings` → `"Settings"`, `sessions` → `"Sessions"`
- [x] Dynamic segments (`:slug`, `:teamId`, `:projectId`) use the `overrides` map to resolve display names; if no override provided, format the slug as title case (replace hyphens with spaces, capitalize words)
- [x] First segment is always `{ label: "Dashboard", href: "/" }`
- [x] Last segment has no `href` (it's the current page)
- [x] The `hackathons` path segment is skipped in display but kept in href construction (e.g., `/hackathons/my-hack/schedule` → `Dashboard > My Hack > Schedule`, not `Dashboard > Hackathons > My Hack > Schedule`)
- [x] Unit tests cover: simple paths, nested paths, override resolution, slug formatting, settings path
- [x] Unit tests pass
- [x] Typecheck passes

### US-003: Integrate breadcrumb into AppLayout navbar
**Description:** As a user, I want to see the breadcrumb integrated into the sticky navbar so I always know where I am and can navigate up the hierarchy.

**Acceptance Criteria:**
- [x] Breadcrumb renders inside the existing `<nav>` element in `AppLayout.tsx`, below the logo/user row, as a second row within the navbar
- [x] Breadcrumb row only renders when there are 2+ segments (i.e., hidden on Dashboard `/`)
- [x] Breadcrumb row has a subtle top border (`border-t border-border`) separating it from the main navbar row
- [x] Breadcrumb row uses the same `max-w-7xl` and horizontal padding as the main navbar row for alignment
- [x] Hackathon name segments are truncated at 30 characters with ellipsis
- [x] Breadcrumb is responsive — on small screens, text sizes adjust and long names truncate more aggressively
- [x] Verify changes work in browser: breadcrumb appears on nested pages, is hidden on Dashboard
- [x] Typecheck passes

### US-004: Wire breadcrumb overrides into hackathon pages
**Description:** As a user, I want the breadcrumb to show real hackathon, team, and project names instead of URL slugs.

**Acceptance Criteria:**
- [ ] `HackathonDetailPage` passes `{ [slug]: hackathon.name }` as overrides to `useBreadcrumbs` — breadcrumb shows hackathon name
- [ ] `SchedulePage` passes hackathon name override — breadcrumb shows `Dashboard > Hackathon Name > Schedule`
- [ ] `TeamsListPage` passes hackathon name override — breadcrumb shows `Dashboard > Hackathon Name > Teams`
- [ ] `TeamDetailPage` passes hackathon name AND team name overrides — breadcrumb shows `Dashboard > Hackathon Name > Teams > Team Name`
- [ ] `JudgeDashboardPage` passes hackathon name override — breadcrumb shows `Dashboard > Hackathon Name > Judging`
- [ ] `ProjectScoringPage` passes hackathon name AND project name overrides — breadcrumb shows `Dashboard > Hackathon Name > Judging > Project Name`
- [ ] `CreateHackathonPage` needs no overrides — breadcrumb shows `Dashboard > New Hackathon`
- [ ] `SessionManagementPage` needs no overrides — breadcrumb shows `Dashboard > Settings > Sessions`
- [ ] While data is loading, dynamic segments display the formatted slug as a fallback (no flash of "undefined")
- [ ] Verify changes work in browser: navigate through all page types and confirm correct breadcrumb labels
- [ ] Typecheck passes

### US-005: Remove all legacy back links
**Description:** As a developer, I need to remove all the old back links/buttons now that the breadcrumb handles hierarchical navigation.

**Acceptance Criteria:**
- [ ] Remove back button (`navigate(-1)`) and cancel back-navigation from `CreateHackathonPage`
- [ ] Remove "Back to Hackathon" link from `SchedulePage`
- [ ] Remove "Back to {hackathon.name}" link from `TeamsListPage`
- [ ] Remove "Back to Teams" link from `TeamDetailPage`
- [ ] Remove "Back to Hackathon" button from `JudgeDashboardPage`
- [ ] Remove "Back to Judging" button from `ProjectScoringPage`
- [ ] Unused `ArrowLeft` imports are removed from each file
- [ ] Error-state fallback navigation buttons (e.g., "Go Back" on error) are kept — these are not back links, they are recovery actions
- [ ] No `navigate(-1)` calls remain in any page component (except error recovery)
- [ ] Verify changes work in browser: no duplicate navigation controls, breadcrumb is the sole hierarchical nav
- [ ] Typecheck passes

## Non-Goals

- No breadcrumb on authentication pages (login, register, forgot/reset password) — these use `AuthLayout`, not `AppLayout`
- No breadcrumb animation or transitions (keep it simple and fast)
- No breadcrumb persistence or history tracking — it's purely derived from the current URL
- No mobile hamburger/collapsible breadcrumb — just responsive text truncation
- No changes to the route structure or URL patterns

## Technical Considerations

- The `useBreadcrumbs` hook should be pure (derive from URL + overrides, no side effects) so it's easy to test
- Existing UI components follow the shadcn/ui pattern (forwardRef, `cn`, variants) — the Breadcrumb component should match
- `lucide-react` is already installed and provides `ChevronRight`
- Pages already fetch hackathon/team data via TanStack Query — the override names come from data that's already loaded, no extra API calls needed
- The `hackathons` segment is an implementation detail of the URL structure and should not appear in the breadcrumb to keep it concise
