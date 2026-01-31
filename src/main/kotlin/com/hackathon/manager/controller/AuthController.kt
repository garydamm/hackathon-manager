package com.hackathon.manager.controller

import com.hackathon.manager.dto.auth.*
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.AuthService
import com.hackathon.manager.service.UserService
import org.springframework.http.HttpStatus
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val userService: UserService
) {

    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<AuthResponse> {
        val response = authService.register(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<AuthResponse> {
        val response = authService.login(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/refresh")
    fun refreshToken(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<AuthResponse> {
        val response = authService.refreshToken(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/extend-session")
    @PreAuthorize("isAuthenticated()")
    fun extendSession(@AuthenticationPrincipal principal: UserPrincipal): ResponseEntity<AuthResponse> {
        val response = authService.extendSession(principal.id)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/sessions")
    @PreAuthorize("isAuthenticated()")
    fun listActiveSessions(
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestHeader(value = "X-Refresh-Token", required = false) refreshToken: String?
    ): ResponseEntity<List<SessionResponse>> {
        val sessions = authService.listActiveSessions(principal.id, refreshToken)
        return ResponseEntity.ok(sessions)
    }

    @DeleteMapping("/sessions/{sessionId}")
    @PreAuthorize("isAuthenticated()")
    fun revokeSession(
        @PathVariable sessionId: String,
        @AuthenticationPrincipal principal: UserPrincipal,
        @RequestHeader(value = "X-Refresh-Token", required = false) refreshToken: String?
    ): ResponseEntity<Void> {
        val sessionUuid = try {
            java.util.UUID.fromString(sessionId)
        } catch (e: IllegalArgumentException) {
            throw ApiException("Invalid session ID format", HttpStatus.BAD_REQUEST)
        }

        authService.revokeSession(sessionUuid, principal.id, refreshToken)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/forgot-password")
    fun forgotPassword(@Valid @RequestBody request: ForgotPasswordRequest): ResponseEntity<PasswordResetResponse> {
        userService.requestPasswordReset(request.email)
        // Always return success even if email doesn't exist (security best practice)
        return ResponseEntity.ok(PasswordResetResponse(
            message = "If an account exists with that email, you will receive a password reset link shortly."
        ))
    }

    @PostMapping("/reset-password")
    fun resetPassword(@Valid @RequestBody request: ResetPasswordRequest): ResponseEntity<PasswordResetResponse> {
        // Validate passwords match
        if (request.newPassword != request.confirmPassword) {
            throw ApiException("Passwords do not match", HttpStatus.BAD_REQUEST)
        }

        userService.resetPassword(request.token, request.newPassword)
        return ResponseEntity.ok(PasswordResetResponse(
            message = "Your password has been successfully reset. You can now log in with your new password."
        ))
    }
}
