# PRD: Password Reset Functionality

## Introduction

Add a secure password reset flow to allow users who have forgotten their passwords to regain access to their accounts. Users will request a password reset via email, receive a time-limited reset link, and set a new password. The system will send confirmation emails and invalidate tokens after use.

## Goals

- Enable users to reset forgotten passwords without admin intervention
- Send secure, time-limited reset tokens via email
- Enforce existing password requirements (8+ chars, uppercase, lowercase, number)
- Prevent token reuse and ensure tokens expire after 15 minutes
- Notify users when their password is successfully changed
- Provide clear error messages for expired or invalid tokens

## User Stories

### US-001: Add password_reset_tokens table
**Description:** As a developer, I need to store password reset tokens so they can be validated and tracked.

**Acceptance Criteria:**
- [x] Create migration file with `password_reset_tokens` table
- [x] Columns: id (UUID primary key), user_id (UUID foreign key to users), token (VARCHAR 255 unique not null), expires_at (TIMESTAMP not null), created_at (TIMESTAMP default now()), used_at (TIMESTAMP nullable)
- [x] Add index on token column for fast lookups
- [x] Add index on user_id for cleanup queries
- [x] Run migration successfully
- [x] Typecheck passes

### US-002: Create PasswordResetToken entity
**Description:** As a developer, I need a JPA entity for password reset tokens so I can query and persist them.

**Acceptance Criteria:**
- [x] Create `PasswordResetToken.kt` entity in entity package
- [x] Map all table columns with proper types (UUID, String, OffsetDateTime)
- [x] Add `@ManyToOne` relationship to User entity
- [x] Include @CreationTimestamp for createdAt
- [x] Add helper method `isExpired(): Boolean` that checks current time vs expiresAt
- [x] Add helper method `isUsed(): Boolean` that checks if usedAt is not null
- [x] Typecheck passes

### US-003: Create PasswordResetTokenRepository
**Description:** As a developer, I need a repository for password reset tokens so I can perform CRUD operations.

**Acceptance Criteria:**
- [x] Create `PasswordResetTokenRepository.kt` extending JpaRepository
- [x] Add method: `findByToken(token: String): Optional<PasswordResetToken>`
- [x] Add method: `findByUserIdAndUsedAtIsNullAndExpiresAtAfter(userId: UUID, currentTime: OffsetDateTime): List<PasswordResetToken>`
- [x] Add method: `deleteByExpiresAtBefore(cutoffTime: OffsetDateTime): Int`
- [x] Typecheck passes

### US-004: Add password reset DTOs
**Description:** As a developer, I need DTOs for password reset operations so I can handle requests and responses with validation.

**Acceptance Criteria:**
- [x] Create `PasswordResetDtos.kt` file in dto/auth package
- [x] Add `ForgotPasswordRequest` data class with email field (validated as email)
- [x] Add `ResetPasswordRequest` data class with token, newPassword, confirmPassword fields
- [x] Add validation annotations for minimum password length (8 chars)
- [x] Add custom validator or service-level check for password requirements (uppercase, lowercase, number)
- [x] Add `PasswordResetResponse` data class with message field
- [x] Typecheck passes

### US-005: Create EmailService interface and stub implementation
**Description:** As a developer, I need an email service so password reset links can be sent to users.

**Acceptance Criteria:**
- [x] Create `EmailService.kt` interface with method: `sendPasswordResetEmail(toEmail: String, resetToken: String, userFirstName: String)`
- [x] Create `EmailServiceImpl.kt` that implements EmailService
- [x] For MVP, implementation logs email to console with formatted message including reset URL
- [x] Reset URL format: `${frontendUrl}/reset-password?token=${resetToken}`
- [x] Add `@Value("\${app.frontend.url}")` to inject frontend URL from application properties
- [x] Add configuration property in application.yml: `app.frontend.url: http://localhost:5173`
- [x] Mark class as @Service
- [x] Typecheck passes

### US-006: Add password reset methods to UserService
**Description:** As a developer, I need service methods for password reset operations so the controller can handle requests.

