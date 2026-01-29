# Backend Architecture Documentation

## Overview

This document outlines the architectural decisions, patterns, and standards for the hackathon-manager backend. The backend is built with Kotlin and Spring Boot, following a clean layered architecture with clear separation of concerns.

## Table of Contents

1. [Service Layer Organization](#service-layer-organization)
2. [Domain Exception Pattern](#domain-exception-pattern)
3. [Test Coverage Standards](#test-coverage-standards)
4. [Code Quality Standards](#code-quality-standards)
5. [Testing Strategies](#testing-strategies)
6. [Constants Management](#constants-management)
7. [Entity Update Patterns](#entity-update-patterns)
8. [Naming Conventions](#naming-conventions)

---

## Service Layer Organization

### Single Responsibility Principle

Services should be focused and handle a single domain concept. Large "god objects" should be decomposed into smaller, focused services.

**Example:** The original `JudgingService` (431 lines) was decomposed into four focused services:

- **JudgingCriteriaService**: Manages criteria CRUD operations (create, update, delete, retrieve)
- **JudgeManagementService**: Handles judge assignment and removal
- **ScoringService**: Manages score submission and assignment retrieval
- **LeaderboardService**: Calculates project rankings and leaderboard data

### Service Dependencies

- Services inject only the repositories and other services they directly need
- Controllers inject all services required for their endpoints
- Use constructor injection for all dependencies (Spring Boot standard)

**Example from JudgingController:**
```kotlin
@RestController
@RequestMapping("/api/judging")
class JudgingController(
    private val judgingCriteriaService: JudgingCriteriaService,
    private val judgeManagementService: JudgeManagementService,
    private val scoringService: ScoringService,
    private val leaderboardService: LeaderboardService
)
```

### Complex Method Decomposition

When a method has high cyclomatic complexity (>5), extract validation, mapping, and calculation logic into private helper methods.

**Example from ScoringService:**
- Original `submitScores()` had complexity ~6
- Refactored into helper methods: `mapCriteriaIds()`, `validateAndSaveScores()`, `validateScoreRange()`, `saveOrUpdateScore()`, `checkAssignmentCompletion()`
- New `submitScores()` has complexity of 1

---

## Domain Exception Pattern

### Motivation

Business logic should not depend on HTTP concerns. Domain exceptions decouple the service layer from the web layer.

### Exception Hierarchy

The codebase uses a sealed class hierarchy for domain exceptions:

```kotlin
sealed class DomainException(message: String) : RuntimeException(message)

class NotFoundException(message: String) : DomainException(message)        // 404
class UnauthorizedException(message: String) : DomainException(message)   // 403
class ValidationException(message: String) : DomainException(message)     // 400
class ConflictException(message: String) : DomainException(message)       // 409
```

### Usage Guidelines

**NotFoundException**: Resource not found
```kotlin
throw NotFoundException("Hackathon with id $id not found")
```

**UnauthorizedException**: User not authorized to perform action
```kotlin
throw UnauthorizedException("Only organizers can create announcements")
```

**ValidationException**: Input validation or business rule violation
```kotlin
throw ValidationException("Team is already full")
```

**ConflictException**: Operation creates conflict (e.g., duplicate resource)
```kotlin
throw ConflictException("User is already a member of this team")
```

### Exception Mapping

The `GlobalExceptionHandler` maps domain exceptions to HTTP responses:

```kotlin
@ExceptionHandler(NotFoundException::class)
fun handleNotFound(exception: NotFoundException): ResponseEntity<ErrorResponse> =
    ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(ErrorResponse(exception.message ?: "Resource not found"))
```

---

## Test Coverage Standards

### Minimum Coverage Requirements

- **Overall backend coverage:** 80% minimum (measured by JaCoCo)
- **Critical components:** Services, controllers, repositories, and schedulers must have test coverage
- **New code:** All new functionality must include tests before marking tasks complete

### Coverage Verification

Run JaCoCo report to verify coverage:
```bash
./gradlew test jacocoTestReport
```

View report at: `build/reports/jacoco/test/html/index.html`

### When to Write Tests

1. **Before refactoring:** Establish comprehensive test coverage before performing structural changes
2. **With new features:** Write tests alongside implementation, not after
3. **For bug fixes:** Add regression tests that reproduce the bug before fixing

---

## Code Quality Standards

### File Size Limits

- **Maximum file size:** 300 lines per file
- **Why:** Large files are hard to understand, navigate, and maintain
- **Solution:** Extract services, utilities, or helper classes when approaching the limit

### Cyclomatic Complexity

- **Maximum complexity:** 5 per method
- **Why:** High complexity makes code hard to understand, test, and maintain
- **Solution:** Extract validation, mapping, and calculation logic into helper methods

### Measuring Complexity

Use static analysis tools or manual inspection:
- Each `if`, `else if`, `when` branch adds 1
- Each `&&`, `||` adds 1
- Each loop (`for`, `while`) adds 1

**Example:**
```kotlin
// Complexity: 6 (too high)
fun complex(x: Int): String {
    if (x > 10) {           // +1
        if (x > 20) {       // +1
            return "high"
        }
    } else if (x > 5) {     // +1
        return "medium"
    } else {                // +1
        return "low"
    }
    for (i in 1..x) {       // +1
        if (i % 2 == 0) {   // +1
            println(i)
        }
    }
    return "done"
}
```

Refactor by extracting helper methods to reduce complexity.

---

## Testing Strategies

### Unit Tests vs Integration Tests

**Unit Tests** (with mocks):
- **Use for:** Service layer, business logic, controllers
- **Tools:** Mockito for mocking dependencies
- **Pattern:** Mock repositories and external services
- **Example:** `UserServiceTest`, `AnnouncementControllerTest`

**Integration Tests** (with TestContainers):
- **Use for:** Repository layer, database queries
- **Tools:** TestContainers with PostgreSQL
- **Pattern:** Extend `AbstractRepositoryTest` for TestContainers setup
- **Example:** `ProjectRepositoryTest`, `ScoreRepositoryTest`

### When to Use TestContainers

Use TestContainers for repository integration tests that:
- Verify custom query methods
- Test cascade deletion behavior
- Validate database constraints (unique, foreign key)
- Test transaction behavior

**Requirements:**
- Docker must be running
- Tests extend `AbstractRepositoryTest`
- Use `@DataJpaTest` with `@AutoConfigureTestDatabase(replace = NONE)`

**Example:**
```kotlin
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ProjectRepositoryTest : AbstractRepositoryTest() {
    @Autowired
    private lateinit var projectRepository: ProjectRepository

    // tests...
}
```

### Service Test Patterns

**Mock dependencies:**
```kotlin
@ExtendWith(MockitoExtension::class)
class HackathonServiceTest {
    @Mock
    private lateinit var hackathonRepository: HackathonRepository

    @Mock
    private lateinit var userRepository: UserRepository

    @InjectMocks
    private lateinit var hackathonService: HackathonService

    // tests...
}
```

**Use lenient stubbing** when some tests don't use all mocked dependencies:
```kotlin
@BeforeEach
fun setUp() {
    lenient().whenever(someRepository.findById(any())).thenReturn(Optional.of(someEntity))
}
```

### Controller Test Patterns

**For standard endpoints:**
```kotlin
@WebMvcTest(
    AnnouncementController::class,
    excludeFilters = [ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = [JwtAuthenticationFilter::class]
    )]
)
class AnnouncementControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @MockBean
    private lateinit var announcementService: AnnouncementService

    @MockBean
    private lateinit var jwtTokenProvider: JwtTokenProvider

    // tests...
}
```

**For endpoints with permitAll() security:**

Use `@SpringBootTest` + `@AutoConfigureMockMvc` instead of `@WebMvcTest` to load full security configuration.

**Example (HealthController):**
```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    // tests...
}
```

### Time-Based Testing

When testing expiry or timestamps, use assertions with buffers:

```kotlin
// Good
assertThat(token.expiresAt).isAfter(OffsetDateTime.now().plusMinutes(14))
assertThat(token.expiresAt).isBefore(OffsetDateTime.now().plusMinutes(16))

// Bad (too strict, may fail due to test execution time)
assertThat(token.expiresAt).isEqualTo(OffsetDateTime.now().plusMinutes(15))
```

---

## Constants Management

### Centralized Configuration

All magic numbers and configuration values should be defined in constants files.

**Location:** `src/main/kotlin/com/hackathon/manager/config/AppConstants.kt`

**Example:**
```kotlin
object AppConstants {
    object SecurityConstants {
        const val MIN_PASSWORD_LENGTH = 8
        const val PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 15L
        const val JWT_KEY_SIZE = 32
    }

    object PaginationConstants {
        const val DEFAULT_PAGE_SIZE = 20
        const val MAX_PAGE_SIZE = 100
    }
}
```

### Usage in Code

**Services:**
```kotlin
if (password.length < SecurityConstants.MIN_PASSWORD_LENGTH) {
    throw ValidationException(
        "Password must be at least ${SecurityConstants.MIN_PASSWORD_LENGTH} characters"
    )
}
```

**Tests:**
```kotlin
assertThat(token.expiresAt).isAfter(
    OffsetDateTime.now().plusMinutes(SecurityConstants.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES - 1)
)
```

### When to Extract Constants

Extract to constants when:
- The value is used in multiple places
- The value has business significance (expiry times, limits, thresholds)
- The value might need to be changed in the future
- The value's meaning is not immediately obvious from context

---

## Entity Update Patterns

### applyIfNotNull Utility

To eliminate repetitive `.let { entity.field = it }` patterns, use the `applyIfNotNull` extension function.

**Location:** `src/main/kotlin/com/hackathon/manager/util/EntityUpdateUtil.kt`

**Before:**
```kotlin
request.name?.let { hackathon.name = it }
request.description?.let { hackathon.description = it }
request.location?.let { hackathon.location = it }
```

**After:**
```kotlin
request.name.applyIfNotNull { hackathon.name = it }
request.description.applyIfNotNull { hackathon.description = it }
request.location.applyIfNotNull { hackathon.location = it }
```

### Benefits

- **Cleaner code:** Reduces visual noise and boilerplate
- **Consistency:** Standardizes null-safe updates across the codebase
- **No overhead:** Inline function has zero runtime cost
- **Type-safe:** Preserves null safety while enabling elegant operations

### Usage Guidelines

Use `applyIfNotNull` for:
- Optional field updates in update methods
- Partial entity updates from request DTOs
- Sequential updates to multiple nullable properties

---

## Naming Conventions

### Variable Naming

**Use descriptive names instead of ambiguous `it`:**

```kotlin
// Good
teams.filter { team -> team.members.any { member -> member.userId == userId } }

// Bad
teams.filter { it.members.any { it.userId == userId } }
```

**Use domain-specific names in lambdas:**

```kotlin
// Good
hackathonRepository.findById(id)
    .map { hackathon -> toHackathonResponse(hackathon) }

// Bad
hackathonRepository.findById(id)
    .map { toHackathonResponse(it) }
```

### Exception Parameter Naming

Use `exception` instead of shortened forms:

```kotlin
// Good
@ExceptionHandler(NotFoundException::class)
fun handleNotFound(exception: NotFoundException): ResponseEntity<ErrorResponse>

// Bad
@ExceptionHandler(NotFoundException::class)
fun handleNotFound(ex: NotFoundException): ResponseEntity<ErrorResponse>
```

### Service Method Naming

Use clear, intention-revealing names:

- `getHackathonById()` instead of `getHackathon()`
- `createAnnouncement()` instead of `create()`
- `isUserOrganizer()` instead of `checkOrganizer()`

### Test Method Naming

Use descriptive test names in natural language:

```kotlin
// Good
@Test
fun `findByToken should return token when exists`()

@Test
fun `requestPasswordReset should generate token with 15-minute expiry`()

// Acceptable (but less readable)
@Test
fun testFindByToken()
```

---

## Error Handling Best Practices

### Service Layer Error Handling

**Throw domain exceptions for business logic violations:**

```kotlin
fun getHackathonById(id: Long): Hackathon {
    return hackathonRepository.findById(id)
        .orElseThrow { NotFoundException("Hackathon with id $id not found") }
}
```

**Let exceptions propagate** to GlobalExceptionHandler - don't catch and rethrow unless adding context.

### Email Service Pattern

For non-critical operations like email sending, return success/failure status rather than throwing exceptions:

```kotlin
interface EmailService {
    fun sendPasswordResetEmail(email: String, resetUrl: String): Boolean
}

// Implementation
override fun sendPasswordResetEmail(email: String, resetUrl: String): Boolean {
    return try {
        resendClient.emails().send(createEmailRequest(email, resetUrl))
        true
    } catch (e: Exception) {
        logger.error("Failed to send password reset email to $email", e)
        false
    }
}
```

**Callers can log warnings but continue workflow:**

```kotlin
val emailSent = emailService.sendPasswordResetEmail(user.email, resetUrl)
if (!emailSent) {
    logger.warn("Password reset email failed for user ${user.email}")
}
// Continue - password reset token was saved successfully
```

---

## Migration Guidelines

### Adding New Services

1. **Create service class** with focused responsibility
2. **Write comprehensive tests** before implementation
3. **Inject into controller** and update controller tests
4. **Verify all tests pass** including integration tests
5. **Update documentation** if introducing new patterns

### Refactoring Existing Code

1. **Establish test coverage first** (80% minimum)
2. **Extract services incrementally** - one service at a time
3. **Run tests after each change** to verify no regression
4. **Update related tests** to reflect new structure
5. **Verify typecheck passes** after each iteration

### Adding New Endpoints

1. **Define request/response DTOs**
2. **Implement service method** with business logic
3. **Add controller endpoint** with proper authorization
4. **Write controller tests** for all success and failure paths
5. **Write service tests** for all business logic branches
6. **Verify test coverage** meets 80% threshold

---

## Common Patterns and Anti-Patterns

### Patterns to Follow

**Authorization checks in services:**
```kotlin
if (!hackathonService.isUserOrganizer(hackathonId, userId)) {
    throw UnauthorizedException("Only organizers can perform this action")
}
```

**Optional field mapping in DTOs:**
```kotlin
request.name.applyIfNotNull { entity.name = it }
request.description.applyIfNotNull { entity.description = it }
```

**Repository query methods:**
```kotlin
// Use descriptive method names that explain the query
fun findByHackathonIdOrderByStartsAt(hackathonId: Long): List<ScheduleEvent>
fun findByUserIdAndUsedAtIsNullAndExpiresAtAfter(userId: Long, now: OffsetDateTime): List<PasswordResetToken>
```

### Anti-Patterns to Avoid

**Don't throw HTTP exceptions from services:**
```kotlin
// Bad
throw ResponseStatusException(HttpStatus.NOT_FOUND, "Not found")

// Good
throw NotFoundException("Resource not found")
```

**Don't use magic numbers:**
```kotlin
// Bad
if (password.length < 8)

// Good
if (password.length < SecurityConstants.MIN_PASSWORD_LENGTH)
```

**Don't create god objects:**
```kotlin
// Bad: 431-line service handling criteria, judges, scoring, and leaderboard

// Good: Four focused services (JudgingCriteriaService, JudgeManagementService,
//       ScoringService, LeaderboardService)
```

**Don't use ambiguous variable names:**
```kotlin
// Bad
users.filter { it.role == UserRole.ORGANIZER }.map { it.id }

// Good
users.filter { user -> user.role == UserRole.ORGANIZER }.map { user -> user.id }
```

---

## Additional Resources

- **Spring Boot Documentation:** https://spring.io/projects/spring-boot
- **Kotlin Coding Conventions:** https://kotlinlang.org/docs/coding-conventions.html
- **TestContainers Documentation:** https://www.testcontainers.org/
- **JaCoCo Coverage Plugin:** https://www.jacoco.org/jacoco/

---

## Maintenance

This document should be updated when:
- New architectural patterns are introduced
- Testing strategies change
- Code quality standards are adjusted
- Major refactoring initiatives are completed

Last updated: January 2026
