package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.CreateHackathonRequest
import com.hackathon.manager.dto.HackathonResponse
import com.hackathon.manager.dto.UpdateHackathonRequest
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.UserRole
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.HackathonService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
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
    controllers = [HackathonController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class HackathonControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var hackathonService: HackathonService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    private fun createHackathonResponse(
        id: UUID = testHackathonId,
        status: HackathonStatus = HackathonStatus.registration_open
    ) = HackathonResponse(
        id = id,
        name = "Test Hackathon",
        slug = "test-hackathon",
        description = "A test hackathon",
        rules = null,
        status = status,
        bannerUrl = null,
        logoUrl = null,
        location = "Virtual",
        isVirtual = true,
        timezone = "UTC",
        registrationOpensAt = OffsetDateTime.now().minusDays(1),
        registrationClosesAt = OffsetDateTime.now().plusDays(1),
        startsAt = OffsetDateTime.now().plusDays(7),
        endsAt = OffsetDateTime.now().plusDays(9),
        judgingStartsAt = null,
        judgingEndsAt = null,
        maxTeamSize = 5,
        minTeamSize = 1,
        maxParticipants = 100,
        participantCount = 50,
        createdAt = OffsetDateTime.now(),
        userRole = null
    )

    @Test
    fun `getAllHackathons should return active hackathons`() {
        whenever(hackathonService.getActiveHackathons())
            .thenReturn(listOf(createHackathonResponse()))

        // Note: In production this endpoint is public, but @WebMvcTest requires auth by default
        mockMvc.perform(
            get("/api/hackathons")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$[0].name").value("Test Hackathon"))
            .andExpect(jsonPath("$[0].slug").value("test-hackathon"))
    }

    @Test
    fun `getMyDraftHackathons should return 401 without authentication`() {
        mockMvc.perform(get("/api/hackathons/my-drafts"))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `getMyDraftHackathons should return drafts when authenticated`() {
        val draftHackathon = createHackathonResponse(status = HackathonStatus.draft)
        whenever(hackathonService.getUserDraftHackathons(testUserId))
            .thenReturn(listOf(draftHackathon))

        mockMvc.perform(
            get("/api/hackathons/my-drafts")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].status").value("draft"))
    }

    @Test
    fun `getHackathonBySlug should return hackathon`() {
        whenever(hackathonService.getHackathonBySlug(eq("test-hackathon"), anyOrNull()))
            .thenReturn(createHackathonResponse())

        // Note: In production this endpoint is public, but @WebMvcTest requires auth by default
        mockMvc.perform(
            get("/api/hackathons/test-hackathon")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.slug").value("test-hackathon"))
    }

    @Test
    fun `getHackathonBySlug should return 404 when not found`() {
        whenever(hackathonService.getHackathonBySlug(eq("non-existent"), anyOrNull()))
            .thenThrow(ApiException("Hackathon not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            get("/api/hackathons/non-existent")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `getHackathonById should return hackathon`() {
        whenever(hackathonService.getHackathonById(eq(testHackathonId), anyOrNull()))
            .thenReturn(createHackathonResponse())

        mockMvc.perform(
            get("/api/hackathons/id/$testHackathonId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testHackathonId.toString()))
    }

    @Test
    fun `createHackathon should return 401 without authentication`() {
        val request = CreateHackathonRequest(
            name = "New Hackathon",
            slug = "new-hackathon",
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9)
        )

        mockMvc.perform(
            post("/api/hackathons")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `createHackathon should return 201 when authenticated`() {
        val request = CreateHackathonRequest(
            name = "New Hackathon",
            slug = "new-hackathon",
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9)
        )

        val response = createHackathonResponse().copy(
            name = "New Hackathon",
            slug = "new-hackathon",
            userRole = UserRole.organizer
        )

        whenever(hackathonService.createHackathon(any(), eq(testUserId)))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/hackathons")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("New Hackathon"))
            .andExpect(jsonPath("$.userRole").value("organizer"))
    }

    @Test
    fun `createHackathon should return 409 when slug exists`() {
        val request = CreateHackathonRequest(
            name = "New Hackathon",
            slug = "existing-slug",
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9)
        )

        whenever(hackathonService.createHackathon(any(), eq(testUserId)))
            .thenThrow(ApiException("Slug already exists", HttpStatus.CONFLICT))

        mockMvc.perform(
            post("/api/hackathons")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isConflict)
    }

    @Test
    fun `updateHackathon should return 401 without authentication`() {
        val request = UpdateHackathonRequest(name = "Updated")

        mockMvc.perform(
            put("/api/hackathons/$testHackathonId")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `updateHackathon should return 403 when not organizer`() {
        val request = UpdateHackathonRequest(name = "Updated")

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(false)

        mockMvc.perform(
            put("/api/hackathons/$testHackathonId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateHackathon should return 200 when organizer`() {
        val request = UpdateHackathonRequest(name = "Updated Hackathon")

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)
        whenever(hackathonService.updateHackathon(eq(testHackathonId), any()))
            .thenReturn(createHackathonResponse().copy(name = "Updated Hackathon"))

        mockMvc.perform(
            put("/api/hackathons/$testHackathonId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Hackathon"))
    }

    @Test
    fun `registerForHackathon should return 401 without authentication`() {
        mockMvc.perform(
            post("/api/hackathons/$testHackathonId/register")
                .with(csrf())
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `registerForHackathon should return 200 when successful`() {
        val response = createHackathonResponse().copy(
            userRole = UserRole.participant,
            participantCount = 51
        )

        whenever(hackathonService.registerForHackathon(testHackathonId, testUserId))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/hackathons/$testHackathonId/register")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.userRole").value("participant"))
            .andExpect(jsonPath("$.participantCount").value(51))
    }

    @Test
    fun `registerForHackathon should return 400 when registration closed`() {
        whenever(hackathonService.registerForHackathon(testHackathonId, testUserId))
            .thenThrow(ApiException("Registration is not open", HttpStatus.BAD_REQUEST))

        mockMvc.perform(
            post("/api/hackathons/$testHackathonId/register")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isBadRequest)
    }

    private fun HackathonResponse.copy(
        id: UUID = this.id,
        name: String = this.name,
        slug: String = this.slug,
        description: String? = this.description,
        rules: String? = this.rules,
        status: HackathonStatus = this.status,
        bannerUrl: String? = this.bannerUrl,
        logoUrl: String? = this.logoUrl,
        location: String? = this.location,
        isVirtual: Boolean = this.isVirtual,
        timezone: String = this.timezone,
        registrationOpensAt: OffsetDateTime? = this.registrationOpensAt,
        registrationClosesAt: OffsetDateTime? = this.registrationClosesAt,
        startsAt: OffsetDateTime = this.startsAt,
        endsAt: OffsetDateTime = this.endsAt,
        judgingStartsAt: OffsetDateTime? = this.judgingStartsAt,
        judgingEndsAt: OffsetDateTime? = this.judgingEndsAt,
        maxTeamSize: Int = this.maxTeamSize,
        minTeamSize: Int = this.minTeamSize,
        maxParticipants: Int? = this.maxParticipants,
        participantCount: Int? = this.participantCount,
        createdAt: OffsetDateTime? = this.createdAt,
        userRole: UserRole? = this.userRole
    ) = HackathonResponse(
        id = id,
        name = name,
        slug = slug,
        description = description,
        rules = rules,
        status = status,
        bannerUrl = bannerUrl,
        logoUrl = logoUrl,
        location = location,
        isVirtual = isVirtual,
        timezone = timezone,
        registrationOpensAt = registrationOpensAt,
        registrationClosesAt = registrationClosesAt,
        startsAt = startsAt,
        endsAt = endsAt,
        judgingStartsAt = judgingStartsAt,
        judgingEndsAt = judgingEndsAt,
        maxTeamSize = maxTeamSize,
        minTeamSize = minTeamSize,
        maxParticipants = maxParticipants,
        participantCount = participantCount,
        createdAt = createdAt,
        userRole = userRole
    )
}