**Acceptance Criteria:**
- [x] Inject PasswordResetTokenRepository and EmailService into UserService
- [x] Add `requestPasswordReset(email: String)` method that creates token with 15-minute expiry and calls email service
- [x] Generate token using `UUID.randomUUID().toString()` for cryptographic randomness
- [x] If email doesn't exist, silently succeed (don't reveal user existence)
- [x] Invalidate any existing unused tokens for the user before creating new one
- [x] Add `validateResetToken(token: String): PasswordResetToken` method that checks token exists, not used, not expired
- [x] Add `resetPassword(token: String, newPassword: String)` method that validates token, updates user password, marks token as used
- [x] Use passwordEncoder.encode() for hashing new password
- [x] Throw ApiException with BAD_REQUEST if token invalid/expired/used
- [x] Typecheck passes

### US-007: Add password validation helper
**Description:** As a developer, I need to validate password requirements so users create secure passwords on reset.

**Acceptance Criteria:**
- [x] Add `validatePassword(password: String)` private method in UserService
- [x] Check length >= 8 characters
- [x] Check contains at least one uppercase letter (regex: `[A-Z]`)
- [x] Check contains at least one lowercase letter (regex: `[a-z]`)
- [x] Check contains at least one number (regex: `[0-9]`)
- [x] Throw ApiException with BAD_REQUEST and descriptive message if validation fails
- [x] Call this method in resetPassword() before encoding
- [x] Typecheck passes

### US-008: Add password reset endpoints to AuthController
**Description:** As a developer, I need REST endpoints for password reset so the frontend can trigger the flow.

**Acceptance Criteria:**
- [x] Add POST /api/auth/forgot-password endpoint accepting ForgotPasswordRequest
- [x] Endpoint calls userService.requestPasswordReset() and returns 200 OK with success message
- [x] Always return success even if email doesn't exist (security best practice)
- [x] Add POST /api/auth/reset-password endpoint accepting ResetPasswordRequest
- [x] Validate newPassword matches confirmPassword before calling service
- [x] Return 200 OK with success message on successful reset
- [x] Return 400 BAD_REQUEST with error message if token invalid or passwords don't match
- [x] Both endpoints are public (no authentication required)
- [x] Typecheck passes

### US-009: Add password reset confirmation email
**Description:** As a user, I want to receive email confirmation after password change so I know my account was modified.

**Acceptance Criteria:**
- [x] Add `sendPasswordChangeConfirmation(toEmail: String, userFirstName: String)` method to EmailService interface
- [x] Implement method in EmailServiceImpl to log confirmation message
- [x] Message should inform user their password was changed and suggest contacting support if not them
- [x] Call this method at end of userService.resetPassword() after successful password update
- [x] Typecheck passes

### US-010: Add TypeScript types for password reset
**Description:** As a developer, I need TypeScript types for password reset operations so the frontend has type safety.

**Acceptance Criteria:**
- [x] Add `ForgotPasswordRequest` interface in types/index.ts with email field
- [x] Add `ResetPasswordRequest` interface with token, newPassword, confirmPassword fields
- [x] Add `PasswordResetResponse` interface with message field
- [x] Typecheck passes

### US-011: Add password reset methods to auth service
**Description:** As a developer, I need API client methods for password reset so components can call the backend.

**Acceptance Criteria:**
- [x] Add `forgotPassword(email: string): Promise<PasswordResetResponse>` to services/auth.ts
- [x] Add `resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<PasswordResetResponse>` to services/auth.ts
- [x] Both methods use centralized api client with proper error handling
- [x] Typecheck passes

### US-012: Create ForgotPassword page
**Description:** As a user, I want to request a password reset by entering my email so I can regain access to my account.

**Acceptance Criteria:**
- [x] Create pages/ForgotPassword.tsx component
- [x] Use React Hook Form with Zod schema validating email format
- [x] Show email input field with Mail icon
- [x] Show "Send Reset Link" submit button
- [x] Display loading state during submission (Loader2 icon with "Sending...")
- [x] Show success message after submission: "If an account exists with that email, you will receive a password reset link shortly."
- [x] Show error message if API call fails
- [x] Include "Back to Login" link
- [x] Use AuthLayout for consistent styling with Login/Register pages
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-013: Create ResetPassword page
**Description:** As a user, I want to set a new password using the reset link so I can access my account.

