# PRD: Render Deployment Preparation

## Introduction

Prepare the hackathon-manager application for production deployment on Render. This includes verifying the existing test suite passes, containerizing the application with Docker, and configuring Render deployment with managed Postgres. The application consists of a Kotlin/Spring Boot backend and a React/Vite frontend.

## Goals

- Verify existing backend tests pass before deployment
- Create Docker configuration optimized for Render deployment
- Configure environment variables for production (DATABASE_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET)
- Deploy backend as a Render Web Service with managed Postgres
- Deploy frontend as a Render Static Site
- Enable auto-deploy on push to main (Render default)

## User Stories

### US-001: Run existing backend tests
**Description:** As a developer, I want to verify all existing tests pass so that I have confidence the codebase is stable before deployment.

**Acceptance Criteria:**
- [x] Run `./gradlew test` successfully
- [x] All unit and integration tests pass
- [x] JaCoCo coverage verification passes (70% threshold)
- [x] Document any test failures that need addressing

---

### US-001B: Run existing frontend tests
**Description:** As a developer, I want to verify all existing frontend tests pass so that I have confidence the frontend is stable before deployment.

**Acceptance Criteria:**
- [x] Run `npm run test:e2e` successfully in the frontend directory
- [x] All Playwright e2e tests pass
- [x] Document any test failures that need addressing

---

### US-002: Update database config for Render Postgres
**Description:** As a developer, I need the backend to accept Render's database configuration so it can connect to managed Postgres.

**Acceptance Criteria:**
- [x] Add `application-prod.yml` profile that uses DATABASE_URL, DB_USERNAME, and DB_PASSWORD environment variables
- [x] Support Render's Postgres connection string format for DATABASE_URL
- [x] Use DB_USERNAME and DB_PASSWORD for authentication credentials
- [x] Fallback to existing local config when env vars not set
- [x] Typecheck passes (Kotlin compiles without errors)

---

### US-003: Update CORS configuration for production
**Description:** As a developer, I need CORS to allow requests from the production frontend domain so the deployed app works correctly.

**Acceptance Criteria:**
- [ ] Add FRONTEND_URL environment variable support to SecurityConfig
- [ ] CORS allows origin from FRONTEND_URL when set
- [ ] Keeps existing localhost origins for development
- [ ] Typecheck passes

---

### US-004: Configure frontend production API URL
**Description:** As a developer, I need the frontend to use an environment variable for the API URL so it can point to the production backend.

**Acceptance Criteria:**
- [ ] Add VITE_API_URL environment variable support
- [ ] Update API client/fetch calls to use VITE_API_URL
- [ ] Default to localhost:8080 for local development
- [ ] Frontend builds successfully with `npm run build`
- [ ] Typecheck passes

---

### US-005: Create backend Dockerfile
**Description:** As a developer, I need a Dockerfile for the Spring Boot backend so Render can build and deploy it.

**Acceptance Criteria:**
- [ ] Create multi-stage Dockerfile in project root
- [ ] Stage 1: Build JAR with Gradle
- [ ] Stage 2: Run JAR with minimal JRE image (eclipse-temurin)
- [ ] Expose port 8080
- [ ] Set SPRING_PROFILES_ACTIVE=prod
- [ ] Create .dockerignore excluding node_modules, .git, frontend/dist, build/
- [ ] Docker builds successfully: `docker build -t hackathon-manager .`

---

### US-006: Create render.yaml blueprint
**Description:** As a developer, I need a render.yaml file so Render can automatically configure all services from the repository.

**Acceptance Criteria:**
- [ ] Create render.yaml in project root
- [ ] Define web service for backend (Docker, auto-deploy enabled)
- [ ] Define static site for frontend (build command: npm run build, publish: frontend/dist)
- [ ] Define managed Postgres database (free tier)
- [ ] Configure environment variable references (DATABASE_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, FRONTEND_URL, VITE_API_URL)
- [ ] File validates as proper YAML

---

### US-007: Add database initialization for Render
**Description:** As a developer, I need the database schema to be created on first deploy since Hibernate is set to validate mode.

**Acceptance Criteria:**
- [ ] Update application-prod.yml to set `spring.jpa.hibernate.ddl-auto=update` for initial deploy
- [ ] OR create a startup script that runs schema.sql on empty database
- [ ] Document the initialization approach in README
- [ ] Typecheck passes

---

### US-008: Test Docker build locally
**Description:** As a developer, I want to verify the Docker container works locally before deploying to Render.

**Acceptance Criteria:**
- [ ] Build Docker image successfully
- [ ] Run container with test environment variables
- [ ] Backend starts and responds to health check on port 8080
- [ ] Document local Docker testing commands in README

---

### US-009: Deploy to Render
**Description:** As a developer, I want to deploy the application to Render so it's accessible on the internet.

**Acceptance Criteria:**
- [ ] Push render.yaml to main branch
- [ ] Create Render Blueprint from repository
- [ ] Postgres database created and connected
- [ ] Backend web service deployed and healthy
- [ ] Frontend static site deployed and accessible
- [ ] Application loads in browser without errors
- [ ] User can register and login successfully

## Non-Goals

- CI/CD pipeline beyond Render's built-in auto-deploy
- Custom domain configuration (can be added later)
- SSL certificate setup (Render provides this automatically)
- Staging environment (single production deployment only)
- Frontend E2E tests in deployment pipeline (manual verification)
- Database backups configuration (can be added later)
- Horizontal scaling configuration

## Technical Considerations

- **Database Configuration:** Render provides DATABASE_URL (connection string), DB_USERNAME, and DB_PASSWORD separately. Use all three for complete database connectivity
- **Static Assets:** Frontend deploys as separate Render Static Site, not bundled with backend
- **Environment Variables:** JWT_SECRET should be generated securely (use Render's random generator)
- **Schema Migration:** Since Hibernate is in validate mode, consider switching to update for prod or using Flyway for proper migrations
- **CORS:** Frontend and backend will have different Render subdomains (e.g., `hackathon-api.onrender.com` and `hackathon-app.onrender.com`)
- **Free Tier:** Render free tier services spin down after 15 minutes of inactivity; first request will be slow
