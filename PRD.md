# PRD: Advanced Session Management System

## Introduction

Enhance the hackathon manager's authentication system with proactive session management, activity tracking, and multiple device support. This comprehensive overhaul addresses both user experience (preventing unexpected session expiration) and security (device management, secure token storage) to create an enterprise-grade session management system.

Currently, users experience session expiration after 24 hours with no warning, leading to disruption when tokens expire during active use. This PRD implements intelligent session management that anticipates expiration, warns users, extends sessions based on activity, and provides visibility into active sessions across devices.

## Goals

- Eliminate unexpected session expiration through proactive token refresh
- Warn users 5 minutes before session expires with clear countdown
- Automatically extend sessions when users are actively working
- Provide "Remember me" option for 7-day sessions
- Enable users to view and revoke active sessions across devices
- Improve security with HttpOnly cookie support (gradual migration)
- Maintain backward compatibility during cookie migration
- Decode and validate JWTs on frontend for better UX

## User Stories

### US-001: Add JWT decoding utility
**Description:** As a developer, I need to decode JWT tokens on the frontend so I can extract expiration time and other claims without making API calls.

**Acceptance Criteria:**
- [x] Create `frontend/src/utils/jwt.ts` with `decodeToken()` function
- [x] Function safely decodes JWT and returns payload (exp, iat, sub, email)
- [x] Handle invalid tokens gracefully (return null)
- [x] Function extracts expiration timestamp in milliseconds
- [x] Unit tests added for JWT decoding utility
- [x] Unit tests pass
- [x] Typecheck passes

### US-002: Implement proactive token refresh timer
**Description:** As a user, I want my session to refresh automatically before expiration so I'm never interrupted while working.

**Acceptance Criteria:**
- [x] Timer checks token expiration on app load and after each refresh
- [x] Automatically refreshes token 5 minutes (300 seconds) before expiration
- [x] Timer clears when user logs out
- [x] Timer resets after successful manual refresh
- [x] Console log when proactive refresh occurs (for debugging)
- [x] Unit tests added for refresh timer logic
- [x] Unit tests pass
- [x] Typecheck passes
- [ ] Verify automatic refresh works in browser (leave tab open for 23 hours 55 min)

### US-003: Create session countdown UI component
**Description:** As a user, I want to see how much time remains in my session so I'm never caught off guard by expiration.

**Acceptance Criteria:**
- [x] Create `SessionCountdown.tsx` component
- [x] Displays remaining time in format: "Session expires in 4m 32s"
- [x] Updates every second
- [x] Uses yellow/warning styling when < 5 minutes remain
- [x] Hides when > 10 minutes remain (unobtrusive)
- [x] Shows in fixed position (top-right corner, below navbar)
- [x] Unit tests added for countdown component
- [x] Unit tests pass
- [x] Typecheck passes

### US-004: Display session timeout countdown notification
**Description:** As a user, I want a prominent warning when my session is about to expire so I can save my work or extend it.

**Acceptance Criteria:**
- [x] Notification appears when < 5 minutes remain
- [x] Shows countdown with "Extend Session" button
- [x] Clicking "Extend Session" triggers token refresh
- [x] Notification dismisses after successful refresh
- [x] Uses toast/banner style (less intrusive than current expired banner)
- [x] Unit tests added for notification logic
- [x] Unit tests pass
- [x] Typecheck passes
- [ ] Verify notification appears and extend button works in browser

### US-005: Add activity tracking to API client
**Description:** As a developer, I need to track user activity so sessions can be extended automatically when users are actively working.

