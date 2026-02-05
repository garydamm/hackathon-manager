# Project Status

**Last Updated:** 2026-02-04

## 📊 Project Summary

**Status:** 🟢 Production Ready

### Recent Additions (Since 2026-01-27)
- ✅ **Hackathon Archiving** - Archive/unarchive hackathons with UI and full workflow
- ✅ **Project Archiving** - Archive projects and allow teams to create new ones
- ✅ **Password Reset** - Complete forgot password and reset password flow
- ✅ **Session Management** - Multi-session tracking with UI to view and revoke sessions
- ✅ **Organizer Management** - Promote/demote organizers with complete UI
- ✅ **Schedule & Events** - Full event scheduling system with RSVP and attendance tracking
- ✅ **E2E Test Suite** - Comprehensive Playwright tests covering all major workflows

### Architecture Health
- **Database:** 6 Flyway migrations applied successfully
- **Backend:** Spring Boot 3.2 + Kotlin with comprehensive REST API
- **Frontend:** React 19 + TypeScript with modern tooling (Vite, TanStack Query, Tailwind v4)
- **Testing:** 18+ E2E tests covering authentication, hackathons, teams, and projects
- **Security:** JWT authentication, session management, password reset tokens

### Key Metrics
- **Core Entities:** 8 (User, Hackathon, Team, Project, Judge Assignments, Scores, Schedule Events, Announcements)
- **API Endpoints:** 60+ RESTful endpoints
- **Frontend Pages:** 14 routes with protected authentication
- **Test Coverage:** High coverage with E2E tests for all critical user journeys

---

## Object Model & Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐         ┌───────────────┐         ┌──────────────┐
│   User   │────────▶│ HackathonUser │◀────────│  Hackathon   │
└──────────┘   1:N   └───────────────┘   N:1   └──────────────┘
     │                    (role)                      │
     │                                                │
     │         ┌──────────────┐                       │
     └────────▶│  TeamMember  │◀──────────┐          │
         1:N   └──────────────┘           │          │
                  (isLeader)              │          │
                      │                   │          │
                      ▼                   │          │
                 ┌────────┐               │          │
                 │  Team  │───────────────┘          │
                 └────────┘         N:1              │
                      │                              │
                      │ 1:1                          │
                      ▼                              │
                 ┌─────────┐                         │
                 │ Project │◀────────────────────────┘
                 └─────────┘              N:1
```

### Core Objects

#### User
The authenticated user account.
```
User
├── id: UUID
├── email: string (unique)
├── firstName, lastName, displayName
├── avatarUrl, bio, skills[]
├── githubUrl, linkedinUrl, portfolioUrl
└── Relationships:
    ├── hackathonRoles: HackathonUser[] (participations in hackathons)
    └── teamMemberships: TeamMember[] (teams user belongs to)
```

#### Hackathon
The main event container.
```
Hackathon
├── id: UUID
├── name, slug (unique), description, rules
├── status: HackathonStatus
├── archived: boolean (V4 migration)
├── bannerUrl, logoUrl
├── location, isVirtual, timezone
├── Dates:
│   ├── registrationOpensAt, registrationClosesAt
│   ├── startsAt, endsAt
│   └── judgingStartsAt, judgingEndsAt
├── Settings:
│   ├── minTeamSize, maxTeamSize
│   └── maxParticipants
├── createdBy: User (organizer who created it)
└── Relationships:
    ├── participants: HackathonUser[] (all users with roles)
    ├── teams: Team[]
    └── projects: Project[]
```

**HackathonStatus Flow:**
```
draft → registration_open → registration_closed → in_progress → judging → completed
                                                                      ↘ cancelled
```

#### HackathonUser (Join Table)
Links users to hackathons with their role.
```
HackathonUser
├── id: UUID
├── hackathon: Hackathon
├── user: User
├── role: UserRole (participant | organizer | judge | admin)
├── registeredAt: timestamp
└── checkedInAt: timestamp (for in-person events)
```

**UserRole:**
- `organizer` - Can edit hackathon, manage teams, view all submissions
- `admin` - Same as organizer (future: platform-wide admin)
- `judge` - Can score projects during judging phase
- `participant` - Registered attendee, can join/create teams

#### Team
A group of participants working together.
```
Team
├── id: UUID
├── hackathon: Hackathon
├── name (unique per hackathon)
├── description, avatarUrl
├── inviteCode: string (for joining)
├── isOpen: boolean (accepting new members)
├── createdBy: User
└── Relationships:
    ├── members: TeamMember[]
    └── project: Project (1:1)
