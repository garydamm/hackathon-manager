# PRD: Judging and Scoring System

## Introduction

Add a complete judging and scoring system that allows organizers to define judging criteria, assign judges to hackathons, and enable judges to score all submitted projects. Participants can view results after the hackathon is completed.

## Goals

- Allow organizers to define weighted judging criteria for each hackathon
- Enable organizers to assign/remove judges at the hackathon level
- Provide judges with a clear workflow to score all submitted projects
- Show organizers an aggregated leaderboard with all scores
- Display final results to participants after hackathon completion

## User Stories

### US-001: Create JudgingService for criteria management
**Description:** As a developer, I need backend service methods to manage judging criteria so the API can support CRUD operations.

**Acceptance Criteria:**
- [x] Create `JudgingService` class with dependency injection for repositories
- [x] Implement `getCriteriaByHackathon(hackathonId)` returning list ordered by displayOrder
- [x] Implement `createCriteria(hackathonId, request)` with validation (organizer only)
- [x] Implement `updateCriteria(criteriaId, request)` with validation
- [x] Implement `deleteCriteria(criteriaId)` with validation
- [x] Add `CreateJudgingCriteriaRequest` and `UpdateJudgingCriteriaRequest` DTOs to JudgingDtos.kt
- [x] Typecheck passes
- [x] Tests pass

### US-002: Create JudgingController for criteria endpoints
**Description:** As an organizer, I want API endpoints to manage judging criteria so I can configure how projects are evaluated.

**Acceptance Criteria:**
- [ ] Create `JudgingController` with base path `/api/judging`
- [ ] `GET /api/judging/hackathons/{hackathonId}/criteria` - list criteria (public)
- [ ] `POST /api/judging/hackathons/{hackathonId}/criteria` - create criteria (organizer only)
- [ ] `PUT /api/judging/criteria/{criteriaId}` - update criteria (organizer only)
- [ ] `DELETE /api/judging/criteria/{criteriaId}` - delete criteria (organizer only)
- [ ] Proper authorization checks using HackathonService.isUserOrganizer
- [ ] Typecheck passes
- [ ] Tests pass

### US-003: Add judge management endpoints
**Description:** As an organizer, I want to assign and remove judges from my hackathon so they can score projects.

**Acceptance Criteria:**
- [ ] `POST /api/judging/hackathons/{hackathonId}/judges` - add judge by userId (organizer only)
- [ ] `DELETE /api/judging/hackathons/{hackathonId}/judges/{userId}` - remove judge (organizer only)
- [ ] `GET /api/judging/hackathons/{hackathonId}/judges` - list judges (organizer only)
- [ ] Adding a judge creates HackathonUser with role=judge (or updates existing role)
- [ ] Removing a judge removes the judge role (deletes HackathonUser or reverts to participant)
- [ ] Return list of judges with their scoring progress (projects scored / total projects)
- [ ] Typecheck passes
- [ ] Tests pass

### US-004: Add scoring endpoints for judges
**Description:** As a judge, I want to submit scores for projects so my evaluations are recorded.

**Acceptance Criteria:**
- [ ] `GET /api/judging/hackathons/{hackathonId}/assignments` - get judge's assigned projects with scoring status
- [ ] `GET /api/judging/assignments/{assignmentId}` - get single assignment with scores
- [ ] `POST /api/judging/assignments/{assignmentId}/scores` - submit/update scores for a project
- [ ] Auto-create JudgeAssignment when judge first accesses a project (or on judge assignment to hackathon)
- [ ] Mark assignment as completed when all criteria are scored
- [ ] Validate score is within 0 to criteria.maxScore
- [ ] Only judges assigned to hackathon can score
- [ ] Typecheck passes
- [ ] Tests pass

### US-005: Add leaderboard and results endpoints
**Description:** As an organizer or participant, I want to see aggregated scores and rankings.

**Acceptance Criteria:**
- [ ] `GET /api/judging/hackathons/{hackathonId}/leaderboard` - get ranked projects with scores
- [ ] Calculate weighted average score per project across all judges and criteria
- [ ] Include: rank, project name, team name, total score, individual criteria averages
- [ ] Organizers can view leaderboard anytime
- [ ] Participants can only view when hackathon status is "completed"
- [ ] Typecheck passes
- [ ] Tests pass

### US-006: Create frontend judging types and API service
**Description:** As a developer, I need TypeScript types and API service for judging features.

**Acceptance Criteria:**
- [ ] Add judging types to `frontend/src/types/index.ts`: JudgingCriteria, JudgeAssignment, Score, JudgeInfo, LeaderboardEntry
- [ ] Create `frontend/src/services/judging.ts` with all API methods
- [ ] Methods: getCriteria, createCriteria, updateCriteria, deleteCriteria
- [ ] Methods: getJudges, addJudge, removeJudge
- [ ] Methods: getMyAssignments, getAssignment, submitScores
- [ ] Methods: getLeaderboard
- [ ] Typecheck passes

