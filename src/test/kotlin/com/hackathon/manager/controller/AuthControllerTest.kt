package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.auth.*
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.service.AuthService
import com.hackathon.manager.service.UserService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
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
import org.springframework.test.web.servlet.MockMvc
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
}