```

#### TeamMember (Join Table)
Links users to teams.
```
TeamMember
├── id: UUID
├── team: Team
├── user: User
├── isLeader: boolean
└── joinedAt: timestamp
```

#### Project
The team's submission/hack.
```
Project
├── id: UUID
├── team: Team (1:1)
├── hackathon: Hackathon
├── name, tagline, description
├── status: ProjectStatus
├── archivedAt: timestamp (V5 migration - NULL for active projects)
├── Links:
│   ├── demoUrl, videoUrl
│   ├── repositoryUrl, presentationUrl
│   └── thumbnailUrl
├── technologies: string[]
└── submittedAt: timestamp
```

**Note (V6 migration):** Unique constraint modified to allow teams to create new projects after archiving old ones using a partial unique index that only applies to non-archived projects.

**ProjectStatus Flow:**
```
draft → submitted → under_review → accepted
                               ↘ rejected
```

---

## Implemented Features

### Backend (Spring Boot + Kotlin)

#### Authentication & Session Management
- [x] User registration with email/password
- [x] User login with JWT tokens
- [x] Access token + refresh token flow
- [x] Protected endpoints with JWT validation
- [x] Password reset flow (V2 migration - password_reset_tokens table)
- [x] Session management (V3 migration - user_sessions table)
- [x] Multiple active session tracking
- [x] Session invalidation/logout

#### Hackathons
- [x] Create hackathon (returns organizer role)
- [x] Update hackathon (organizers only)
- [x] Get hackathon by ID or slug
- [x] List all hackathons (excludes archived)
- [x] List user's draft hackathons
- [x] Register for hackathon (creates participant role)
- [x] Unregister from hackathon
- [x] Organizers can participate without separate registration
- [x] Archive hackathon (organizers only - V4 migration)
- [x] Unarchive hackathon (organizers only)
- [x] Get hackathon organizers
- [x] Get hackathon participants
- [x] Promote participant to organizer (organizers only)
- [x] Demote organizer (organizers only)

#### Teams
- [x] Create team (must be registered for hackathon)
- [x] Update team (team leader only)
- [x] Get team by ID
- [x] List teams by hackathon
- [x] Get user's team in a hackathon
- [x] Join team by invite code
- [x] Join open team directly
- [x] Leave team (leadership transfers if leader leaves)
- [x] Regenerate invite code (team leader only)

#### Projects
- [x] Create project for team
- [x] Update project
- [x] Get project by ID or team
- [x] List projects by hackathon (excludes archived)
- [x] List submitted projects by hackathon
- [x] Submit project (changes status to submitted)
- [x] Unsubmit project (reverts to draft)
- [x] Archive project (V5 & V6 migrations - allows teams to create new projects after archiving)

#### Schedule & Events
- [x] Create schedule event (organizers only)
- [x] Update schedule event (organizers only)
- [x] Delete schedule event (organizers only)
- [x] Get schedule event by ID
- [x] List schedule events by hackathon (includes user RSVP status)
- [x] RSVP to event (attending/maybe/not_attending)
- [x] Update RSVP
- [x] Remove RSVP
- [x] Get event attendees (organizers only)
- [x] Mark attendance (organizers only)
- [x] Bulk mark attendance (organizers only)

#### Announcements
- [x] Create announcement (organizers only)
- [x] Update announcement (organizers only)
- [x] Delete announcement (organizers only)
- [x] Get announcement by ID
- [x] List announcements by hackathon

### Frontend (React + TypeScript + Vite)

#### Authentication & Session Management
- [x] Login page with form validation
- [x] Registration page with form validation
- [x] Forgot password page
- [x] Reset password page
- [x] Protected routes requiring authentication
- [x] Auth context with token management
- [x] Automatic token refresh
- [x] Session management page
- [x] View active sessions
- [x] Revoke sessions
- [x] Session expired banner
- [x] Session timeout notification

#### Dashboard
- [x] Categorized hackathon display:
  - Your Drafts (for organizers)
  - Open for Registration
  - Happening Now
  - Coming Soon
  - Recently Completed
- [x] Hackathon cards with status badges
- [x] Quick navigation to hackathon details

#### Hackathon Management
- [x] Create hackathon form with validation
- [x] Hackathon detail page with all information
- [x] Edit hackathon (organizers only)
- [x] Register/unregister for hackathon
- [x] Registration status display
- [x] Participant count display
- [x] Archive/unarchive hackathon modal (organizers only)
- [x] View hackathon organizers
- [x] View hackathon participants (authenticated users)
- [x] Promote participant to organizer (organizers only)
- [x] Demote organizer (organizers only)

#### Team Management
- [x] Teams list page for each hackathon
- [x] Team cards showing member count and open status
- [x] Create team modal
- [x] Join team by invite code modal
- [x] Join open teams directly
- [x] Team detail page with member list
- [x] Edit team modal (leader only)
- [x] Leave team functionality
- [x] Invite code display and regeneration

#### Project Management
- [x] Project cards on team pages
- [x] Create project form
- [x] Edit project form
- [x] Project detail modal
- [x] Submit/unsubmit project
- [x] Archive project (team leaders/organizers)
- [x] Create new project after archiving
- [x] Technologies tags display
- [x] Links to demo, video, repository, presentation

#### Schedule & Events
- [x] Schedule page for each hackathon
- [x] Calendar view of events by day
- [x] Event cards with details
- [x] Create event form (organizers only)
- [x] Edit event form (organizers only)
- [x] Delete event confirmation (organizers only)
- [x] RSVP buttons (attending/maybe/not attending)
- [x] RSVP status display
- [x] View event attendees (organizers)
- [x] Mark attendance (organizers)
- [x] Bulk mark attendance (organizers)
- [x] Event type filtering (workshop, presentation, meal, etc.)

#### UI Components
- [x] Responsive layout with navigation
- [x] Card components for hackathons, teams, projects
- [x] Modal dialogs for forms
- [x] Form inputs with validation
- [x] Loading states
- [x] Error handling and display

#### Judging & Scoring
- [x] Judging criteria management (organizers)
  - Create, update, delete criteria with name, description, max score, weight
  - Criteria list section on hackathon detail page
- [x] Judge management (organizers)
  - Add judges by email lookup
  - Remove judges with confirmation
  - View judge list with scoring progress (X of Y projects scored)
- [x] Judge dashboard
  - View all assigned projects with scoring status
  - Overall progress tracking
- [x] Project scoring form
  - Score each criteria (0 to max score)
  - Optional feedback per criteria
  - Auto-save and completion tracking
- [x] Leaderboard (organizers)
  - Ranked table with project scores
  - Expandable rows showing per-criteria averages
  - Sortable by rank or score
- [x] Results view (participants)
  - View final rankings when hackathon is completed
  - Highlight own team's placement
  - Congratulations for top 3 winners

---

## Application Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | User login |
| `/register` | RegisterPage | User registration |
| `/forgot-password` | ForgotPasswordPage | Request password reset |
| `/reset-password` | ResetPasswordPage | Reset password with token |
| `/` | DashboardPage | Main dashboard with hackathon lists |
| `/hackathons/new` | CreateHackathonPage | Create new hackathon |
| `/hackathons/:slug` | HackathonDetailPage | View/edit hackathon details |
| `/hackathons/:slug/schedule` | SchedulePage | View and manage event schedule |
| `/hackathons/:slug/teams` | TeamsListPage | List teams in hackathon |
| `/hackathons/:slug/teams/:teamId` | TeamDetailPage | Team details with project |
| `/hackathons/:slug/judge` | JudgeDashboardPage | Judge dashboard with project assignments |
| `/hackathons/:slug/judge/:projectId` | ProjectScoringPage | Score a project on all criteria |
| `/settings/sessions` | SessionManagementPage | Manage active login sessions |

---

## API Endpoints

### Authentication & Session Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/sessions` | Get all active sessions for user |
| DELETE | `/api/auth/sessions/:sessionId` | Revoke specific session |
| POST | `/api/auth/logout` | Logout and invalidate current session |

