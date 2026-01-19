# Project Checkpoint

**Date:** 2026-01-18
**Commit:** `1611fd3` - Add README with setup instructions

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