**Acceptance Criteria:**
- [x] Track timestamp of last "meaningful" API call (POST, PUT, DELETE, PATCH)
- [x] Exclude GET requests from activity tracking (viewing isn't active work)
- [x] Store last activity timestamp in memory (not localStorage)
- [x] Expose `getLastActivityTime()` function
- [x] Unit tests added for activity tracking
- [x] Unit tests pass
- [x] Typecheck passes

### US-006: Backend endpoint to extend session on activity
**Description:** As a user, I want my session to automatically extend when I'm actively working so I don't have to manually extend it.

**Acceptance Criteria:**
- [x] Create `POST /api/auth/extend-session` endpoint
- [x] Requires valid access token (authenticated)
- [x] Issues new access + refresh tokens with full duration
- [x] Returns same response format as `/auth/refresh`
- [x] Rate limit: max 1 extend per minute per user
- [x] Unit tests added for extend session endpoint
- [x] Unit tests pass
- [x] Typecheck passes

### US-007: Integrate activity-based session extension
**Description:** As a user, I want my session to extend automatically when I perform actions so I never see expiration warnings during active use.

**Acceptance Criteria:**
- [x] Check if last activity was within 5 minutes when countdown would show
- [x] If active, call `/api/auth/extend-session` instead of showing countdown
- [x] Update refresh timer after successful extension
- [x] Only extend once per activity period (avoid spam)
- [x] Console log when activity-based extension occurs
- [x] Unit tests added for activity extension logic
- [x] Unit tests pass
- [x] Typecheck passes
- [ ] Verify session extends during active use in browser

### US-008: Backend support for "Remember me" (7-day tokens)
**Description:** As a user, I want a "Remember me" option during login so I don't have to log in every day on my personal device.

**Acceptance Criteria:**
- [x] Add `rememberMe?: boolean` parameter to login endpoint
- [x] When `rememberMe=true`, issue tokens with 7-day expiration (vs 24 hours)
- [x] Refresh tokens also get 30-day expiration when remember me enabled
- [x] Token payload includes `rememberMe` claim for debugging
- [x] Unit tests added for remember me token generation
- [x] Unit tests pass
- [x] Typecheck passes

### US-009: Add "Remember me" checkbox to login form
**Description:** As a user, I want a "Remember me" checkbox on the login form so I can choose longer sessions on trusted devices.

**Acceptance Criteria:**
- [x] Add checkbox below password field: "Remember me for 7 days"
- [x] Checkbox defaults to unchecked (secure default)
- [x] Pass `rememberMe` value to login API call
- [x] Show helper text: "Only use on personal devices"
- [x] Unit tests added for checkbox component
- [x] Unit tests pass
- [x] Typecheck passes
- [ ] Verify checkbox appears and passes value in browser

### US-010: Store and use remember me preference
**Description:** As a developer, I need to store the remember me preference so the token refresh logic uses the correct duration.

**Acceptance Criteria:**
- [ ] Store `rememberMe` flag in localStorage after successful login
- [ ] Read flag when calculating refresh timer duration
- [ ] Adjust countdown thresholds for 7-day sessions (warn at 30 min, not 5 min)
- [ ] Clear flag on logout
- [ ] Unit tests added for preference storage logic
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-011: Add sessions table for device tracking
**Description:** As a developer, I need to track active sessions per user so users can see and manage their logged-in devices.

**Acceptance Criteria:**
- [ ] Create `user_sessions` table with columns: id, user_id, refresh_token_hash, device_info, ip_address, last_activity_at, created_at
- [ ] Add index on user_id for fast lookup
- [ ] Add unique constraint on refresh_token_hash
- [ ] Generate and run Flyway migration
- [ ] Unit tests added for session entity
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-012: Backend endpoint to list active sessions
**Description:** As a user, I want to see all my active sessions so I know which devices are logged in.

**Acceptance Criteria:**
- [ ] Create `GET /api/auth/sessions` endpoint
- [ ] Requires valid access token (authenticated)
- [ ] Returns list of active sessions for current user
- [ ] Each session includes: id, device_info, ip_address, last_activity_at, created_at, is_current (true for current session)
- [ ] Sort by last_activity_at descending (most recent first)
- [ ] Exclude expired sessions (where refresh token expired)
- [ ] Unit tests added for list sessions endpoint
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-013: Backend endpoint to revoke session
**Description:** As a user, I want to revoke a specific session so I can log out other devices remotely.

**Acceptance Criteria:**
- [ ] Create `DELETE /api/auth/sessions/{sessionId}` endpoint
- [ ] Requires valid access token (authenticated)
- [ ] User can only revoke their own sessions
- [ ] Deletes session from database
- [ ] Invalidates associated refresh token
- [ ] Returns 404 if session not found or not owned by user
- [ ] Returns 400 if trying to revoke current session (use logout instead)
- [ ] Unit tests added for revoke session endpoint
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-014: Create session management page
**Description:** As a user, I want a dedicated page to manage my active sessions across devices.

**Acceptance Criteria:**
- [ ] Create `/settings/sessions` route
- [ ] Add protected route to App.tsx
- [ ] Create `SessionManagementPage.tsx` with AppLayout
- [ ] Add "Sessions" link to user dropdown menu in navbar
- [ ] Page title: "Active Sessions"
- [ ] Empty state when no sessions
- [ ] Unit tests added for page component
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify page loads and navigation works in browser

### US-015: Display active sessions with device info
**Description:** As a user, I want to see details about each active session so I can identify which devices are logged in.

**Acceptance Criteria:**
- [ ] Create `SessionCard.tsx` component
- [ ] Show device info (browser, OS) with appropriate icon
- [ ] Show IP address (masked: 192.168.*.*)
- [ ] Show last activity as relative time ("2 hours ago")
- [ ] Show created date
- [ ] Badge indicating "Current Session" for active session
- [ ] Current session card styled differently (highlighted border)
- [ ] Unit tests added for session card component
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify session cards display correctly in browser

### US-016: Add revoke session functionality
**Description:** As a user, I want to revoke individual sessions so I can remotely log out devices I no longer use.

**Acceptance Criteria:**
- [ ] Add "Revoke" button to each session card (except current)
- [ ] Show confirmation dialog: "Revoke this session? You'll be logged out on that device."
- [ ] Call `DELETE /api/auth/sessions/{id}` on confirm
- [ ] Remove session from list on success
- [ ] Show success toast: "Session revoked successfully"
- [ ] Show error toast if revoke fails
- [ ] Unit tests added for revoke functionality
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify revoke button works in browser

### US-017: Backend cookie-based authentication middleware
**Description:** As a developer, I need to support HttpOnly cookies for token storage so tokens are protected from XSS attacks.

**Acceptance Criteria:**
- [ ] Create `JwtCookieFilter` that reads tokens from cookies as fallback
- [ ] Check `Authorization` header first, then `accessToken` cookie
- [ ] Configure cookie security: HttpOnly, Secure (HTTPS only), SameSite=Strict
- [ ] Cookie path: `/` (all routes)
- [ ] Unit tests added for cookie authentication filter
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-018: Update auth endpoints to support cookies
**Description:** As a developer, I need auth endpoints to set HttpOnly cookies so frontend can use cookie-based auth.

**Acceptance Criteria:**
- [ ] Add `useCookies` query param to login/register/refresh endpoints (default: false)
- [ ] When `useCookies=true`, set `accessToken` and `refreshToken` HttpOnly cookies
- [ ] Still return tokens in response body for backward compatibility
- [ ] Cookie max-age matches token expiration
- [ ] Add `DELETE /api/auth/logout` endpoint that clears cookies
- [ ] Unit tests added for cookie-based auth flow
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-019: Frontend support for cookie-based auth
**Description:** As a developer, I need the frontend API client to support cookie-based authentication alongside localStorage.

**Acceptance Criteria:**
- [ ] Add `useCookies` flag to authService
- [ ] When `useCookies=true`, send `useCookies=true` param to auth endpoints
- [ ] Don't store tokens in localStorage when using cookies
- [ ] Still read user object to localStorage (not sensitive)
- [ ] Cookies automatically sent by browser with requests
- [ ] Unit tests added for cookie-based client
- [ ] Unit tests pass
- [ ] Typecheck passes

### US-020: Add configuration to toggle between storage methods
**Description:** As an admin, I want to configure token storage method per environment so I can gradually migrate to cookies.

**Acceptance Criteria:**
- [ ] Add `VITE_USE_COOKIES` environment variable (default: false)
- [ ] Frontend reads config and sets `authService.useCookies` accordingly
- [ ] Backend logs which storage method client is using
- [ ] Add settings UI toggle (for user preference in future)
- [ ] Document migration path in README
- [ ] Unit tests added for configuration logic
- [ ] Unit tests pass
- [ ] Typecheck passes
- [ ] Verify both storage methods work in browser

### US-021: Add UI system tests for session management
**Description:** As a developer, I need end-to-end tests for the complete session management flow to ensure all features work together.

**Acceptance Criteria:**
- [ ] UI system test: Login with "Remember me" → Verify 7-day token issued
- [ ] UI system test: Proactive refresh → Verify token refreshes before expiration
- [ ] UI system test: Activity tracking → Perform action → Verify session extends
- [ ] UI system test: Session countdown → Wait for warning → Verify countdown appears
- [ ] UI system test: Navigate to sessions page → Verify current session listed
- [ ] UI system test: Create second session → Revoke first → Verify removed
- [ ] UI system test: Login with cookies → Verify tokens not in localStorage
- [ ] UI system tests pass
- [ ] Typecheck passes

## Non-Goals

- Automatic logout on inactivity (detecting true inactivity is complex)
- Biometric authentication or 2FA (out of scope)
- Session history/audit log (only current active sessions)
- Geolocation-based security (blocking logins from new locations)
- Push notifications for new device logins
- Limiting maximum concurrent sessions per user
- Single sign-on (SSO) or OAuth integration
- Remember me default to "checked" (security risk)
- Removing localStorage support entirely (gradual migration only)

## Technical Considerations

### Existing Components to Reuse
- Current `SessionExpiredBanner` for reference
- Existing `authService` and `api` client architecture
- Current JWT token provider and authentication filter
- Existing toast notification system

### Known Constraints
- Backend uses Spring Boot with Kotlin
- Frontend uses React with TypeScript + Vite
- Database is PostgreSQL with Flyway migrations
- JWT tokens use HS256 signing
- Current token expiration: access=24h, refresh=7d

### Performance Considerations
- Proactive refresh timer uses single global interval (not per-component)
- Activity tracking uses debouncing to avoid excessive storage writes
- Session list endpoint should be cached (5 minute stale time)
- Cookie size: tokens ~200 bytes, well under 4KB limit

### Security Considerations
- HttpOnly cookies prevent XSS token theft
- SameSite=Strict prevents CSRF attacks
- Rate limiting on extend-session endpoint prevents abuse
- Refresh token hashing in database (never store plaintext)
- IP address masking in UI for privacy
- Current session can't be revoked (prevent lockout)

### Migration Strategy
- Support both localStorage and cookies simultaneously
- Environment variable to toggle default storage method
- Users on localStorage continue working (no breaking change)
- New users can opt into cookies via config
- Future: add UI toggle for user preference

### Testing Strategy
- Unit tests for all business logic (timers, activity tracking, JWT decoding)
- Integration tests for backend endpoints
- UI system tests for complete user flows using Playwright
- Manual testing for countdown timing and token refresh
- Cross-browser testing for cookie support

## Success Metrics

- Zero unexpected session expirations for active users
- Session countdown appears before expiration (100% of cases)
- Proactive refresh completes successfully (>99% success rate)
- Users can identify and revoke suspicious sessions
- "Remember me" adoption rate tracked
- Cookie adoption rate tracked per environment
- Reduced support tickets related to session expiration