### Hackathons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hackathons` | List all hackathons (excludes archived) |
| GET | `/api/hackathons/my-drafts` | List user's draft hackathons |
| GET | `/api/hackathons/:slug` | Get hackathon by slug |
| GET | `/api/hackathons/id/:id` | Get hackathon by ID |
| POST | `/api/hackathons` | Create hackathon |
| PUT | `/api/hackathons/:id` | Update hackathon |
| POST | `/api/hackathons/:id/register` | Register for hackathon |
| DELETE | `/api/hackathons/:id/register` | Unregister from hackathon |
| POST | `/api/hackathons/:id/archive` | Archive hackathon (organizers only) |
| POST | `/api/hackathons/:id/unarchive` | Unarchive hackathon (organizers only) |
| GET | `/api/hackathons/:id/organizers` | Get hackathon organizers |
| GET | `/api/hackathons/:id/participants` | Get hackathon participants |
| POST | `/api/hackathons/:id/organizers` | Promote participant to organizer |
| DELETE | `/api/hackathons/:id/organizers/:userId` | Demote organizer |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams/:id` | Get team by ID |
| GET | `/api/teams/hackathon/:hackathonId` | List teams in hackathon |
| GET | `/api/teams/hackathon/:hackathonId/my-team` | Get user's team |
| POST | `/api/teams` | Create team |
| PUT | `/api/teams/:id` | Update team |
| POST | `/api/teams/join` | Join team by invite code |
| POST | `/api/teams/:id/join` | Join open team |
| POST | `/api/teams/:id/leave` | Leave team |
| POST | `/api/teams/:id/regenerate-invite` | Regenerate invite code |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id` | Get project by ID |
| GET | `/api/projects/team/:teamId` | Get project by team |
| GET | `/api/projects/hackathon/:hackathonId` | List projects in hackathon (excludes archived) |
| GET | `/api/projects/hackathon/:hackathonId/submitted` | List submitted projects in hackathon |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| POST | `/api/projects/:id/submit` | Submit project |
| POST | `/api/projects/:id/unsubmit` | Unsubmit project |
| POST | `/api/projects/:id/archive` | Archive project (allows team to create new project) |

