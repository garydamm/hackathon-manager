# PRD: Schedule and Events Feature

## Introduction

Add a comprehensive schedule and events system to help hackathon participants easily view and plan their time during the event. Organizers can create a full agenda including workshops, meals, ceremonies, and deadlines. Participants can view the schedule, RSVP to events, and access virtual meeting links. Organizers can track attendance for in-person events.

## Goals

- Enable organizers to create a complete hackathon agenda with various event types
- Provide participants with an easy-to-read timeline view of all events
- Allow participants to RSVP to events (attending/maybe/not attending)
- Make virtual event links readily accessible to all registered participants
- Clearly mark mandatory events with visual indicators
- Enable organizers to track attendance for in-person events with manual check-in

## User Stories

### US-001: Create EventAttendeeRepository
**Description:** As a developer, I need a repository for event attendees so I can store and query RSVP and attendance data.

**Acceptance Criteria:**
- [x] Create `EventAttendeeRepository.kt` extending JpaRepository
- [x] Add method: `findByEventIdAndUserId(eventId, userId)`
- [x] Add method: `findByEventIdOrderByUserLastNameAscUserFirstNameAsc(eventId)`
- [x] Add method: `existsByEventIdAndUserId(eventId, userId)`
- [x] Add method: `countByEventIdAndRsvpStatus(eventId, rsvpStatus)`
- [x] Add method: `deleteByEventIdAndUserId(eventId, userId)`
- [x] Typecheck passes

### US-002: Add EventAttendee DTOs
**Description:** As a developer, I need DTOs for event attendee operations so I can handle RSVP and attendance requests/responses.

**Acceptance Criteria:**
- [x] Create `EventAttendeeDtos.kt` file
- [x] Add `EventAttendeeResponse` data class with fromEntity() method
- [x] Add `RsvpRequest` data class with validation for rsvpStatus
- [x] Add `MarkAttendanceRequest` data class with userId and attended fields
- [x] Add `BulkMarkAttendanceRequest` data class with userIds list and attended field
- [x] Typecheck passes

### US-003: Update ScheduleEventResponse with RSVP data
**Description:** As a developer, I need to include RSVP counts and user status in event responses so the frontend can display participation information.

**Acceptance Criteria:**
- [x] Add `attendingCount: Int = 0` field to ScheduleEventResponse
- [x] Add `maybeCount: Int = 0` field to ScheduleEventResponse
- [x] Add `notAttendingCount: Int = 0` field to ScheduleEventResponse
- [x] Add `userRsvpStatus: String? = null` field to ScheduleEventResponse
- [x] Add `userAttended: Boolean? = null` field to ScheduleEventResponse
- [x] Update fromEntity() to accept RSVP counts and user attendee record
- [x] Typecheck passes

### US-004: Add isUserRegistered helper to HackathonService
**Description:** As a developer, I need to check if a user is registered for a hackathon so I can validate RSVP eligibility.

**Acceptance Criteria:**
- [x] Add `isUserRegistered(hackathonId, userId)` method to HackathonService
- [x] Method returns boolean from hackathonUserRepository.existsByHackathonIdAndUserId()
- [x] Add @Transactional(readOnly = true) annotation
- [x] Typecheck passes

### US-005: Add RSVP service methods to ScheduleService
**Description:** As a developer, I need service methods for RSVP operations so participants can indicate their attendance plans.

**Acceptance Criteria:**
- [x] Inject eventAttendeeRepository, userRepository, hackathonService into ScheduleService
- [x] Add `getScheduleByHackathonWithRsvp(hackathonId, userId?)` method that includes RSVP counts
- [x] Add `rsvpToEvent(eventId, userId, rsvpStatus)` method that creates or updates RSVP
- [x] Add `removeRsvp(eventId, userId)` method that deletes RSVP
- [x] Validate user is registered before allowing RSVP
- [x] Validate rsvpStatus is one of: attending, maybe, not_attending
- [x] Typecheck passes

### US-006: Add attendance tracking service methods
**Description:** As a developer, I need service methods for attendance tracking so organizers can mark who attended events.

**Acceptance Criteria:**
- [x] Add `getEventAttendees(eventId, requesterId)` method with organizer authorization check
- [x] Add `markAttendance(eventId, userId, attended, requesterId)` method with organizer check
- [x] Add `bulkMarkAttendance(eventId, userIds, attended, requesterId)` method with organizer check
- [x] All methods verify requester is organizer using hackathonService.isUserOrganizer()
- [x] Throw ApiException with FORBIDDEN status if not organizer
- [x] Typecheck passes

### US-007: Add RSVP endpoints to ScheduleController
**Description:** As a developer, I need REST endpoints for RSVP operations so the frontend can manage participant responses.