### US-007: Create judging criteria management UI
**Description:** As an organizer, I want to manage judging criteria from the hackathon detail page.

**Acceptance Criteria:**
- [ ] Add "Judging Criteria" section to HackathonDetail page (visible to organizers)
- [ ] Display list of criteria with name, description, max score, weight
- [ ] "Add Criteria" button opens modal with form (name, description, maxScore, weight)
- [ ] Each criteria row has edit and delete buttons
- [ ] Edit opens modal with pre-filled form
- [ ] Delete shows confirmation dialog
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-008: Create judge management UI
**Description:** As an organizer, I want to add and remove judges from my hackathon.

**Acceptance Criteria:**
- [ ] Add "Judges" section to HackathonDetail page (visible to organizers)
- [ ] Display list of judges with name, email, scoring progress (X of Y projects scored)
- [ ] "Add Judge" button opens modal to search/select user by email
- [ ] Each judge row has remove button with confirmation
- [ ] Show empty state when no judges assigned
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-009: Create judge dashboard page
**Description:** As a judge, I want to see all projects I need to score and my progress.

**Acceptance Criteria:**
- [ ] Create new route `/hackathons/:slug/judge` for judge dashboard
- [ ] Show list of all submitted projects in the hackathon
- [ ] Each project card shows: name, team name, scoring status (Not Started / In Progress / Completed)
- [ ] Click on project card navigates to scoring page
- [ ] Show overall progress: "X of Y projects scored"
- [ ] Only accessible to users with judge role in this hackathon
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-010: Create project scoring form
**Description:** As a judge, I want to score a project on all criteria with optional feedback.

**Acceptance Criteria:**
- [ ] Create scoring page/modal at `/hackathons/:slug/judge/:projectId`
- [ ] Display project details (name, tagline, description, links)
- [ ] Show form with all judging criteria
- [ ] Each criteria: name, description, score input (0 to maxScore), optional feedback textarea
- [ ] Pre-fill existing scores if previously saved
- [ ] "Save Scores" button submits all scores
- [ ] Show success message and return to judge dashboard
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-011: Create leaderboard view for organizers
**Description:** As an organizer, I want to see a leaderboard of all projects with their scores.

**Acceptance Criteria:**
- [ ] Add "Leaderboard" tab/section to HackathonDetail page (visible to organizers)
- [ ] Display ranked table: Rank, Project Name, Team Name, Total Score
- [ ] Expandable rows show per-criteria average scores
- [ ] Show "Judging in progress" message if not all judges have completed
- [ ] Sortable by rank or score
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-012: Create results view for participants
**Description:** As a participant, I want to see final rankings after the hackathon is completed.

**Acceptance Criteria:**
- [ ] Add "Results" section to HackathonDetail page (visible when status=completed)
- [ ] Display ranked list of projects with scores
- [ ] Highlight user's own team/project
- [ ] Show "Results not yet available" if hackathon not completed
- [ ] Include congratulations message for top 3 projects
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-013: Add judge role navigation
**Description:** As a judge, I want easy access to my judging dashboard from the hackathon page.

**Acceptance Criteria:**
- [ ] Show "Judge Projects" button on HackathonDetail when user has judge role
- [ ] Button navigates to `/hackathons/:slug/judge`
- [ ] Add judge dashboard link to hackathon card on main dashboard (for hackathons where user is judge)
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-014: Update PROJECT_STATUS.md with judging features
**Description:** As a developer, I want the project documentation updated to reflect the new judging features.

**Acceptance Criteria:**
- [ ] Add Judging section to "Implemented Features" in PROJECT_STATUS.md
- [ ] Add judging API endpoints to the API reference table
- [ ] Add new routes to Application Routes table
- [ ] Move "Judging & Scoring" from Future Roadmap to Implemented
- [ ] Typecheck passes

## Non-Goals

- No automatic winner selection or prize assignment (separate feature)
- No judge consensus/calibration tools
- No blind judging (judges can see project details)
- No per-project judge assignment (judges score all projects in hackathon)
- No real-time score updates via WebSocket
- No export functionality for scores (future enhancement)

## Technical Considerations

- Reuse existing entities: JudgingCriteria, JudgeAssignment, Score
- JudgeAssignments should be auto-created for each judge-project pair when needed
- Weighted average calculation: sum(score * weight) / sum(weight) for each judge, then average across judges
- Use HackathonUser.role = "judge" to identify judges for a hackathon
- Leaderboard should handle edge cases: no scores yet, partial scoring, ties
