# Project Status

**Last Updated:** 2026-01-26

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
├── Links:
│   ├── demoUrl, videoUrl
│   ├── repositoryUrl, presentationUrl
│   └── thumbnailUrl
├── technologies: string[]
└── submittedAt: timestamp
```

**ProjectStatus Flow:**
```
draft → submitted → under_review → accepted
                               ↘ rejected
```

---

## Implemented Features

### Backend (Spring Boot + Kotlin)

#### Authentication
- [x] User registration with email/password
- [x] User login with JWT tokens
- [x] Access token + refresh token flow
- [x] Protected endpoints with JWT validation

#### Hackathons
- [x] Create hackathon (returns organizer role)
- [x] Update hackathon (organizers only)
- [x] Get hackathon by ID or slug
- [x] List all hackathons
- [x] List user's draft hackathons
- [x] Register for hackathon (creates participant role)
- [x] Unregister from hackathon
- [x] Organizers can participate without separate registration

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
- [x] List projects by hackathon
- [x] Submit project (changes status to submitted)
- [x] Unsubmit project (reverts to draft)

### Frontend (React + TypeScript + Vite)

#### Authentication
- [x] Login page with form validation
- [x] Registration page with form validation
- [x] Protected routes requiring authentication
- [x] Auth context with token management
- [x] Automatic token refresh

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
- [x] Technologies tags display
- [x] Links to demo, video, repository, presentation

#### UI Components
- [x] Responsive layout with navigation
- [x] Card components for hackathons, teams, projects
- [x] Modal dialogs for forms
- [x] Form inputs with validation
- [x] Loading states
- [x] Error handling and display

---

## Application Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | User login |
| `/register` | RegisterPage | User registration |
| `/` | DashboardPage | Main dashboard with hackathon lists |
| `/hackathons/new` | CreateHackathonPage | Create new hackathon |
| `/hackathons/:slug` | HackathonDetailPage | View/edit hackathon details |
| `/hackathons/:slug/teams` | TeamsListPage | List teams in hackathon |
| `/hackathons/:slug/teams/:teamId` | TeamDetailPage | Team details with project |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Hackathons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hackathons` | List all hackathons |
| GET | `/api/hackathons/my-drafts` | List user's draft hackathons |
| GET | `/api/hackathons/:slug` | Get hackathon by slug |
| GET | `/api/hackathons/id/:id` | Get hackathon by ID |
| POST | `/api/hackathons` | Create hackathon |
| PUT | `/api/hackathons/:id` | Update hackathon |
| POST | `/api/hackathons/:id/register` | Register for hackathon |
| DELETE | `/api/hackathons/:id/register` | Unregister from hackathon |

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
| GET | `/api/projects/hackathon/:hackathonId` | List projects in hackathon |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| POST | `/api/projects/:id/submit` | Submit project |
| POST | `/api/projects/:id/unsubmit` | Unsubmit project |

---

## Future Features Roadmap

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | Schedule & Events | Not started |
| 2 | Announcements | Not started |
| 3 | Judging & Scoring | Not started |
| 4 | Prizes & Winners | Not started |
| 5 | User Profiles | Not started |
| 6 | Team Invitations | Not started |
| 7 | Project Media/Gallery | Not started |
| 8 | Email Notifications | Not started |

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
- React 18
- TypeScript
- Vite
- TanStack Query (React Query)
- React Router
- Tailwind CSS

### Deployment
- Render.com (Docker)
- PostgreSQL on Render
- Static site hosting for frontend
