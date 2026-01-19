# Project Checkpoint

**Date:** 2026-01-18
**Commit:** `1611fd3` - Add README with setup instructions

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
    ├── projects: Project[]
    ├── judgingCriteria: JudgingCriteria[]
    ├── scheduleEvents: ScheduleEvent[]
    ├── announcements: Announcement[]
    ├── prizeTracks: PrizeTrack[]
    └── prizes: Prize[]
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
├── status: SubmissionStatus
├── Links:
│   ├── demoUrl, videoUrl
│   ├── repositoryUrl, presentationUrl
│   └── thumbnailUrl
├── technologies: string[]
├── submittedAt: timestamp
└── Relationships:
    ├── media: ProjectMedia[]
    ├── judgeAssignments: JudgeAssignment[]
    └── prizeWins: PrizeWinner[]
```

**SubmissionStatus Flow:**
```
draft → submitted → under_review → accepted
                               ↘ rejected
```

---

## User Flows & Interface Mapping

### 1. Hackathon Discovery & Registration Flow
```
User browses hackathons (Dashboard)
    │
    ├── Sees "Open for Registration" hackathons
    │
    ▼
User clicks hackathon card → HackathonDetail page
    │
    ├── If status = registration_open AND not registered AND not full:
    │       Show "Register" button
    │
    ▼
User clicks "Register"
    │
    ├── POST /api/hackathons/{id}/register
    │
    ▼
User is now a participant (userRole = "participant")
    │
    └── Can create/join teams
```

### 2. Team Formation Flow (Future)
```
Registered participant on HackathonDetail
    │
    ├── Option A: Create Team
    │       └── POST /api/hackathons/{id}/teams
    │           └── User becomes team leader
    │
    ├── Option B: Join Team (via invite code)
    │       └── POST /api/teams/{inviteCode}/join
    │           └── User becomes team member
    │
    └── Option C: Browse Open Teams
            └── GET /api/hackathons/{id}/teams?isOpen=true
                └── Request to join
```

### 3. Project Submission Flow (Future)
```
Team with members
    │
    ├── Create project draft
    │       └── POST /api/teams/{id}/project
    │
    ├── Edit project details
    │       └── PUT /api/projects/{id}
    │
    └── Submit project (before deadline)
            └── POST /api/projects/{id}/submit
                └── status: draft → submitted
```

### 4. Judging Flow (Future)
```
Hackathon status = "judging"
    │
    ├── Organizer assigns judges to projects
    │       └── POST /api/hackathons/{id}/judge-assignments
    │
    ├── Judges score assigned projects
    │       └── POST /api/judge-assignments/{id}/scores
    │
    └── Organizer finalizes winners
            └── POST /api/prizes/{id}/winners
```

---

## Current State

The hackathon manager application has a working foundation with:

### Backend (Spring Boot + Kotlin)
- User authentication (register/login with JWT)
- Hackathon CRUD operations
- Role-based access (organizer, participant, judge, admin)
- PostgreSQL database with full schema

### Frontend (React + TypeScript)
- Login and registration pages
- Dashboard showing hackathons by category:
  - Your Drafts (for organizers)
  - Open for Registration
  - Happening Now
  - Coming Soon
  - Recently Completed
- Create hackathon form with validation
- Hackathon detail page with view/edit modes
- Role-based UI (edit button only shows for organizers)

### Completed Features
- [x] User registration and login
- [x] JWT authentication
- [x] Create hackathon
- [x] Edit hackathon (organizers only)
- [x] View hackathon details
- [x] Dashboard with categorized hackathons
- [x] Draft hackathons for organizers

---

## Next Feature: User Hackathon Registration

Allow users to sign up (register) for hackathons.

### Requirements
1. **Registration Button** - Show "Register" button on hackathon detail page when:
   - Hackathon status is `registration_open`
   - User is not already registered
   - Hackathon is not full (if max participants set)

2. **Registration Status** - Show registration status:
   - "Registered" badge if user is already registered
   - Participant count and availability

3. **Backend** - The endpoint already exists:
   - `POST /api/hackathons/{id}/register` - registers the current user as a participant

4. **Frontend Updates Needed**:
   - Add Register button to HackathonDetail page
   - Show "Registered" status if user has `participant` role
   - Handle registration errors (already registered, full, closed)
   - Update participant count after successful registration

### Files to Modify
- `frontend/src/pages/HackathonDetail.tsx` - Add registration UI
- `frontend/src/types/index.ts` - May need to add registration-related types

### API Reference
```
POST /api/hackathons/{id}/register
Authorization: Bearer <token>

Response: HackathonResponse with userRole = "participant"

Errors:
- 400: "Registration is not open"
- 400: "Hackathon is full"
- 409: "Already registered for this hackathon"
```

---

## Future Features Roadmap

| Priority | Feature | Objects Involved |
|----------|---------|------------------|
| 1 | Hackathon Registration | HackathonUser |
| 2 | Team Creation | Team, TeamMember |
| 3 | Team Join (invite code) | Team, TeamMember |
| 4 | Project Submission | Project, ProjectMedia |
| 5 | Schedule & Events | ScheduleEvent, EventAttendee |
| 6 | Announcements | Announcement, AnnouncementRead |
| 7 | Judging & Scoring | JudgingCriteria, JudgeAssignment, Score |
| 8 | Prizes & Winners | PrizeTrack, Prize, PrizeWinner |