### Schedule & Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule/hackathon/:hackathonId` | List schedule events (includes user RSVP status) |
| GET | `/api/schedule/:id` | Get schedule event by ID |
| POST | `/api/schedule` | Create schedule event (organizers only) |
| PUT | `/api/schedule/:id` | Update schedule event (organizers only) |
| DELETE | `/api/schedule/:id` | Delete schedule event (organizers only) |
| POST | `/api/schedule/:eventId/rsvp` | RSVP to event |
| PUT | `/api/schedule/:eventId/rsvp` | Update RSVP |
| DELETE | `/api/schedule/:eventId/rsvp` | Remove RSVP |
| GET | `/api/schedule/:eventId/attendees` | Get event attendees (organizers only) |
| POST | `/api/schedule/:eventId/attendance` | Mark attendance (organizers only) |
| POST | `/api/schedule/:eventId/attendance/bulk` | Bulk mark attendance (organizers only) |

### Announcements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/announcements/hackathon/:hackathonId` | List announcements for hackathon |
| GET | `/api/announcements/:id` | Get announcement by ID |
| POST | `/api/announcements` | Create announcement (organizers only) |
| PUT | `/api/announcements/:id` | Update announcement (organizers only) |
| DELETE | `/api/announcements/:id` | Delete announcement (organizers only) |

