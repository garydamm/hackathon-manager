# PRD: Backend Code Cleanup and Test Coverage Enhancement

## Introduction

This PRD addresses critical technical debt in the hackathon-manager backend by systematically adding missing test coverage and refactoring code quality issues. The approach prioritizes establishing a comprehensive test safety net before performing any structural refactoring, ensuring all changes can be validated and preventing regression.

The work focuses exclusively on backend (Kotlin/Spring Boot) components, with frontend cleanup deferred to a separate initiative.

## Goals

- **Achieve 80% backend test coverage** across services, controllers, and repositories
- **Test all critical business logic** including password reset workflow, email service, and scheduled tasks
- **Enable repository integration tests** with TestContainers
- **Eliminate magic numbers** by extracting to constants
- **Refactor god objects** (JudgingService) into focused, single-responsibility services
- **Reduce file complexity** to max 300 lines per file and cyclomatic complexity <5 per method
- **Introduce domain exceptions** to decouple business logic from HTTP layer
- **Improve code maintainability** through better naming and extracted utilities

## User Stories

### Phase 1: Critical Test Coverage

#### US-001: Add EmailServiceImpl unit tests
**Description:** As a developer, I need comprehensive tests for email functionality so that password reset emails are validated and regressions are prevented.

**Acceptance Criteria:**
- [x] Create `EmailServiceImplTest.kt` in `src/test/kotlin/com/hackathon/manager/service/`
- [x] Mock Resend API client using Mockito
- [x] Test `sendPasswordResetEmail()` with valid data
- [x] Test `sendPasswordChangeConfirmation()` with valid data
- [x] Test fallback to console mode when Resend is unavailable
- [x] Test error handling when email sending fails
- [x] Verify email content contains correct reset URL and user details
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for EmailServiceImpl >80%

#### US-002: Add UserService password reset workflow tests
**Description:** As a developer, I need tests for the complete password reset workflow so that this critical security feature is properly validated.

**Acceptance Criteria:**
- [x] Add tests to `UserServiceTest.kt` for `requestPasswordReset()`
- [x] Test valid email generates token with 15-minute expiry
- [x] Test non-existent email silently succeeds (security feature)
- [x] Test multiple reset requests invalidate previous tokens
- [x] Add tests for `validateResetToken()`
- [x] Test valid unused token returns successfully
- [x] Test expired token throws ApiException
- [x] Test used token throws ApiException
- [x] Test invalid token throws ApiException
- [x] Add tests for `resetPassword()`
- [x] Test valid token updates password and marks token as used
- [x] Test password validation rules (8 chars minimum)
- [x] Test confirmation email is sent after reset
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for password reset methods 100%

#### US-003: Add ScheduledTasks unit tests
**Description:** As a developer, I need tests for scheduled tasks so that token cleanup job behavior is validated.

**Acceptance Criteria:**
- [x] Create `ScheduledTasksTest.kt` in `src/test/kotlin/com/hackathon/manager/scheduler/`
- [x] Mock PasswordResetTokenRepository
- [x] Test `cleanupExpiredPasswordResetTokens()` deletes expired tokens
- [x] Test no deletion when no expired tokens exist
- [x] Test batch deletion with multiple expired tokens
- [x] Verify correct count is logged
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for ScheduledTasks 100%

#### US-004: Extract magic numbers to constants file
**Description:** As a developer, I want all magic numbers in constants so that security and configuration values are centralized and maintainable.

**Acceptance Criteria:**
- [x] Create `src/main/kotlin/com/hackathon/manager/config/AppConstants.kt`
- [x] Define `SecurityConstants.MIN_PASSWORD_LENGTH = 8`
- [x] Define `SecurityConstants.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 15L`
- [x] Define `SecurityConstants.JWT_KEY_SIZE = 32`
- [x] Replace hardcoded `8` in UserService.kt:126 with constant
- [x] Replace hardcoded `15` in UserService.kt:73 with constant
- [x] Replace hardcoded `32` in JwtTokenProvider.kt:24 with constant
- [x] Update UserServiceTest to reference new constants
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Verify application starts successfully

### Phase 2: Controller Test Coverage

#### US-005: Add AnnouncementController tests
**Description:** As a developer, I need tests for announcement endpoints so that CRUD operations and authorization are validated.

