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
```

Start the backend server:

```bash
# From the project root
./gradlew bootRun
```

The API will be available at `http://localhost:8080`

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

## License

MIT
