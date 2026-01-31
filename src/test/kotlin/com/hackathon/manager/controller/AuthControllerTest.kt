package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.auth.*
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.AuthService
import com.hackathon.manager.service.UserService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.isNull
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.FilterType
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.OffsetDateTime
import java.util.*

@WebMvcTest(
    controllers = [AuthController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class AuthControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var authService: AuthService

    @MockBean
    lateinit var userService: UserService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    @Test
    @WithMockUser
    fun `register should return 201 when successful`() {
        val request = RegisterRequest(
            email = "new@example.com",
            password = "password123",
            firstName = "New",
            lastName = "User"
        )

        val response = AuthResponse(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "new@example.com",
                firstName = "New",
                lastName = "User",
                displayName = null,
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = OffsetDateTime.now()
            )
        )

        whenever(authService.register(any())).thenReturn(response)

        mockMvc.perform(
            post("/api/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.accessToken").value("access-token"))
            .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
            .andExpect(jsonPath("$.user.email").value("new@example.com"))
    }

    @Test
    @WithMockUser
    fun `register should return 409 when email exists`() {
        val request = RegisterRequest(
            email = "existing@example.com",
            password = "password123",
            firstName = "New",
            lastName = "User"
        )

        whenever(authService.register(any()))
            .thenThrow(ApiException("Email already registered", HttpStatus.CONFLICT))

        mockMvc.perform(
            post("/api/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict)
    }

    @Test
    @WithMockUser
    fun `register should return 400 for invalid request`() {
        val request = mapOf(
            "email" to "invalid-email",
            "password" to "short",
            "firstName" to "",
            "lastName" to "User"
        )

        mockMvc.perform(
            post("/api/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    @WithMockUser
    fun `register with rememberMe true should return 201 when successful`() {
        val request = RegisterRequest(
            email = "new@example.com",
            password = "password123",
            firstName = "New",
            lastName = "User",
            rememberMe = true
        )

        val response = AuthResponse(
            accessToken = "access-token-7-day",
            refreshToken = "refresh-token-30-day",
            user = UserResponse(
                id = testUserId,
                email = "new@example.com",
                firstName = "New",
                lastName = "User",
                displayName = null,
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = OffsetDateTime.now()
            )
        )

        whenever(authService.register(any())).thenReturn(response)

        mockMvc.perform(
            post("/api/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.accessToken").value("access-token-7-day"))
            .andExpect(jsonPath("$.refreshToken").value("refresh-token-30-day"))
            .andExpect(jsonPath("$.user.email").value("new@example.com"))
    }

    @Test
    @WithMockUser
    fun `login should return 200 when successful`() {
        val request = LoginRequest(
            email = "test@example.com",
            password = "password123"
        )

        val response = AuthResponse(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = null,
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = OffsetDateTime.now()
            )
        )

        whenever(authService.login(any())).thenReturn(response)

        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("access-token"))
            .andExpect(jsonPath("$.user.email").value("test@example.com"))
    }

    @Test
    @WithMockUser
    fun `login should return 400 for missing credentials`() {
        val request = mapOf(
            "email" to "",
            "password" to ""
        )

        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    @WithMockUser
    fun `login with rememberMe true should return 200 when successful`() {
        val request = LoginRequest(
            email = "test@example.com",
            password = "password123",
            rememberMe = true
        )

        val response = AuthResponse(
            accessToken = "access-token-7-day",
            refreshToken = "refresh-token-30-day",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = null,
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = OffsetDateTime.now()
            )
        )

        whenever(authService.login(any())).thenReturn(response)

        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("access-token-7-day"))
            .andExpect(jsonPath("$.refreshToken").value("refresh-token-30-day"))
            .andExpect(jsonPath("$.user.email").value("test@example.com"))
    }

    @Test
    @WithMockUser
    fun `refresh should return 200 when token is valid`() {
        val request = RefreshTokenRequest(refreshToken = "valid-refresh-token")

        val response = AuthResponse(
            accessToken = "new-access-token",
            refreshToken = "new-refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = null,
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = OffsetDateTime.now()
            )
        )

        whenever(authService.refreshToken(any())).thenReturn(response)

        mockMvc.perform(
            post("/api/auth/refresh")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("new-access-token"))
    }

    @Test
    @WithMockUser
    fun `refresh should return 401 for invalid token`() {
        val request = RefreshTokenRequest(refreshToken = "invalid-token")

        whenever(authService.refreshToken(any()))
            .thenThrow(ApiException("Invalid refresh token", HttpStatus.UNAUTHORIZED))

        mockMvc.perform(
            post("/api/auth/refresh")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `extend-session should return 200 when successful`() {
        val response = AuthResponse(
            accessToken = "new-access-token",
            refreshToken = "new-refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = null,
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = OffsetDateTime.now()
            )
        )

        whenever(authService.extendSession(any())).thenReturn(response)

        mockMvc.perform(
            post("/api/auth/extend-session")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("new-access-token"))
            .andExpect(jsonPath("$.refreshToken").value("new-refresh-token"))
            .andExpect(jsonPath("$.user.email").value("test@example.com"))
    }

    @Test
    fun `extend-session should return 401 when not authenticated`() {
        mockMvc.perform(
            post("/api/auth/extend-session")
                .with(csrf())
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `extend-session should return 429 when rate limit exceeded`() {
        whenever(authService.extendSession(any()))
            .thenThrow(ApiException("Session extension rate limit exceeded. Please wait 45 seconds.", HttpStatus.TOO_MANY_REQUESTS))

        mockMvc.perform(
            post("/api/auth/extend-session")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isTooManyRequests)
    }

    @Test
    fun `extend-session should return 404 when user not found`() {
        whenever(authService.extendSession(any()))
            .thenThrow(ApiException("User not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            post("/api/auth/extend-session")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `listActiveSessions should return 200 with sessions list when successful`() {
        val sessions = listOf(
            SessionResponse(
                id = UUID.randomUUID().toString(),
                deviceInfo = "Chrome on MacOS",
                ipAddress = "192.168.1.1",
                lastActivityAt = OffsetDateTime.now().toString(),
                createdAt = OffsetDateTime.now().minusDays(1).toString(),
                isCurrent = true
            ),
            SessionResponse(
                id = UUID.randomUUID().toString(),
                deviceInfo = "Firefox on Windows",
                ipAddress = "192.168.1.2",
                lastActivityAt = OffsetDateTime.now().minusHours(2).toString(),
                createdAt = OffsetDateTime.now().minusDays(3).toString(),
                isCurrent = false
            )
        )

        whenever(authService.listActiveSessions(any(), any())).thenReturn(sessions)

        mockMvc.perform(
            get("/api/auth/sessions")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .header("X-Refresh-Token", "test-refresh-token")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].deviceInfo").value("Chrome on MacOS"))
            .andExpect(jsonPath("$[0].isCurrent").value(true))
            .andExpect(jsonPath("$[1].deviceInfo").value("Firefox on Windows"))
            .andExpect(jsonPath("$[1].isCurrent").value(false))
    }

    @Test
    fun `listActiveSessions should return 200 with empty list when no sessions`() {
        whenever(authService.listActiveSessions(any(), any())).thenReturn(emptyList())

        mockMvc.perform(
            get("/api/auth/sessions")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$").isEmpty)
    }

    @Test
    fun `listActiveSessions should return 401 when not authenticated`() {
        mockMvc.perform(
            get("/api/auth/sessions")
                .with(csrf())
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `listActiveSessions should work without refresh token header`() {
        val sessions = listOf(
            SessionResponse(
                id = UUID.randomUUID().toString(),
                deviceInfo = "Chrome on MacOS",
                ipAddress = "192.168.1.1",
                lastActivityAt = OffsetDateTime.now().toString(),
                createdAt = OffsetDateTime.now().minusDays(1).toString(),
                isCurrent = false
            )
        )

        whenever(authService.listActiveSessions(eq(testUserId), isNull())).thenReturn(sessions)

        mockMvc.perform(
            get("/api/auth/sessions")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].deviceInfo").value("Chrome on MacOS"))
            .andExpect(jsonPath("$[0].isCurrent").value(false))
    }

    @Test
    fun `revokeSession should return 204 when successful`() {
        val sessionId = UUID.randomUUID()

        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/sessions/$sessionId")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `revokeSession should return 401 when not authenticated`() {
        val sessionId = UUID.randomUUID()

        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/sessions/$sessionId")
                .with(csrf())
        )
            .andExpect(status().isUnauthorized)
    }


    @Test
    fun `revokeSession should return 400 for invalid session id format`() {
        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/sessions/invalid-uuid")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `revokeSession should pass refresh token header to service`() {
        val sessionId = UUID.randomUUID()
        val refreshToken = "test-refresh-token"

        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/sessions/$sessionId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .header("X-Refresh-Token", refreshToken)
        )
            .andExpect(status().isNoContent)

        org.mockito.kotlin.verify(authService).revokeSession(eq(sessionId), eq(testUserId), eq(refreshToken))
    }

    // Cookie-based authentication tests
    @Test
    @WithMockUser
    fun `login should set cookies when useCookies is true`() {
        val loginRequest = LoginRequest(email = "test@example.com", password = "password123", rememberMe = false)
        val authResponse = AuthResponse(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = "Test User",
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = null
            )
        )
        whenever(authService.login(any())).thenReturn(authResponse)

        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .param("useCookies", "true")
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("access-token"))
            .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
            .andExpect(cookie().exists("accessToken"))
            .andExpect(cookie().value("accessToken", "access-token"))
            .andExpect(cookie().httpOnly("accessToken", true))
            .andExpect(cookie().secure("accessToken", true))
            .andExpect(cookie().path("accessToken", "/"))
            .andExpect(cookie().maxAge("accessToken", 24 * 60 * 60)) // 24 hours
            .andExpect(cookie().exists("refreshToken"))
            .andExpect(cookie().value("refreshToken", "refresh-token"))
            .andExpect(cookie().httpOnly("refreshToken", true))
            .andExpect(cookie().secure("refreshToken", true))
            .andExpect(cookie().path("refreshToken", "/"))
            .andExpect(cookie().maxAge("refreshToken", 7 * 24 * 60 * 60)) // 7 days
    }

    @Test
    @WithMockUser
    fun `login should not set cookies when useCookies is false`() {
        val loginRequest = LoginRequest(email = "test@example.com", password = "password123", rememberMe = false)
        val authResponse = AuthResponse(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = "Test User",
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = null
            )
        )
        whenever(authService.login(any())).thenReturn(authResponse)

        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .param("useCookies", "false")
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("access-token"))
            .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
            .andExpect(cookie().doesNotExist("accessToken"))
            .andExpect(cookie().doesNotExist("refreshToken"))
    }

    @Test
    @WithMockUser
    fun `login with rememberMe should set longer-lived cookies`() {
        val loginRequest = LoginRequest(email = "test@example.com", password = "password123", rememberMe = true)
        val authResponse = AuthResponse(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = "Test User",
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = null
            )
        )
        whenever(authService.login(any())).thenReturn(authResponse)

        mockMvc.perform(
            post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .param("useCookies", "true")
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(cookie().exists("accessToken"))
            .andExpect(cookie().maxAge("accessToken", 7 * 24 * 60 * 60)) // 7 days
            .andExpect(cookie().exists("refreshToken"))
            .andExpect(cookie().maxAge("refreshToken", 30 * 24 * 60 * 60)) // 30 days
    }

    @Test
    @WithMockUser
    fun `register should set cookies when useCookies is true`() {
        val registerRequest = RegisterRequest(
            email = "test@example.com",
            password = "password123",
            firstName = "Test",
            lastName = "User",
            displayName = "Test User",
            rememberMe = false
        )
        val authResponse = AuthResponse(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = "Test User",
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = null
            )
        )
        whenever(authService.register(any())).thenReturn(authResponse)

        mockMvc.perform(
            post("/api/auth/register")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .param("useCookies", "true")
                .content(objectMapper.writeValueAsString(registerRequest))
        )
            .andExpect(status().isCreated)
            .andExpect(cookie().exists("accessToken"))
            .andExpect(cookie().exists("refreshToken"))
    }

    @Test
    @WithMockUser
    fun `refresh should set cookies when useCookies is true`() {
        val refreshRequest = RefreshTokenRequest(refreshToken = "refresh-token")
        val authResponse = AuthResponse(
            accessToken = "new-access-token",
            refreshToken = "new-refresh-token",
            user = UserResponse(
                id = testUserId,
                email = "test@example.com",
                firstName = "Test",
                lastName = "User",
                displayName = "Test User",
                avatarUrl = null,
                bio = null,
                skills = null,
                githubUrl = null,
                linkedinUrl = null,
                portfolioUrl = null,
                createdAt = null
            )
        )
        whenever(authService.refreshToken(any())).thenReturn(authResponse)

        mockMvc.perform(
            post("/api/auth/refresh")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .param("useCookies", "true")
                .content(objectMapper.writeValueAsString(refreshRequest))
        )
            .andExpect(status().isOk)
            .andExpect(cookie().exists("accessToken"))
            .andExpect(cookie().exists("refreshToken"))
    }

    @Test
    @WithMockUser
    fun `logout should clear auth cookies`() {
        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/logout")
                .with(csrf())
        )
            .andExpect(status().isNoContent)
            .andExpect(cookie().exists("accessToken"))
            .andExpect(cookie().value("accessToken", ""))
            .andExpect(cookie().maxAge("accessToken", 0))
            .andExpect(cookie().exists("refreshToken"))
            .andExpect(cookie().value("refreshToken", ""))
            .andExpect(cookie().maxAge("refreshToken", 0))
    }

    @Test
    @WithMockUser
    fun `logout should set cookie security attributes`() {
        mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/auth/logout")
                .with(csrf())
        )
            .andExpect(status().isNoContent)
            .andExpect(cookie().httpOnly("accessToken", true))
            .andExpect(cookie().secure("accessToken", true))
            .andExpect(cookie().path("accessToken", "/"))
            .andExpect(cookie().httpOnly("refreshToken", true))
            .andExpect(cookie().secure("refreshToken", true))
            .andExpect(cookie().path("refreshToken", "/"))
    }
}