**Acceptance Criteria:**
- [x] Create `AnnouncementControllerTest.kt` in `src/test/kotlin/com/hackathon/manager/controller/`
- [x] Test `GET /api/announcements/hackathon/{id}` returns announcements
- [x] Test `GET /api/announcements/{id}` returns single announcement
- [x] Test `POST /api/announcements` creates announcement (organizer only)
- [x] Test `POST` returns 403 when non-organizer attempts creation
- [x] Test `PUT /api/announcements/{id}` updates announcement (organizer only)
- [x] Test `PUT` returns 403 when non-organizer attempts update
- [x] Test `DELETE /api/announcements/{id}` deletes announcement (organizer only)
- [x] Test `DELETE` returns 403 when non-organizer attempts deletion
- [x] Test 404 responses for non-existent announcements
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for AnnouncementController >80%

#### US-006: Add ScheduleController tests
**Description:** As a developer, I need tests for schedule endpoints so that RSVP and attendance tracking are validated.

**Acceptance Criteria:**
- [x] Create `ScheduleControllerTest.kt` in `src/test/kotlin/com/hackathon/manager/controller/`
- [x] Test `GET /api/schedule/hackathons/{id}` returns events with RSVP counts
- [x] Test `POST /api/schedule/hackathons/{id}/events` creates event (organizer only)
- [x] Test `POST` returns 403 for non-organizer
- [x] Test `PUT /api/schedule/events/{id}` updates event (organizer only)
- [x] Test `DELETE /api/schedule/events/{id}` deletes event (organizer only)
- [x] Test `POST /api/schedule/events/{id}/rsvp` creates RSVP
- [x] Test `PUT /api/schedule/events/{id}/rsvp` updates RSVP status
- [x] Test `DELETE /api/schedule/events/{id}/rsvp` removes RSVP
- [x] Test `POST /api/schedule/events/{id}/attendance` marks attendance (organizer only)
- [x] Test bulk attendance marking endpoint
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for ScheduleController >80%

#### US-007: Add JudgingController tests
**Description:** As a developer, I need tests for judging endpoints so that scoring workflow and authorization are validated.

**Acceptance Criteria:**
- [x] Create `JudgingControllerTest.kt` in `src/test/kotlin/com/hackathon/manager/controller/`
- [x] Test `GET /api/judging/hackathons/{id}/criteria` returns criteria
- [x] Test `POST /api/judging/hackathons/{id}/criteria` creates criteria (organizer only)
- [x] Test `POST` returns 403 for non-organizer
- [x] Test `PUT /api/judging/criteria/{id}` updates criteria (organizer only)
- [x] Test `DELETE /api/judging/criteria/{id}` deletes criteria (organizer only)
- [x] Test `GET /api/judging/hackathons/{id}/judges` returns judges list
- [x] Test `POST /api/judging/hackathons/{id}/judges` adds judge (organizer only)
- [x] Test `DELETE /api/judging/judges/{id}` removes judge (organizer only)
- [x] Test `GET /api/judging/hackathons/{id}/assignments` returns judge's assignments
- [x] Test `POST /api/judging/assignments/{id}/scores` submits scores (judge only)
- [x] Test `GET /api/judging/hackathons/{id}/leaderboard` returns rankings
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for JudgingController >80%

#### US-008: Add HealthController tests
**Description:** As a developer, I need a smoke test for the health endpoint so that deployment readiness is validated.

**Acceptance Criteria:**
- [x] Create `HealthControllerTest.kt` in `src/test/kotlin/com/hackathon/manager/controller/`
- [x] Test `GET /api/health` returns 200 OK
- [x] Test response contains expected health status JSON
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage for HealthController 100%

### Phase 3: Repository Test Coverage

#### US-009: Enable TestContainers in repository tests
**Description:** As a developer, I need TestContainers configuration enabled so that repository integration tests can run.

**Acceptance Criteria:**
- [x] Remove `@Disabled` annotations from HackathonRepositoryTest.kt
- [x] Remove `@Disabled` annotations from TeamRepositoryTest.kt
- [x] Remove `@Disabled` annotations from UserRepositoryTest.kt
- [x] Verify TestContainers PostgreSQL starts correctly
- [x] Run all three existing repository tests successfully
- [x] Document TestContainers setup in README if not already present
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-010: Add PasswordResetTokenRepository tests
**Description:** As a developer, I need tests for password reset token repository so that token queries and deletions are validated.