### Judging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/judging/hackathons/:hackathonId/criteria` | List judging criteria |
| POST | `/api/judging/hackathons/:hackathonId/criteria` | Create criteria (organizer) |
| PUT | `/api/judging/criteria/:criteriaId` | Update criteria (organizer) |
| DELETE | `/api/judging/criteria/:criteriaId` | Delete criteria (organizer) |
| GET | `/api/judging/hackathons/:hackathonId/judges` | List judges (organizer) |
| POST | `/api/judging/hackathons/:hackathonId/judges` | Add judge (organizer) |
| DELETE | `/api/judging/hackathons/:hackathonId/judges/:userId` | Remove judge (organizer) |
| GET | `/api/judging/hackathons/:hackathonId/assignments` | Get judge's project assignments |
| GET | `/api/judging/assignments/:assignmentId` | Get single assignment with scores |
| POST | `/api/judging/assignments/:assignmentId/scores` | Submit scores for assignment |
| GET | `/api/judging/hackathons/:hackathonId/leaderboard` | Get ranked leaderboard |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/by-email` | Get user by email (for judge lookup) |

---

## Completed Features & Future Roadmap

| Priority | Feature | Status | Notes |
|----------|---------|--------|-------|
| 1 | Schedule & Events | ✅ Completed | Full CRUD, RSVP, and attendance tracking |
| 2 | Announcements | 🟡 Backend Complete | Backend API ready, frontend UI pending |
| 3 | Judging & Scoring | ✅ Completed | Complete scoring system with leaderboard |
| 4 | Archive System | ✅ Completed | Hackathons and projects can be archived |
| 5 | Password Reset | ✅ Completed | Forgot password and reset flow |
| 6 | Session Management | ✅ Completed | Multi-session tracking and management |
| 7 | Organizer Management | ✅ Completed | Promote/demote organizers with UI |
| 8 | Prizes & Winners | Not started | Prize entities exist in schema |
| 9 | Google OAuth Login | Not started | "Sign in with Google" option |
| 10 | User Profiles | Not started | Profile page and edit functionality |
| 11 | Team Invitations | Not started | Formal invitation system beyond invite codes |
| 12 | Project Media/Gallery | Not started | ProjectMedia entity exists |
| 13 | Email Notifications | Not started | EmailService exists but not integrated |
| 14 | Announcement Read Receipts | Not started | Schema supports tracking who read announcements |

---

## Database Migrations

### Flyway Migration History
| Version | Description | Key Changes |
|---------|-------------|-------------|
| V1 | Initial schema | All core tables, indexes, and relationships |
| V2 | Password reset tokens | Added `password_reset_tokens` table for password recovery flow |
| V3 | User sessions | Added `user_sessions` table for multi-session tracking |
| V4 | Hackathon archiving | Added `archived` boolean column to `hackathons` table |
| V5 | Project archiving | Added `archived_at` timestamp column to `projects` table |
| V6 | Project unique constraint fix | Modified constraint to allow new projects after archiving (partial unique index) |

---

## E2E Test Coverage (Playwright)

### Authentication & Session Management
- [x] `auth.spec.ts` - User registration and login flows
- [x] `session-system.spec.ts` - Session timeout and refresh
- [x] `session-management.spec.ts` - Multi-session management UI

### Hackathon Management
- [x] `hackathon-detail.spec.ts` - View and edit hackathon details
- [x] `hackathon-archive.spec.ts` - Archive and unarchive workflow
- [x] `organizer-management.spec.ts` - Promote and demote organizers

### Team Management
- [x] `create-team.spec.ts` - Create team workflow
- [x] `teams-list.spec.ts` - Teams listing and filtering
- [x] `team-detail.spec.ts` - Team detail page and actions
- [x] `hackathon-detail-teams-section.spec.ts` - Teams section in hackathon detail
- [x] `join-team-invite-code.spec.ts` - Join team with invite code
- [x] `edit-team.spec.ts` - Edit team details
- [x] `leave-team.spec.ts` - Leave team workflow

### Project Management
- [x] `project-archive.spec.ts` - Project archive and create new project workflow

### UI & Navigation
- [x] `navigation.spec.ts` - Core navigation flows
- [x] `participant-display-workflow.spec.ts` - Participant views and interactions

---

## Tech Stack

### Backend
- Kotlin 1.9
- Spring Boot 3.2
- Spring Security with JWT
- Spring Data JPA
- PostgreSQL
- Flyway migrations

### Frontend
- React 19
- TypeScript
- Vite
- TanStack Query (React Query)
- React Router v7
- Tailwind CSS v4
- Framer Motion (animations)
- Radix UI (accessible components)
- React Hook Form + Zod (form validation)

### Testing
- Playwright (E2E tests)
- Vitest (unit tests)
- Testing Library (React component tests)

### Deployment
- Render.com (Docker)
- PostgreSQL on Render
- Static site hosting for frontend
