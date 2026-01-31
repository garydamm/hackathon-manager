# Agent Guidelines

This document contains patterns and knowledge discovered during development that should guide future work.

## Testing Strategy

### Critical: TestContainers Resource Exhaustion

**Problem**: Running all repository tests together (`./gradlew test`) causes TestContainers to fail with connection errors due to resource exhaustion. 91 repository tests trying to use PostgreSQL TestContainers simultaneously leads to port conflicts and connection pool exhaustion.

**Solution**: Run repository tests individually, only when needed.

### Backend Testing (Kotlin/Spring Boot)

**When you create a database migration:**
1. Run unit tests (controllers/services): `./gradlew test --tests '*ControllerTest' --tests '*ServiceTest'`
2. Run ONLY the specific new repository test: `./gradlew test --tests YourNewRepositoryTest`
   - Example: Created `V3__add_user_sessions_table.sql` → Run `./gradlew test --tests UserSessionRepositoryTest`
3. Run typecheck: `./gradlew build -x test`

**When you modify services/controllers (no database changes):**
1. Run unit tests: `./gradlew test --tests '*ControllerTest' --tests '*ServiceTest'`
2. Run typecheck: `./gradlew build -x test`

**Never run**: `./gradlew test` without filters - it will hang/fail on repository tests.

### Frontend Testing (TypeScript/React)

**Always run both:**
- Tests: `cd frontend && npm test`
- Typecheck: `cd frontend && npm run typecheck`

## Database Patterns

### Flyway Migrations

- Location: `src/main/resources/db/migration/`
- Naming: `V{number}__{description}.sql`
- Pattern: CREATE TABLE, add indexes, add constraints
- Example: `V3__add_user_sessions_table.sql`

### Entity Classes

- Location: `src/main/kotlin/com/hackathon/manager/entity/`
- Use `@Entity` and `@Table(name="table_name")`
- Primary keys: `@Id @GeneratedValue(strategy = GenerationType.UUID)`
- Foreign keys: `@ManyToOne(fetch = FetchType.LAZY)` with `@JoinColumn`
- Timestamps: `@CreationTimestamp` for created_at, `@UpdateTimestamp` for updated_at
- Example: See `UserSession.kt` or `PasswordResetToken.kt`

### Repository Interfaces

- Location: `src/main/kotlin/com/hackathon/manager/repository/`
- Extend `JpaRepository<Entity, UUID>`
- Spring Data auto-generates queries from method names
- Example: `findByUserId(userId: UUID): List<Entity>`

## Frontend Patterns

### JWT Token Management

- Decode tokens using `frontend/src/utils/jwt.ts`
- Never send tokens in GET request URLs
- Store tokens in localStorage (cookie support planned)
- Track token expiration and refresh proactively

### Session Management

- Proactive refresh: 5 minutes before expiration (30 min for "remember me")
- Activity tracking: Only POST/PUT/DELETE/PATCH count as "active work"
- Countdown visibility: Show when < 10 min remain (60 min for "remember me")
- Warnings: Show when < 5 min remain (30 min for "remember me")

## Code Review Checklist

- [ ] Did you run the appropriate tests for your changes?
- [ ] Did you run typecheck?
- [ ] Did you update PRD.md to mark completed tasks?
- [ ] Did you append learnings to progress.txt?
- [ ] If you created a migration, did you test the repository individually?
- [ ] Did you commit with a descriptive message?

## Common Gotchas

1. **TestContainers hangs**: Don't run all repository tests together
2. **ActivityTracking in tests**: Mock `api.getLastActivityTime()` in component tests
3. **React fake timers**: Use `vi.useRealTimers()` when testing intervals + promises
4. **Radix UI components**: Use controlled pattern with `watch()` and `setValue()`
5. **TypeScript imports**: All imports must be used (strict mode)
6. **Migration testing**: Always test new migrations run successfully with Flyway
