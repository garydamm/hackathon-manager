# PRD: Hackathon Search API Endpoint

## Introduction

Add a public search API endpoint that allows querying hackathons by name, time frame, and registration status. The endpoint returns only public hackathon data (no personal information, participant details, or project details). The API is designed with flat, self-descriptive parameters so it can be directly exposed as an MCP tool with no modifications.

## Goals

- Provide a single public endpoint for searching hackathons with flexible filtering
- Support full-text search with relevance scoring on hackathon name and description
- Support filtering by predefined time frame categories (upcoming, ongoing, past) and custom date ranges
- Support filtering by hackathon status (e.g., registration_open, in_progress)
- Return only public hackathon data — no personal information, names, emails, or project details
- Design the API with flat parameters suitable for direct MCP tool exposure
- Paginate results with sensible defaults (page 0, size 20, max 100)
- Always exclude archived and draft hackathons from search results

## User Stories

### US-001: Add full-text search infrastructure to database
**Description:** As a developer, I need PostgreSQL full-text search support on the hackathons table so that search queries return relevance-ranked results.

**Acceptance Criteria:**
- [x] Flyway migration adds `search_vector tsvector` column to `hackathons` table
- [x] GIN index created on `search_vector` column
- [x] Database trigger auto-updates `search_vector` from `name` (weight A) and `description` (weight B) on INSERT and UPDATE
- [x] Existing hackathon records are backfilled with search vectors
- [x] Migration runs successfully against a clean database
- [x] Migration runs successfully against an existing database with data
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Add public search response DTO and repository query
**Description:** As a developer, I need a response DTO that contains only public hackathon data and a repository method that performs full-text search with filtering, so the search endpoint can return safe, relevant results.

**Acceptance Criteria:**
- [ ] `HackathonSearchResult` DTO includes: id, name, slug, description, status, location, isVirtual, timezone, registrationOpensAt, registrationClosesAt, startsAt, endsAt, judgingStartsAt, judgingEndsAt, maxTeamSize, minTeamSize, maxParticipants, participantCount, bannerUrl, logoUrl, relevanceScore
- [ ] `HackathonSearchResult` DTO does NOT include: createdBy, userRole, participant/organizer details, or any user personal information
- [ ] `HackathonSearchResponse` wrapper DTO includes: results list, page, size, totalElements, totalPages
- [ ] Repository method supports full-text search with `ts_rank` scoring via native query
- [ ] Repository method supports filtering by status, time frame category (upcoming/ongoing/past), and custom date range (startDate/endDate)
- [ ] Repository method always excludes archived hackathons and draft hackathons
- [ ] Unit tests added for DTO construction
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-003: Add search service and public controller endpoint
**Description:** As an API consumer, I want a public `GET /api/hackathons/search` endpoint with flat query parameters so I can search for hackathons without authentication, and so this endpoint can later be exposed as an MCP tool.

**Acceptance Criteria:**
- [ ] `GET /api/hackathons/search` endpoint exists on `HackathonController`
- [ ] Endpoint accepts these optional query parameters: `query` (string), `timeFrame` (string: upcoming|ongoing|past), `startDate` (ISO date), `endDate` (ISO date), `status` (string: registration_open|registration_closed|in_progress|judging|completed|cancelled), `page` (int, default 0), `size` (int, default 20, max 100)
- [ ] All parameters are optional; omitting all returns all non-archived, non-draft hackathons
- [ ] Results sorted by relevance score when `query` is provided, by `startsAt` descending otherwise
- [ ] `SecurityConfig` updated to permit `GET /api/hackathons/search` without authentication
- [ ] Returns 200 with `HackathonSearchResponse` body
- [ ] Returns 400 if `size` exceeds 100 or date params are invalid
- [ ] Service layer validates parameter combinations (e.g., `endDate` without `startDate` is allowed and treated as "before endDate")
- [ ] Unit tests added for search service logic
- [ ] Unit tests added for controller endpoint (WebMvcTest)
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-004: Add repository integration tests for search
**Description:** As a developer, I need integration tests using TestContainers to verify the full-text search query, filtering, and pagination work correctly against a real PostgreSQL database.

**Acceptance Criteria:**
- [ ] Integration test: full-text search by name returns matching hackathons ranked by relevance
- [ ] Integration test: full-text search by description returns matching hackathons
- [ ] Integration test: filter by `timeFrame=upcoming` returns only future hackathons
- [ ] Integration test: filter by `timeFrame=ongoing` returns only currently running hackathons
- [ ] Integration test: filter by `timeFrame=past` returns only completed hackathons
- [ ] Integration test: filter by custom date range returns hackathons within range
- [ ] Integration test: filter by `status=registration_open` returns only matching hackathons
- [ ] Integration test: combining `query` + `status` filters returns correct intersection
- [ ] Integration test: archived hackathons are never returned
- [ ] Integration test: draft hackathons are never returned
- [ ] Integration test: pagination returns correct page/size/totalElements/totalPages
- [ ] Integration test: no personal information (createdBy details) appears in results
- [ ] All tests pass
- [ ] Typecheck passes

## Non-Goals

- No MCP server implementation (API is designed for future MCP exposure, not built now)
- No frontend UI for search (backend API only)
- No authentication or user-specific results
- No search on project details, team names, or participant information
- No saved searches or search history
- No autocomplete or search suggestions
- No geographic/location-based search (location is returned but not searchable)
- No sorting options beyond relevance/date (no sort parameter)

## Technical Considerations

- Use PostgreSQL's built-in full-text search (`tsvector`, `tsquery`, `ts_rank`) — no external search service needed
- The `search_vector` column should index both `name` (weight A) and `description` (weight B) for weighted relevance
- Use `plainto_tsquery` for user-friendly query parsing (handles natural language input without requiring special syntax)
- Native SQL queries via `@Query(nativeQuery = true)` in the repository since JPA/JPQL doesn't support `tsvector`
- Use Spring Data's `Pageable` for pagination support
- The existing `HackathonResponse` DTO includes `createdBy: UserResponse` — the new `HackathonSearchResult` DTO must NOT include this field
- Draft hackathons (`status = draft`) should always be excluded since they are not publicly visible
- The `timeFrame` parameter maps to date-based filters on `starts_at` and `ends_at`: upcoming = `starts_at > now`, ongoing = `starts_at <= now AND ends_at >= now`, past = `ends_at < now`
- For MCP tool compatibility: all parameters are simple scalar types (string, int), no arrays or nested objects
