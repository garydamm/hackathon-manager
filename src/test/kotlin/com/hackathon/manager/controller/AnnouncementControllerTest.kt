package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.AnnouncementResponse
import com.hackathon.manager.dto.CreateAnnouncementRequest
import com.hackathon.manager.dto.UpdateAnnouncementRequest
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.AnnouncementService
import com.hackathon.manager.service.HackathonService
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
    controllers = [AnnouncementController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class AnnouncementControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var announcementService: AnnouncementService

    @MockBean
    lateinit var hackathonService: HackathonService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testAnnouncementId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    private fun createAnnouncementResponse(
        id: UUID = testAnnouncementId,
        hackathonId: UUID = testHackathonId
    ) = AnnouncementResponse(
        id = id,
        hackathonId = hackathonId,
        title = "Test Announcement",
        content = "This is a test announcement",
        isPinned = false,
        isUrgent = false,
        publishedAt = OffsetDateTime.now(),
        createdById = testUserId,
        createdByName = "Test User"
    )

    @Test
    fun `getAnnouncementsByHackathon should return announcements`() {
        val announcements = listOf(
            createAnnouncementResponse(),
            createAnnouncementResponse(id = UUID.randomUUID())
        )

        whenever(announcementService.getAnnouncementsByHackathon(testHackathonId))
            .thenReturn(announcements)

        mockMvc.perform(
            get("/api/announcements/hackathon/$testHackathonId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(announcements[0].id.toString()))
            .andExpect(jsonPath("$[0].title").value("Test Announcement"))
    }

    @Test
    fun `getAnnouncementById should return single announcement`() {
        val announcement = createAnnouncementResponse()

        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenReturn(announcement)

        mockMvc.perform(
            get("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testAnnouncementId.toString()))
            .andExpect(jsonPath("$.title").value("Test Announcement"))
            .andExpect(jsonPath("$.content").value("This is a test announcement"))
    }

    @Test
    fun `getAnnouncementById should return 404 when announcement not found`() {
        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenThrow(ApiException("Announcement not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            get("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `createAnnouncement should create announcement for organizer`() {
        val request = CreateAnnouncementRequest(
            hackathonId = testHackathonId,
            title = "New Announcement",
            content = "New content",
            isPinned = true,
            isUrgent = false
        )
        val response = createAnnouncementResponse()

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)
        whenever(announcementService.createAnnouncement(any(), eq(testUserId)))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/announcements")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value(testAnnouncementId.toString()))
    }

    @Test
    fun `createAnnouncement should return 403 when non-organizer attempts creation`() {
        val request = CreateAnnouncementRequest(
            hackathonId = testHackathonId,
            title = "New Announcement",
            content = "New content",
            isPinned = false,
            isUrgent = false
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(false)

        mockMvc.perform(
            post("/api/announcements")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateAnnouncement should update announcement for organizer`() {
        val request = UpdateAnnouncementRequest(
            title = "Updated Title",
            content = "Updated content"
        )
        val existingAnnouncement = createAnnouncementResponse()
        val updatedAnnouncement = existingAnnouncement.copy(
            title = "Updated Title",
            content = "Updated content"
        )

        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenReturn(existingAnnouncement)
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)
        whenever(announcementService.updateAnnouncement(eq(testAnnouncementId), any()))
            .thenReturn(updatedAnnouncement)

        mockMvc.perform(
            put("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.title").value("Updated Title"))
            .andExpect(jsonPath("$.content").value("Updated content"))
    }

    @Test
    fun `updateAnnouncement should return 403 when non-organizer attempts update`() {
        val request = UpdateAnnouncementRequest(
            title = "Updated Title"
        )
        val existingAnnouncement = createAnnouncementResponse()

        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenReturn(existingAnnouncement)
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(false)

        mockMvc.perform(
            put("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateAnnouncement should return 404 when announcement not found`() {
        val request = UpdateAnnouncementRequest(
            title = "Updated Title"
        )

        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenThrow(ApiException("Announcement not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            put("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `deleteAnnouncement should delete announcement for organizer`() {
        val existingAnnouncement = createAnnouncementResponse()

        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenReturn(existingAnnouncement)
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)

        mockMvc.perform(
            delete("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `deleteAnnouncement should return 403 when non-organizer attempts deletion`() {
        val existingAnnouncement = createAnnouncementResponse()

        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenReturn(existingAnnouncement)
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(false)

        mockMvc.perform(
            delete("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `deleteAnnouncement should return 404 when announcement not found`() {
        whenever(announcementService.getAnnouncementById(testAnnouncementId))
            .thenThrow(ApiException("Announcement not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            delete("/api/announcements/$testAnnouncementId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isNotFound)
    }
}
