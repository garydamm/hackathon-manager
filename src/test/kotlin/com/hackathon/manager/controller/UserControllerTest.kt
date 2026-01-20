package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.auth.UpdateUserRequest
import com.hackathon.manager.dto.auth.UserResponse
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.UserService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.FilterType
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.OffsetDateTime
import java.util.*

@WebMvcTest(
    controllers = [UserController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class UserControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

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

    private fun createUserResponse(
        id: UUID = testUserId
    ) = UserResponse(
        id = id,
        email = "test@example.com",
        firstName = "Test",
        lastName = "User",
        displayName = "TestUser",
        avatarUrl = null,
        bio = "A test user",
        skills = listOf("Kotlin", "Java"),
        githubUrl = "https://github.com/testuser",
        linkedinUrl = null,
        portfolioUrl = null,
        createdAt = OffsetDateTime.now()
    )

    @Test
    fun `getCurrentUser should return 401 without authentication`() {
        mockMvc.perform(get("/api/users/me"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `getCurrentUser should return user when authenticated`() {
        whenever(userService.getUserById(testUserId))
            .thenReturn(createUserResponse())

        mockMvc.perform(
            get("/api/users/me")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.email").value("test@example.com"))
            .andExpect(jsonPath("$.firstName").value("Test"))
            .andExpect(jsonPath("$.lastName").value("User"))
    }

    @Test
    fun `updateCurrentUser should return 401 without authentication`() {
        val request = UpdateUserRequest(firstName = "Updated")

        mockMvc.perform(
            put("/api/users/me")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `updateCurrentUser should return updated user when successful`() {
        val request = UpdateUserRequest(
            firstName = "Updated",
            lastName = "Name",
            bio = "Updated bio"
        )

        whenever(userService.updateUser(eq(testUserId), any()))
            .thenReturn(createUserResponse().copy(
                firstName = "Updated",
                lastName = "Name",
                bio = "Updated bio"
            ))

        mockMvc.perform(
            put("/api/users/me")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.firstName").value("Updated"))
            .andExpect(jsonPath("$.lastName").value("Name"))
            .andExpect(jsonPath("$.bio").value("Updated bio"))
    }

    @Test
    fun `getUserById should return user`() {
        whenever(userService.getUserById(testUserId))
            .thenReturn(createUserResponse())

        mockMvc.perform(
            get("/api/users/$testUserId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testUserId.toString()))
            .andExpect(jsonPath("$.email").value("test@example.com"))
    }

    @Test
    fun `getUserById should return 404 when not found`() {
        whenever(userService.getUserById(testUserId))
            .thenThrow(ApiException("User not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            get("/api/users/$testUserId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    private fun UserResponse.copy(
        firstName: String = this.firstName,
        lastName: String = this.lastName,
        bio: String? = this.bio
    ) = UserResponse(
        id = this.id,
        email = this.email,
        firstName = firstName,
        lastName = lastName,
        displayName = this.displayName,
        avatarUrl = this.avatarUrl,
        bio = bio,
        skills = this.skills,
        githubUrl = this.githubUrl,
        linkedinUrl = this.linkedinUrl,
        portfolioUrl = this.portfolioUrl,
        createdAt = this.createdAt
    )
}
