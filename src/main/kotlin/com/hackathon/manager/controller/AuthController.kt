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
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val userService: UserService
) {
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: RegisterRequest,
        @RequestParam(required = false, defaultValue = "false") useCookies: Boolean,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val authResponse = authService.register(request)

        if (useCookies) {
            logger.info("User ${request.email} registered using cookie-based authentication")
            setAuthCookies(authResponse, response, request.rememberMe)
        } else {
            logger.info("User ${request.email} registered using localStorage authentication")
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse)
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        @RequestParam(required = false, defaultValue = "false") useCookies: Boolean,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val authResponse = authService.login(request)

        if (useCookies) {
            logger.info("User ${request.email} logged in using cookie-based authentication")
            setAuthCookies(authResponse, response, request.rememberMe)
        } else {
            logger.info("User ${request.email} logged in using localStorage authentication")
        }

        return ResponseEntity.ok(authResponse)
    }

    @PostMapping("/refresh")
    fun refreshToken(
        @Valid @RequestBody request: RefreshTokenRequest,
        @RequestParam(required = false, defaultValue = "false") useCookies: Boolean,
        response: HttpServletResponse
    ): ResponseEntity<AuthResponse> {
        val authResponse = authService.refreshToken(request)

        if (useCookies) {
            logger.debug("Token refreshed using cookie-based authentication")
            // When refreshing, assume same session length as original (24h default)
            setAuthCookies(authResponse, response, rememberMe = false)
        } else {
            logger.debug("Token refreshed using localStorage authentication")
        }

        return ResponseEntity.ok(authResponse)
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

    @DeleteMapping("/logout")
    fun logout(response: HttpServletResponse): ResponseEntity<Void> {
        clearAuthCookies(response)
        return ResponseEntity.noContent().build()
    }

    /**
     * Sets HttpOnly authentication cookies in the response.
     * Cookie max-age is calculated based on rememberMe flag:
     * - rememberMe=true: 7 days (access token) and 30 days (refresh token)
     * - rememberMe=false: 24 hours (access token) and 7 days (refresh token)
     */
    private fun setAuthCookies(authResponse: AuthResponse, response: HttpServletResponse, rememberMe: Boolean) {
        // Access token cookie
        val accessMaxAge = if (rememberMe) 7 * 24 * 60 * 60 else 24 * 60 * 60 // 7 days or 24 hours
        val accessCookie = Cookie("accessToken", authResponse.accessToken).apply {
            isHttpOnly = true
            secure = true // HTTPS only
            path = "/"
            maxAge = accessMaxAge
            setAttribute("SameSite", "Strict")
        }

        // Refresh token cookie
        val refreshMaxAge = if (rememberMe) 30 * 24 * 60 * 60 else 7 * 24 * 60 * 60 // 30 days or 7 days
        val refreshCookie = Cookie("refreshToken", authResponse.refreshToken).apply {
            isHttpOnly = true
            secure = true // HTTPS only
            path = "/"
            maxAge = refreshMaxAge
            setAttribute("SameSite", "Strict")
        }

        response.addCookie(accessCookie)
        response.addCookie(refreshCookie)
    }

    /**
     * Clears authentication cookies by setting their max-age to 0.
     */
    private fun clearAuthCookies(response: HttpServletResponse) {
        val accessCookie = Cookie("accessToken", "").apply {
            isHttpOnly = true
            secure = true
            path = "/"
            maxAge = 0
            setAttribute("SameSite", "Strict")
        }

        val refreshCookie = Cookie("refreshToken", "").apply {
            isHttpOnly = true
            secure = true
            path = "/"
            maxAge = 0
            setAttribute("SameSite", "Strict")
        }

        response.addCookie(accessCookie)
        response.addCookie(refreshCookie)
    }
}
