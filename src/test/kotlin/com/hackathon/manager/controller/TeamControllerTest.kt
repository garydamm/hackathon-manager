package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.CreateTeamRequest
import com.hackathon.manager.dto.JoinTeamRequest
import com.hackathon.manager.dto.TeamResponse
import com.hackathon.manager.dto.UpdateTeamRequest
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.TeamService
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
    controllers = [TeamController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class TeamControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var teamService: TeamService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()
    private val testTeamId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    private fun createTeamResponse(
        id: UUID = testTeamId,
        hackathonId: UUID = testHackathonId
    ) = TeamResponse(
        id = id,
        hackathonId = hackathonId,
        name = "Test Team",
        description = "A test team",
        avatarUrl = null,
        inviteCode = "ABC12345",
        isOpen = true,
        memberCount = 3,
        members = null,
        createdAt = OffsetDateTime.now()
    )

    @Test
    fun `getTeamsByHackathon should return teams`() {
        whenever(teamService.getTeamsByHackathon(testHackathonId))
            .thenReturn(listOf(createTeamResponse()))

        mockMvc.perform(
            get("/api/teams/hackathon/$testHackathonId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$[0].name").value("Test Team"))
    }

    @Test
    fun `getTeamById should return team`() {
        whenever(teamService.getTeamById(testTeamId))
            .thenReturn(createTeamResponse())

        mockMvc.perform(
            get("/api/teams/$testTeamId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testTeamId.toString()))
            .andExpect(jsonPath("$.name").value("Test Team"))
    }

    @Test
    fun `getTeamById should return 404 when not found`() {
        whenever(teamService.getTeamById(testTeamId))
            .thenThrow(ApiException("Team not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            get("/api/teams/$testTeamId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `getMyTeam should return 401 without authentication`() {
        mockMvc.perform(get("/api/teams/hackathon/$testHackathonId/my-team"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `getMyTeam should return team when authenticated`() {
        whenever(teamService.getUserTeamInHackathon(testHackathonId, testUserId))
            .thenReturn(createTeamResponse())

        mockMvc.perform(
            get("/api/teams/hackathon/$testHackathonId/my-team")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Test Team"))
    }

    @Test
    fun `getMyTeam should return null when no team`() {
        whenever(teamService.getUserTeamInHackathon(testHackathonId, testUserId))
            .thenReturn(null)

        mockMvc.perform(
            get("/api/teams/hackathon/$testHackathonId/my-team")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(content().string(""))
    }

    @Test
    fun `createTeam should return 401 without authentication`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team"
        )

        mockMvc.perform(
            post("/api/teams")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `createTeam should return 201 when successful`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team",
            description = "A new team"
        )

        whenever(teamService.createTeam(any(), eq(testUserId)))
            .thenReturn(createTeamResponse().copy(name = "New Team"))

        mockMvc.perform(
            post("/api/teams")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("New Team"))
    }

    @Test
    fun `createTeam should return 403 when not registered`() {
        val request = CreateTeamRequest(
            hackathonId = testHackathonId,
            name = "New Team"
        )

        whenever(teamService.createTeam(any(), eq(testUserId)))
            .thenThrow(ApiException("Must be registered for the hackathon to create a team", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            post("/api/teams")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateTeam should return 200 when successful`() {
        val request = UpdateTeamRequest(name = "Updated Team")

        whenever(teamService.updateTeam(eq(testTeamId), any(), eq(testUserId)))
            .thenReturn(createTeamResponse().copy(name = "Updated Team"))

        mockMvc.perform(
            put("/api/teams/$testTeamId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Team"))
    }

    @Test
    fun `updateTeam should return 403 when not leader`() {
        val request = UpdateTeamRequest(name = "Updated Team")

        whenever(teamService.updateTeam(eq(testTeamId), any(), eq(testUserId)))
            .thenThrow(ApiException("Only team leader can update team", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            put("/api/teams/$testTeamId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `joinTeam should return 200 when successful`() {
        val request = JoinTeamRequest(inviteCode = "ABC12345")

        whenever(teamService.joinTeamByInviteCode("ABC12345", testUserId))
            .thenReturn(createTeamResponse())

        mockMvc.perform(
            post("/api/teams/join")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Test Team"))
    }

    @Test
    fun `joinTeam should return 404 for invalid code`() {
        val request = JoinTeamRequest(inviteCode = "INVALID")

        whenever(teamService.joinTeamByInviteCode("INVALID", testUserId))
            .thenThrow(ApiException("Invalid invite code", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            post("/api/teams/join")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `leaveTeam should return 204 when successful`() {
        mockMvc.perform(
            post("/api/teams/$testTeamId/leave")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `leaveTeam should return 404 when not a member`() {
        whenever(teamService.leaveTeam(testTeamId, testUserId))
            .thenThrow(ApiException("Not a member of this team", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            post("/api/teams/$testTeamId/leave")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `regenerateInviteCode should return new code when successful`() {
        whenever(teamService.regenerateInviteCode(testTeamId, testUserId))
            .thenReturn("NEW12345")

        mockMvc.perform(
            post("/api/teams/$testTeamId/regenerate-invite")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.inviteCode").value("NEW12345"))
    }

    @Test
    fun `regenerateInviteCode should return 403 when not leader`() {
        whenever(teamService.regenerateInviteCode(testTeamId, testUserId))
            .thenThrow(ApiException("Only team leader can regenerate invite code", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            post("/api/teams/$testTeamId/regenerate-invite")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isForbidden)
    }

    private fun TeamResponse.copy(
        name: String = this.name
    ) = TeamResponse(
        id = this.id,
        hackathonId = this.hackathonId,
        name = name,
        description = this.description,
        avatarUrl = this.avatarUrl,
        inviteCode = this.inviteCode,
        isOpen = this.isOpen,
        memberCount = this.memberCount,
        members = this.members,
        createdAt = this.createdAt
    )
}