**Acceptance Criteria:**
- [x] Create `PasswordResetTokenRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByToken()` returns token when exists
- [x] Test `findByToken()` returns empty when token doesn't exist
- [x] Test `findByUserId()` returns all tokens for user
- [x] Test `deleteByExpiresAtBefore()` deletes only expired tokens
- [x] Test token creation and persistence
- [x] Test cascade deletion when user is deleted
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-011: Add ProjectRepository tests
**Description:** As a developer, I need tests for project repository so that project queries are validated.

**Acceptance Criteria:**
- [x] Create `ProjectRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByTeamId()` returns project for team
- [x] Test `findByHackathonId()` returns all projects for hackathon
- [x] Test `findByHackathonIdAndStatus()` filters by status correctly
- [x] Test project creation with team and hackathon relationships
- [x] Test cascade deletion behavior
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-012: Add ScheduleEventRepository tests
**Description:** As a developer, I need tests for schedule event repository so that event queries are validated.

**Acceptance Criteria:**
- [x] Create `ScheduleEventRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByHackathonIdOrderByStartTime()` returns sorted events
- [x] Test event creation with hackathon relationship
- [x] Test date/time storage and retrieval accuracy
- [x] Test cascade deletion when hackathon is deleted
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-013: Add EventAttendeeRepository tests
**Description:** As a developer, I need tests for event attendee repository so that RSVP queries are validated.

**Acceptance Criteria:**
- [x] Create `EventAttendeeRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByEventId()` returns all attendees for event
- [x] Test `findByEventIdAndUserId()` returns specific RSVP
- [x] Test `countByEventIdAndRsvpStatus()` counts RSVPs by status correctly
- [x] Test RSVP creation with event and user relationships
- [x] Test attendance marking updates hasAttended flag
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-014: Add JudgingCriteriaRepository tests
**Description:** As a developer, I need tests for judging criteria repository so that criteria queries are validated.

**Acceptance Criteria:**
- [x] Create `JudgingCriteriaRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByHackathonIdOrderByDisplayOrder()` returns sorted criteria
- [x] Test criteria creation with hackathon relationship
- [x] Test display order sorting accuracy
- [x] Test cascade deletion when hackathon is deleted
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-015: Add ScoreRepository tests
**Description:** As a developer, I need tests for score repository so that scoring queries are validated.

**Acceptance Criteria:**
- [x] Create `ScoreRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByJudgeAssignmentId()` returns scores for assignment
- [x] Test `findByJudgeAssignmentIdAndCriteriaId()` returns specific score
- [x] Test score creation with assignment and criteria relationships
- [x] Test score value constraints (min/max)
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

#### US-016: Add JudgeAssignmentRepository tests
**Description:** As a developer, I need tests for judge assignment repository so that assignment queries are validated.

**Acceptance Criteria:**
- [x] Create `JudgeAssignmentRepositoryTest.kt` extending AbstractRepositoryTest
- [x] Test `findByHackathonIdAndJudgeId()` returns judge's assignments
- [x] Test `findByProjectId()` returns all judges for project
- [x] Test assignment creation with hackathon, judge, and project relationships
- [x] Test `isCompleted` flag updates correctly
- [x] Unit tests added for new functionality
- [x] Unit tests pass
- [x] Typecheck passes
- [x] Integration tests pass with TestContainers

### Phase 4: Refactoring with Test Coverage

#### US-017: Extract JudgingCriteriaService from JudgingService
**Description:** As a developer, I want criteria management extracted to a focused service so that JudgingService has a single responsibility.

**Acceptance Criteria:**
- [x] Create `JudgingCriteriaService.kt` with criteria CRUD methods
- [x] Move `createCriteria()`, `updateCriteria()`, `deleteCriteria()`, `getCriteria()` from JudgingService
- [x] Update JudgingController to inject JudgingCriteriaService
- [x] Create `JudgingCriteriaServiceTest.kt` by extracting relevant tests from JudgingServiceTest
- [x] Update JudgingService to use JudgingCriteriaService for criteria access
- [x] All existing tests still pass
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage maintained at >80%

