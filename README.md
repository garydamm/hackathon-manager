# Hackathon Manager

A full-stack web application for organizing and managing hackathons. Create events, manage registrations, and track participants with an intuitive interface.

## Features

- **User Authentication** - Secure registration and login with JWT tokens
- **Hackathon Management** - Create, edit, and manage hackathon events
- **Role-Based Access** - Organizers can edit their hackathons; participants can view and register
- **Dashboard** - View hackathons by status: drafts, open for registration, in progress, and completed
- **Responsive Design** - Modern UI with animations that works on all devices

## Tech Stack

### Backend
- **Kotlin** with Spring Boot 3.2
- **Spring Security** with JWT authentication
- **Spring Data JPA** with PostgreSQL
- **Gradle** build system

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS v4** for styling
- **TanStack Query** for data fetching
- **React Router v7** for navigation
- **React Hook Form + Zod** for form validation
- **Framer Motion** for animations

## Prerequisites

- **Java 17+** - Required for the backend
- **Node.js 18+** - Required for the frontend
- **PostgreSQL 14+** - Database

## Getting Started

### 1. Database Setup

Create a PostgreSQL database and run the schema:

```bash
# Create the database
createdb hackathon_manager

# Run the schema
psql -d hackathon_manager -f schema.sql

# (Optional) Load seed data
psql -d hackathon_manager -f seed.sql
```

### 2. Backend Setup

Configure environment variables (or use defaults for local development):

```bash
# Optional: Create a .env file in the project root
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-256-bit-secret-key-here-make-it-long-enough-for-hs256

# Email Configuration (Optional)
# By default, emails are logged to console
# To send real emails via Resend:
EMAIL_ENABLED=true
RESEND_API_KEY=re_your_api_key_here  # Get from https://resend.com/api-keys
EMAIL_FROM=onboarding@resend.dev  # Use onboarding@resend.dev for testing
EMAIL_FROM_NAME=Hackathon Manager
```

**Note on Email**: By default, emails (like password reset) are logged to the console. To send real emails, sign up for a free [Resend](https://resend.com) account (100 emails/day free) and configure the environment variables above.

Start the backend server:

```bash
# From the project root
./gradlew bootRun
```

The API will be available at `http://localhost:8080`

Run the backend tests:

```bash
# Run all tests
./gradlew test

# View test report (after running tests)
open build/reports/tests/test/index.html
```

**Note on Repository Tests**: Integration tests for repositories use [TestContainers](https://testcontainers.com/) to spin up a PostgreSQL database automatically during test execution. Docker must be running for these tests to pass. TestContainers will:
- Automatically download the `postgres:16-alpine` image (if not already present)
- Start a PostgreSQL container for the test duration
- Run Flyway migrations to set up the test database schema
- Tear down the container after tests complete

If repository tests fail, ensure Docker is running on your machine.

### 3. Frontend Setup

Install dependencies and start the development server:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

Run the end-to-end tests:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all e2e tests (requires backend to be running)
npm run test:e2e

# Run tests with UI mode for debugging
npx playwright test --ui
```

## Usage

1. Open `http://localhost:5173` in your browser
2. Register a new account or log in
3. Create a new hackathon from the dashboard
4. Toggle "Open Registration Immediately" to make it visible to others
5. View and edit your hackathons from the dashboard

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in and get JWT token |
| GET | `/api/hackathons` | List active hackathons |
| GET | `/api/hackathons/my-drafts` | List user's draft hackathons |
| GET | `/api/hackathons/{slug}` | Get hackathon by slug |
| POST | `/api/hackathons` | Create a new hackathon |
| PUT | `/api/hackathons/{id}` | Update a hackathon |
| POST | `/api/hackathons/{id}/register` | Register for a hackathon |

## Project Structure

```
hackathon-manager/
├── src/main/kotlin/          # Backend source code
│   └── com/hackathon/manager/
│       ├── controller/       # REST controllers
│       ├── service/          # Business logic
│       ├── repository/       # Data access
│       ├── entity/           # JPA entities
│       ├── dto/              # Data transfer objects
│       └── security/         # JWT authentication
├── frontend/                 # React frontend
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Page components
│       ├── services/         # API client
│       ├── contexts/         # React contexts
│       └── types/            # TypeScript types
├── schema.sql                # Database schema
└── seed.sql                  # Sample data
```

## Deployment to Render

This application is configured for deployment on [Render](https://render.com) using the included `render.yaml` blueprint.

### Prerequisites

- A Render account
- This repository pushed to GitHub/GitLab

### Deploy Steps

1. Push your code to a GitHub or GitLab repository
2. In Render Dashboard, click "New" → "Blueprint"
3. Connect your repository
4. Render will detect `render.yaml` and create:
   - **hackathon-db**: PostgreSQL database (free tier)
   - **hackathon-api**: Backend web service (Docker)
   - **hackathon-app**: Frontend static site
5. After deployment, set `FRONTEND_URL` in the hackathon-api service settings to match your static site URL

### Database Initialization

The production configuration uses `spring.jpa.hibernate.ddl-auto=validate`, which requires the database schema to be initialized before the application starts.

**For Render deployment:**
1. After the PostgreSQL database is created, connect to it and run `schema.sql`:
   ```bash
   # Get connection details from Render dashboard
   psql -h <host> -U <user> -d <database> -f schema.sql
   ```

2. Alternatively, you can temporarily set `ddl-auto=update` for initial deployment, then switch back to `validate`.

**For production stability**, consider implementing database migrations with [Flyway](https://flywaydb.org/) for version-controlled schema changes.

### Environment Variables

The following environment variables are configured automatically via `render.yaml`:

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | hackathon-api | PostgreSQL connection URL (from database) |
| `DB_USERNAME` | hackathon-api | Database username (from database) |
| `DB_PASSWORD` | hackathon-api | Database password (from database) |
| `JWT_SECRET` | hackathon-api | Auto-generated secure secret |
| `FRONTEND_URL` | hackathon-api | Frontend URL for CORS (set manually) |
| `VITE_API_URL` | hackathon-app | Backend API URL (auto-linked) |

### Local Docker Testing

Test the Docker build locally before deploying to Render:

```bash
# 1. Start a test PostgreSQL container
docker run --name test-postgres \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=hackathon \
  -p 5433:5432 \
  -d postgres:15-alpine

# 2. Wait for Postgres to be ready
sleep 3 && docker exec test-postgres pg_isready -U test -d hackathon

# 3. Initialize the database schema
docker exec -i test-postgres psql -U test -d hackathon < schema.sql

# 4. Build the Docker image
docker build -t hackathon-manager .

# 5. Run the backend container
docker run --name hackathon-api \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5433/hackathon \
  -e DB_USERNAME=test \
  -e DB_PASSWORD=test \
  -e JWT_SECRET=test-jwt-secret-key-for-local-docker-testing-12345 \
  -e FRONTEND_URL=http://localhost:3000 \
  -p 8081:8080 \
  -d hackathon-manager

# 6. Verify the backend is running
sleep 5 && curl http://localhost:8081/api/hackathons
# Expected: [] (empty array with 200 status)

# 7. Test user registration
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123","firstName":"Test","lastName":"User"}'
# Expected: JSON response with accessToken and user data

# Cleanup
docker stop hackathon-api test-postgres
docker rm hackathon-api test-postgres
```

**Note:** On macOS/Windows, `host.docker.internal` resolves to the host machine. On Linux, you may need to use `--network host` or the actual host IP.

## License

MIT