**Acceptance Criteria:**
- [x] Update existing GET /schedule/hackathon/{id} to use getScheduleByHackathonWithRsvp()
- [x] Add POST /schedule/{eventId}/rsvp endpoint with RsvpRequest body
- [x] Add PUT /schedule/{eventId}/rsvp endpoint for updating RSVP status
- [x] Add DELETE /schedule/{eventId}/rsvp endpoint for removing RSVP
- [x] All endpoints use @AuthenticationPrincipal for user context
- [x] Return 201 CREATED for POST, 200 OK for PUT, 204 NO CONTENT for DELETE
- [x] Typecheck passes

### US-008: Add attendance tracking endpoints
**Description:** As a developer, I need REST endpoints for attendance tracking so organizers can record who attended events.

**Acceptance Criteria:**
- [x] Add GET /schedule/{eventId}/attendees endpoint (returns attendee list)
- [x] Add POST /schedule/{eventId}/attendance endpoint with MarkAttendanceRequest body
- [x] Add POST /schedule/{eventId}/attendance/bulk endpoint with BulkMarkAttendanceRequest body
- [x] All endpoints require authentication and pass principal.id to service layer
- [x] Return appropriate HTTP status codes (200 OK, 403 FORBIDDEN, 404 NOT FOUND)
- [x] Typecheck passes

### US-009: Add TypeScript types for schedule and events
**Description:** As a developer, I need TypeScript types for schedule entities so the frontend has type safety.

**Acceptance Criteria:**
- [x] Add EventType union type in types/index.ts
- [x] Add RsvpStatus union type
- [x] Add ScheduleEvent interface with all fields including RSVP counts
- [x] Add EventAttendee interface with user details
- [x] Add CreateScheduleEventRequest interface
- [x] Add UpdateScheduleEventRequest interface
- [x] Add RsvpRequest, MarkAttendanceRequest, BulkMarkAttendanceRequest interfaces
- [x] Typecheck passes

### US-010: Create schedule API service
**Description:** As a developer, I need an API service for schedule operations so components can fetch and mutate schedule data.

**Acceptance Criteria:**
- [x] Create services/schedule.ts file
- [x] Export scheduleService singleton object
- [x] Add methods: getSchedule, getEvent, createEvent, updateEvent, deleteEvent
- [x] Add methods: rsvpToEvent, updateRsvp, removeRsvp
- [x] Add methods: getEventAttendees, markAttendance, bulkMarkAttendance
- [x] All methods use centralized api client with proper types
- [x] Typecheck passes

### US-011: Create RsvpButton component
**Description:** As a participant, I want to RSVP to events with a simple dropdown so I can indicate my attendance plans.

**Acceptance Criteria:**
- [ ] Create components/RsvpButton.tsx
- [ ] Show "RSVP" button if user hasn't RSVP'd yet
- [ ] Show status badge (Attending/Maybe/Not Attending) if user has RSVP'd
- [ ] Dropdown menu has 4 options: Attending, Maybe, Not Attending, Remove RSVP
- [ ] Use color-coded badges: green (attending), yellow (maybe), gray (not attending)
- [ ] Show lucide-react icons: Check, HelpCircle, X
- [ ] Handle mutations with loading states
- [ ] Invalidate schedule queries on success
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-012: Create Schedule page with timeline view
**Description:** As a participant, I want to see all hackathon events in a timeline view so I can plan my schedule.

**Acceptance Criteria:**
- [ ] Create pages/Schedule.tsx
- [ ] Fetch hackathon by slug and schedule by hackathonId (dependent queries)
- [ ] Group events by day using helper function
- [ ] Display day headers with formatted dates
- [ ] Render EventCard for each event showing: name, description, type badge, time, location, virtual link, RSVP counts
- [ ] Show mandatory indicator (red badge with AlertCircle icon and "Required" text)
- [ ] Show virtual link with Video icon (visible to all registered users)
- [ ] Include RsvpButton in each event card
- [ ] Add "Back to Hackathon" link
- [ ] Show empty state if no events scheduled
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-013: Add schedule route to app
**Description:** As a developer, I need to add routing for the schedule page so users can navigate to it.

**Acceptance Criteria:**
- [ ] Import SchedulePage component in App.tsx
- [ ] Add route: /hackathons/:slug/schedule
- [ ] Typecheck passes
- [ ] Verify route works in browser

### US-014: Create EventFormModal component
**Description:** As an organizer, I want to create and edit events through a modal form so I can build the hackathon agenda.

**Acceptance Criteria:**
- [ ] Create components/EventFormModal.tsx
- [ ] Use React Hook Form with Zod validation
- [ ] Include fields: name*, description, eventType dropdown, location, virtualLink (URL validation), startsAt*, endsAt* (datetime-local), isMandatory (switch)
- [ ] Support both create and edit modes (detect via event prop)
- [ ] Use framer-motion for modal animations
- [ ] Show validation errors inline
- [ ] Handle create/update mutations with loading states
- [ ] Invalidate schedule queries on success
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-015: Create DeleteEventModal component
**Description:** As an organizer, I want to confirm before deleting events so I don't accidentally remove important schedule items.