#### US-018: Extract JudgeManagementService from JudgingService
**Description:** As a developer, I want judge management extracted to a focused service so that judge operations are isolated.

**Acceptance Criteria:**
- [x] Create `JudgeManagementService.kt` with judge operations
- [x] Move `addJudge()`, `removeJudge()`, `getJudges()` from JudgingService
- [x] Update JudgingController to inject JudgeManagementService
- [x] Create `JudgeManagementServiceTest.kt` by extracting relevant tests
- [x] Update JudgingService to use JudgeManagementService for judge checks
- [x] All existing tests still pass
- [x] Unit tests pass
- [x] Typecheck passes
- [x] JaCoCo coverage maintained at >80%

#### US-019: Extract ScoringService from JudgingService
**Description:** As a developer, I want score submission extracted to a focused service so that scoring logic is isolated.

**Acceptance Criteria:**
- [ ] Create `ScoringService.kt` with scoring operations
- [ ] Move `submitScores()`, `getAssignmentsByJudge()`, `getAssignmentById()` from JudgingService
- [ ] Update JudgingController to inject ScoringService
- [ ] Create `ScoringServiceTest.kt` by extracting relevant tests
- [ ] All existing tests still pass
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] JaCoCo coverage maintained at >80%

#### US-020: Extract LeaderboardService from JudgingService
**Description:** As a developer, I want leaderboard calculation extracted to a focused service so that ranking logic is isolated.

**Acceptance Criteria:**
- [ ] Create `LeaderboardService.kt` with leaderboard calculation
- [ ] Move `getLeaderboard()` from JudgingService
- [ ] Extract complex calculation logic (lines 371-408) into private helper methods
- [ ] Update JudgingController to inject LeaderboardService
- [ ] Create `LeaderboardServiceTest.kt` by extracting relevant tests
- [ ] All existing tests still pass
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] JaCoCo coverage maintained at >80%
- [ ] JudgingService.kt now <150 lines (reduced from 431)

#### US-021: Extract domain exceptions from ApiException
**Description:** As a developer, I want domain exceptions decoupled from HTTP layer so that business logic doesn't depend on web concerns.

**Acceptance Criteria:**
- [ ] Create `src/main/kotlin/com/hackathon/manager/exception/DomainExceptions.kt`
- [ ] Define sealed class `DomainException` with subtypes: NotFound, Unauthorized, ValidationError, Conflict
- [ ] Update GlobalExceptionHandler to map domain exceptions to HTTP responses
- [ ] Replace ApiException in HackathonService with domain exceptions
- [ ] Replace ApiException in TeamService with domain exceptions
- [ ] Replace ApiException in ProjectService with domain exceptions
- [ ] Update all service tests to expect domain exceptions
- [ ] All existing tests still pass
- [ ] Unit tests pass
- [ ] Typecheck passes

#### US-022: Refactor complex methods in ScoringService
**Description:** As a developer, I want complex scoring methods simplified so that cyclomatic complexity is <5.

**Acceptance Criteria:**
- [ ] Extract validation logic from `submitScores()` into `validateScoreRequests()` private method
- [ ] Extract criteria mapping from `submitScores()` into `mapCriteriaIds()` private method
- [ ] Extract assignment completion check into `checkAssignmentCompletion()` private method
- [ ] Cyclomatic complexity of `submitScores()` reduced to <5
- [ ] Add unit tests for extracted helper methods
- [ ] All existing tests still pass
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] JaCoCo coverage maintained at >80%

#### US-023: Extract repeated .let{} update patterns to utility
**Description:** As a developer, I want optional field updates centralized so that update logic is DRY.

**Acceptance Criteria:**
- [ ] Create `src/main/kotlin/com/hackathon/manager/util/EntityUpdateUtil.kt`
- [ ] Define `applyIfNotNull<T, R>` extension function
- [ ] Replace `.let` patterns in HackathonService with utility (lines 106-123)
- [ ] Replace `.let` patterns in ProjectService with utility (lines 92-100)
- [ ] Replace `.let` patterns in JudgingCriteriaService with utility
- [ ] Replace `.let` patterns in UserService with utility (lines 43-50)
- [ ] Create `EntityUpdateUtilTest.kt` to test utility
- [ ] All existing tests still pass
- [ ] Unit tests pass
- [ ] Typecheck passes

