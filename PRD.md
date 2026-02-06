# PRD: MCP Server for Hackathon Search

## Introduction

Expose the existing hackathon search API (`GET /api/hackathons/search`) as an MCP (Model Context Protocol) server so that AI assistants can discover and search hackathons. The MCP server will be a separate Kotlin/Ktor service in the same repository, packaged as a Docker container, and deployed on Render alongside the existing backend and frontend services.

The MCP server communicates with the existing hackathon-api via internal HTTP calls on Render, keeping the architecture clean — no direct database access, no code duplication.

## Goals

- Expose a single `search_hackathons` MCP tool that mirrors the existing `/api/hackathons/search` endpoint
- Use the official Kotlin MCP SDK (`io.modelcontextprotocol:kotlin-sdk`) with SSE transport via Ktor
- Package as a standalone Docker container deployable on Render free tier
- Add the MCP server to the existing `render.yaml` blueprint
- No authentication required (search is read-only public data)

## User Stories

### US-001: Set up MCP server Gradle subproject
**Description:** As a developer, I need a separate Gradle subproject for the MCP server so it builds independently from the Spring Boot backend.

**Acceptance Criteria:**
- [x] Add `mcp-server` to `settings.gradle.kts` as an included project
- [x] Create `mcp-server/build.gradle.kts` with Kotlin JVM plugin and dependencies:
  - `io.modelcontextprotocol:kotlin-sdk` (latest stable, currently 0.8.3)
  - `io.ktor:ktor-server-sse` for SSE transport
  - `io.ktor:ktor-server-netty` as the server engine
  - `io.ktor:ktor-client-cio` for HTTP calls to the backend API
  - `io.ktor:ktor-client-content-negotiation` + `io.ktor:ktor-serialization-kotlinx-json` for JSON parsing
- [x] Configure the Shadow plugin (`com.github.johnrengelman.shadow`) for fat JAR packaging
- [x] Create placeholder `Main.kt` with an empty `main()` function that compiles
- [x] `./gradlew :mcp-server:build` succeeds
- [x] Root project `./gradlew build` still succeeds (existing backend unaffected)
- [x] Typecheck passes

### US-002: Implement search_hackathons MCP tool
**Description:** As an AI assistant user, I want to search hackathons via MCP so I can find relevant events without using the web UI.

**Acceptance Criteria:**
- [x] Create MCP server in `Main.kt` using the Kotlin MCP SDK `Server` builder
- [x] Server name: `"hackathon-search"`, version: `"1.0.0"`
- [x] Register a single tool `search_hackathons` with the following input schema parameters:
  - `query` (string, optional) — full-text search on name/description
  - `timeFrame` (string, optional, enum: upcoming/ongoing/past)
  - `status` (string, optional, enum: registration_open/registration_closed/in_progress/judging/completed/cancelled)
  - `startDate` (string, optional) — ISO date format
  - `endDate` (string, optional) — ISO date format
  - `page` (integer, optional, default 0)
  - `size` (integer, optional, default 20)
- [x] Tool handler makes HTTP GET request to `${API_BASE_URL}/api/hackathons/search` with the provided parameters as query params
- [x] `API_BASE_URL` read from environment variable (defaults to `http://localhost:8080` for local dev)
- [x] Response from backend is parsed and returned as formatted text content in the MCP tool result
- [x] Tool result includes: hackathon name, status, dates, location, participant count for each result, plus pagination summary
- [x] Error responses from the backend are caught and returned as MCP error content (isError = true)
- [x] Unit tests for request parameter mapping and response formatting
- [x] `./gradlew :mcp-server:test` passes
- [x] Typecheck passes

### US-003: Add SSE transport and server entry point
**Description:** As a developer, I need the MCP server to accept connections over SSE so it can be accessed remotely when deployed.

**Acceptance Criteria:**
- [x] Configure Ktor server with SSE transport using the MCP SDK's Ktor integration
- [x] Server listens on port from `PORT` environment variable (default `3001`)
- [x] SSE endpoint is available at the root path (`/sse`)
- [x] Add a `GET /health` endpoint that returns 200 OK (for Render health checks)
- [x] Server starts successfully and logs startup message with port number
- [x] Manual test: start server locally, connect with an MCP client (e.g., Claude Code `.mcp.json`), and verify the `search_hackathons` tool is listed
- [x] `./gradlew :mcp-server:build` succeeds
- [x] Typecheck passes

### US-004: Create Dockerfile for MCP server
**Description:** As a developer, I need a Docker image for the MCP server so it can be deployed on Render.

**Acceptance Criteria:**
- [x] Create `mcp-server/Dockerfile` with multi-stage build:
  - Builder stage: `eclipse-temurin:17-jdk`, copies Gradle wrapper + subproject files, runs `./gradlew :mcp-server:shadowJar --no-daemon`
  - Runtime stage: `eclipse-temurin:17-jre`, copies fat JAR
- [x] Memory flags sized for Render free tier: `-Xmx256m -Xms128m`
- [x] Port configured via `PORT` env var (Render sets this automatically)
- [x] `docker build -f mcp-server/Dockerfile -t hackathon-mcp .` succeeds from repo root
- [x] Container starts and responds to health check requests
- [x] Typecheck passes

### US-005: Add MCP server to Render blueprint
**Description:** As a developer, I need the MCP server in the Render blueprint so it deploys automatically alongside the existing services.

**Acceptance Criteria:**
- [x] Add `hackathon-mcp` web service to `render.yaml`:
  - Type: `web`, runtime: `docker`
  - Dockerfile path: `mcp-server/Dockerfile`
  - Plan: `free`
  - Health check path: `/health`
  - Environment variable `API_BASE_URL` referencing the `hackathon-api` service's external URL via `fromService`
- [x] Existing services in `render.yaml` remain unchanged
- [x] Blueprint YAML is valid (no syntax errors)
- [x] Typecheck passes

## Non-Goals

- No authentication or authorization on the MCP server
- No additional MCP tools beyond `search_hackathons` (no CRUD, no get-by-id)
- No MCP resources or prompts — tools only
- No Streamable HTTP transport (SSE only for now)
- No WebSocket transport
- No CI/CD pipeline changes (Render auto-deploys from branch)
- No frontend changes
- No changes to the existing backend API

## Technical Considerations

- **Kotlin MCP SDK:** Use `io.modelcontextprotocol:kotlin-sdk:0.8.3` — the official SDK maintained with JetBrains. It provides Ktor SSE integration out of the box.
- **Ktor version:** Must match the version used by the MCP SDK (check its transitive dependencies). Currently Ktor 3.x.
- **Fat JAR:** Use the Shadow plugin (`com.github.johnrengelman.shadow`) to produce a single fat JAR for simpler Docker packaging.
- **Render internal networking:** On Render, services on the same blueprint can communicate via internal or external URLs. Use `fromService` with `envVarKey: RENDER_EXTERNAL_URL` to wire `API_BASE_URL`.
- **Gradle subproject:** The `mcp-server/` directory is a Gradle subproject. It shares the root `gradlew` wrapper but has its own `build.gradle.kts`. The root project's existing build tasks should not be affected.
- **Port:** Render assigns the port via the `PORT` env var. The MCP server must read this at startup.
- **Health checks:** Add a dedicated `/health` GET endpoint in the Ktor server that returns 200 OK, since SSE endpoints don't respond to simple health check probes.