**Acceptance Criteria:**
- [ ] Create components/DeleteEventModal.tsx
- [ ] Show warning with AlertTriangle icon
- [ ] Display event name in confirmation message
- [ ] Warn that RSVPs and attendance will be deleted
- [ ] Use destructive button variant for delete action
- [ ] Handle delete mutation with loading state
- [ ] Invalidate schedule queries on success
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-016: Create AttendanceModal component
**Description:** As an organizer, I want to track attendance for events with checkboxes so I can record who showed up.

**Acceptance Criteria:**
- [ ] Create components/AttendanceModal.tsx
- [ ] Fetch attendees when modal opens
- [ ] Display attendee list with name, email, RSVP status badge
- [ ] Show checkbox for multi-select with "Select All" option
- [ ] Show Present/Absent button per attendee (toggles attended status)
- [ ] Show "Mark Present" and "Mark Absent" bulk action buttons when items selected
- [ ] Display present count (X / Y present)
- [ ] Handle individual and bulk mutations
- [ ] Invalidate queries on success
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-017: Create ScheduleManagementSection component
**Description:** As an organizer, I want to manage events from the hackathon detail page so I have quick access to schedule operations.

**Acceptance Criteria:**
- [ ] Create components/ScheduleManagementSection.tsx
- [ ] Display Card with "Schedule & Events" title and Calendar icon
- [ ] Show "Add Event" button in header
- [ ] List all events with: name, type badge, mandatory indicator, time, location, RSVP count
- [ ] Show 3 action buttons per event: Attendance (Users icon), Edit (Pencil), Delete (Trash2)
- [ ] Manage state for 3 modals: EventFormModal, DeleteEventModal, AttendanceModal
- [ ] Show empty state message if no events
- [ ] Follow JudgingCriteriaSection pattern exactly
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-018: Integrate schedule into HackathonDetail page
**Description:** As an organizer, I want to see schedule management on the hackathon detail page so I can manage all aspects in one place.

**Acceptance Criteria:**
- [ ] Import ScheduleManagementSection in HackathonDetail.tsx
- [ ] Add ScheduleManagementSection after JudgesSection (around line 449) with isOrganizer check
- [ ] Add "View Full Schedule" card in Quick Info section with Calendar icon and link to /hackathons/{slug}/schedule
- [ ] Card should be visible to all registered users (not just organizers)
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-019: Add Checkbox UI component if missing
**Description:** As a developer, I need a Checkbox component for the attendance tracking UI.

**Acceptance Criteria:**
- [ ] Check if components/ui/checkbox.tsx exists
- [ ] If missing, create checkbox component using @radix-ui/react-checkbox
- [ ] If missing, run: npm install @radix-ui/react-checkbox
- [ ] Component follows shadcn/ui patterns with proper styling
- [ ] Typecheck passes

## Non-Goals

- No recurring events (hackathons are short enough for one-time events)
- No automatic RSVP enforcement for mandatory events (just visual indicator)
- No QR code check-in system (manual checkbox only in MVP)
- No email notifications for schedule changes or reminders
- No calendar sync (Google Calendar, iCal export)
- No waitlist or capacity limits per event
- No event prerequisites or dependencies
- No automatic scheduling or conflict detection
- No virtual link access restrictions (visible to all registered participants)

## Technical Considerations

### Existing Backend Infrastructure
- EventAttendee entity already exists in schema.sql (lines 217-246)
- ScheduleEvent entity and basic CRUD already implemented
- ScheduleService, ScheduleController, ScheduleEventRepository already exist
- Need to add RSVP and attendance methods to existing service/controller

### Frontend Patterns
- Follow judging feature patterns (JudgingCriteriaSection, CriteriaFormModal)
- Use React Hook Form + Zod for form validation
- Use React Query for data fetching with 5-minute stale time
- Use framer-motion for modal animations
- Use shadcn/ui components (Card, Button, Input, etc.)

### Security Model
- Virtual links visible to all registered participants (no RSVP required)
- Only organizers can create/edit/delete events
- Only organizers can view attendee lists and mark attendance
- Users must be registered for hackathon to RSVP
- Backend validates authorization using hackathonService.isUserOrganizer()

### Data Model
- RSVP status values: "attending", "maybe", "not_attending"
- Event types: workshop, presentation, meal, deadline, ceremony, networking, other
- EventAttendee has unique constraint on (event_id, user_id)
- Attended is boolean (no timestamp tracking in MVP)

### Timeline View
- Events grouped by day (not calendar grid)
- Uses toLocaleDateString() for formatting
- Sorted by startsAt (database query handles ordering)
- Better for dense 24-48 hour hackathon schedules