**Acceptance Criteria:**
- [x] Create pages/ResetPassword.tsx component
- [x] Extract token from URL query params using useSearchParams()
- [x] Use React Hook Form with Zod schema validating password requirements and matching passwords
- [x] Show newPassword and confirmPassword fields with Lock icons
- [x] Display password requirements as helper text below fields (8+ chars, uppercase, lowercase, number)
- [x] Show "Reset Password" submit button
- [x] Display loading state during submission
- [x] Navigate to /login with success message on successful reset
- [x] Show error message if token invalid/expired or API call fails
- [x] Use AuthLayout for consistent styling
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-014: Add password reset routes to App
**Description:** As a developer, I need to add routing for password reset pages so users can navigate to them.

**Acceptance Criteria:**
- [ ] Import ForgotPasswordPage and ResetPasswordPage in App.tsx
- [ ] Add public route: /forgot-password
- [ ] Add public route: /reset-password
- [ ] Both routes should be outside ProtectedRoute (no authentication required)
- [ ] Typecheck passes
- [ ] Verify routes work in browser

### US-015: Update existing forgot password link
**Description:** As a user, I want the forgot password link on login page to work so I can reset my password.

**Acceptance Criteria:**
- [ ] Verify Login.tsx already has Link to /forgot-password (line 89-94)
- [ ] No changes needed - route will work once US-014 is complete
- [ ] Test clicking "Forgot password?" link navigates to forgot password page
- [ ] Verify changes work in browser

### US-016: Add cleanup job for expired tokens
**Description:** As a developer, I need to periodically clean up expired tokens so the database doesn't grow unbounded.

**Acceptance Criteria:**
- [ ] Create `ScheduledTasks.kt` class with @Component annotation
- [ ] Add @Scheduled method `cleanupExpiredPasswordResetTokens()` running daily at midnight
- [ ] Use cron expression: `@Scheduled(cron = "0 0 0 * * ?")`
- [ ] Method calls passwordResetTokenRepository.deleteByExpiresAtBefore(cutoffTime = 7 days ago)
- [ ] Log count of deleted tokens at INFO level
- [ ] Add @EnableScheduling to main application class if not already present
- [ ] Typecheck passes

## Non-Goals

- No SMS-based password reset (email only)
- No security questions or alternative recovery methods
- No password history enforcement (preventing reuse of old passwords)
- No rate limiting on forgot password requests (can be added later)
- No CAPTCHA on forgot password form (can be added later)
- No multi-factor authentication during reset flow
- No actual email delivery via SMTP/SendGrid (console logging only in MVP)
- No password strength meter UI
- No "magic link" login (token only allows password reset, not direct login)

## Technical Considerations

### Existing Infrastructure
- UserService, UserRepository, AuthController already exist
- PasswordEncoder already configured in Spring Security
- Frontend uses React Hook Form + Zod pattern consistently
- AuthLayout component exists for consistent auth page styling
- Frontend uses React Router v7 for routing

### Security Model
- Tokens are UUID v4 (cryptographically secure random)
- Tokens expire after 15 minutes
- Tokens can only be used once (marked as used after successful reset)
- Email address enumeration prevented (always return success message)
- Password validation matches registration requirements for consistency
- User receives confirmation email after password change

### Password Requirements (Match Registration)
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Defined in Register.tsx lines 20-25

### Email Service Evolution
- MVP: Log emails to console for development/testing
- Future: Replace EmailServiceImpl with actual SMTP integration (SendGrid, AWS SES, etc.)
- Interface allows swapping implementations without changing service/controller code

### Frontend Error Handling
- Use ApiError class pattern from existing auth pages
- Display inline error messages using framer-motion for smooth animations
- Provide user-friendly messages for common errors (invalid token, expired token, passwords don't match)

### Database Cleanup
- Scheduled task runs daily to remove tokens older than 7 days
- Prevents unbounded table growth
- Expired tokens immediately invalidated by service logic (don't need instant removal)