### Phase 5: Code Quality Improvements

#### US-024: Improve naming conventions in service layer
**Description:** As a developer, I want consistent naming so that code is more readable.

**Acceptance Criteria:**
- [ ] Rename `ex` to `exception` in GlobalExceptionHandler.kt
- [ ] Replace ambiguous `it` with named variables in HackathonService
- [ ] Replace ambiguous `it` with named variables in TeamService
- [ ] Replace ambiguous `it` with named variables in ProjectService
- [ ] Rename `criteria` to `judgingCriteria` in JudgingCriteriaService for clarity
- [ ] All existing tests still pass
- [ ] Unit tests pass
- [ ] Typecheck passes

#### US-025: Add error handling to EmailServiceImpl
**Description:** As a developer, I want robust error handling in email service so that failures are logged and don't crash the system.

**Acceptance Criteria:**
- [ ] Wrap Resend API calls in try-catch blocks
- [ ] Log email sending failures with error details
- [ ] Return success/failure status from `sendEmail()` method
- [ ] Update callers to check email send status
- [ ] Test error handling in EmailServiceImplTest with API failures
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify error handling works in browser during password reset

#### US-026: Document architectural decisions and patterns
**Description:** As a developer, I want cleanup decisions documented so that future developers understand the architecture.

**Acceptance Criteria:**
- [ ] Create `docs/ARCHITECTURE.md` documenting service layer organization
- [ ] Document domain exception pattern and usage
- [ ] Document test coverage standards (80% minimum)
- [ ] Document file size limits (300 lines) and complexity limits (complexity <5)
- [ ] Document when to use TestContainers vs mocked tests
- [ ] Add section on constants management
- [ ] Typecheck passes

## Non-Goals

- **Frontend cleanup** - Deferred to separate PRD (React components, TypeScript, E2E tests)
- **Frontend test coverage** - No changes to Playwright tests or addition of Vitest
- **Database schema changes** - No migrations or entity modifications
- **New features** - This PRD only addresses existing code quality
- **Performance optimization** - Not in scope unless impacting tests
- **API changes** - No modifications to endpoint signatures or behavior
- **Security improvements** - Beyond what's needed for password reset testing
- **Documentation beyond architecture** - No user-facing docs, API docs, or deployment guides

## Technical Considerations

### Test Infrastructure
- **TestContainers** already configured in `AbstractRepositoryTest.kt`
- Repository tests currently disabled but functional
- JaCoCo configured with 70% target (will increase to 80%)

### Existing Patterns to Follow
- Service tests use Mockito for mocking dependencies
- Controller tests use MockMvc for HTTP layer validation
- Repository tests extend AbstractRepositoryTest for TestContainers setup

### Dependencies
- All refactoring depends on having tests in place first
- Phase 4 cannot begin until Phase 1-3 complete (conservative approach)
- Service extraction must maintain existing controller contracts

### Constraints
- Cannot modify public API contracts (breaking changes)
- Must maintain backward compatibility with existing data
- All changes must pass existing CI/CD pipeline
- Spring Boot version and dependencies remain unchanged

## Success Metrics

1. **Test Coverage:** Backend coverage reaches 80% (measured by JaCoCo)
2. **Critical Component Coverage:** All services, controllers, repositories, and schedulers have test coverage
3. **File Complexity:** No files exceed 300 lines
4. **Method Complexity:** No methods exceed cyclomatic complexity of 5
5. **God Objects Eliminated:** JudgingService split into 4 focused services
6. **Magic Numbers Removed:** All configuration values in constants
7. **CI/CD Green:** All tests pass, typecheck passes, build succeeds

## Completion Checklist

- [ ] All 26 user stories completed
- [ ] JaCoCo report shows ≥80% backend coverage
- [ ] Zero files exceed 300 lines
- [ ] Zero methods exceed complexity 5
- [ ] All tests passing in CI/CD
- [ ] Architecture documentation in place
- [ ] Code review completed for all refactoring
