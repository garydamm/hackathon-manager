package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.*
import com.hackathon.manager.entity.enums.EventType
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.HackathonService
import com.hackathon.manager.service.ScheduleService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.verify
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
    controllers = [ScheduleController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class ScheduleControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var scheduleService: ScheduleService

    @MockBean
    lateinit var hackathonService: HackathonService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testEventId = UUID.randomUUID()
    private val testAttendeeId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    private fun createScheduleEventResponse(
        id: UUID = testEventId,
        hackathonId: UUID = testHackathonId
    ) = ScheduleEventResponse(
        id = id,
        hackathonId = hackathonId,
        name = "Test Event",
        description = "Test event description",
        eventType = EventType.workshop,
        location = "Room 101",
        virtualLink = "https://zoom.us/test",
        startsAt = OffsetDateTime.now().plusDays(1),
        endsAt = OffsetDateTime.now().plusDays(1).plusHours(2),
        isMandatory = false,
        attendingCount = 5,
        maybeCount = 2,
        notAttendingCount = 1
    )

    private fun createEventAttendeeResponse(
        id: UUID = testAttendeeId,
        eventId: UUID = testEventId,
        userId: UUID = testUserId
    ) = EventAttendeeResponse(
        id = id,
        eventId = eventId,
        userId = userId,
        userFirstName = "Test",
        userLastName = "User",
        userEmail = "test@example.com",
        rsvpStatus = "attending",
        attended = false,
        createdAt = OffsetDateTime.now()
    )

    @Test
    fun `getScheduleByHackathon should return events with RSVP counts`() {
        val events = listOf(
            createScheduleEventResponse(),
            createScheduleEventResponse(id = UUID.randomUUID())
        )

        whenever(scheduleService.getScheduleByHackathonWithRsvp(testHackathonId, testUserId))
            .thenReturn(events)

        mockMvc.perform(
            get("/api/schedule/hackathon/$testHackathonId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(events[0].id.toString()))
            .andExpect(jsonPath("$[0].name").value("Test Event"))
            .andExpect(jsonPath("$[0].attendingCount").value(5))
            .andExpect(jsonPath("$[0].maybeCount").value(2))
            .andExpect(jsonPath("$[0].notAttendingCount").value(1))
    }

    @Test
    fun `createScheduleEvent should create event for organizer`() {
        val request = CreateScheduleEventRequest(
            hackathonId = testHackathonId,
            name = "New Event",
            description = "New event description",
            eventType = EventType.workshop,
            location = "Room 101",
            virtualLink = null,
            startsAt = OffsetDateTime.now().plusDays(1),
            endsAt = OffsetDateTime.now().plusDays(1).plusHours(2),
            isMandatory = true
        )
        val response = createScheduleEventResponse()

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)
        whenever(scheduleService.createScheduleEvent(any()))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/schedule")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value(testEventId.toString()))
            .andExpect(jsonPath("$.name").value("Test Event"))
    }

    @Test
    fun `createScheduleEvent should return 403 for non-organizer`() {
        val request = CreateScheduleEventRequest(
            hackathonId = testHackathonId,
            name = "New Event",
            description = "New event description",
            eventType = EventType.workshop,
            location = "Room 101",
            virtualLink = null,
            startsAt = OffsetDateTime.now().plusDays(1),
            endsAt = OffsetDateTime.now().plusDays(1).plusHours(2),
            isMandatory = false
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(false)

        mockMvc.perform(
            post("/api/schedule")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateScheduleEvent should update event for organizer`() {
        val request = UpdateScheduleEventRequest(
            name = "Updated Event",
            description = "Updated description"
        )
        val existingEvent = createScheduleEventResponse()
        val updatedEvent = existingEvent.copy(
            name = "Updated Event",
            description = "Updated description"
        )

        whenever(scheduleService.getScheduleEventById(testEventId))
            .thenReturn(existingEvent)
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)
        whenever(scheduleService.updateScheduleEvent(eq(testEventId), any()))
            .thenReturn(updatedEvent)

        mockMvc.perform(
            put("/api/schedule/$testEventId")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Event"))
            .andExpect(jsonPath("$.description").value("Updated description"))
    }

    @Test
    fun `deleteScheduleEvent should delete event for organizer`() {
        val existingEvent = createScheduleEventResponse()

        whenever(scheduleService.getScheduleEventById(testEventId))
            .thenReturn(existingEvent)
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId))
            .thenReturn(true)

        mockMvc.perform(
            delete("/api/schedule/$testEventId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isNoContent)

        verify(scheduleService).deleteScheduleEvent(testEventId)
    }

    @Test
    fun `rsvpToEvent should create RSVP`() {
        val request = RsvpRequest(rsvpStatus = "attending")
        val response = createScheduleEventResponse()

        whenever(scheduleService.rsvpToEvent(testEventId, testUserId, "attending"))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/schedule/$testEventId/rsvp")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value(testEventId.toString()))
    }

    @Test
    fun `updateRsvp should update RSVP status`() {
        val request = RsvpRequest(rsvpStatus = "maybe")
        val response = createScheduleEventResponse()

        whenever(scheduleService.rsvpToEvent(testEventId, testUserId, "maybe"))
            .thenReturn(response)

        mockMvc.perform(
            put("/api/schedule/$testEventId/rsvp")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testEventId.toString()))
    }

    @Test
    fun `removeRsvp should remove RSVP`() {
        mockMvc.perform(
            delete("/api/schedule/$testEventId/rsvp")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isNoContent)

        verify(scheduleService).removeRsvp(testEventId, testUserId)
    }

    @Test
    fun `markAttendance should mark attendance for organizer`() {
        val attendeeUserId = UUID.randomUUID()
        val request = MarkAttendanceRequest(
            userId = attendeeUserId,
            attended = true
        )
        val existingEvent = createScheduleEventResponse()

        whenever(scheduleService.getScheduleEventById(testEventId))
            .thenReturn(existingEvent)

        mockMvc.perform(
            post("/api/schedule/$testEventId/attendance")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)

        verify(scheduleService).markAttendance(testEventId, attendeeUserId, true, testUserId)
    }

    @Test
    fun `bulkMarkAttendance should mark attendance for multiple users`() {
        val userIds = listOf(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID())
        val request = BulkMarkAttendanceRequest(
            userIds = userIds,
            attended = true
        )
        val existingEvent = createScheduleEventResponse()

        whenever(scheduleService.getScheduleEventById(testEventId))
            .thenReturn(existingEvent)

        mockMvc.perform(
            post("/api/schedule/$testEventId/attendance/bulk")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)

        verify(scheduleService).bulkMarkAttendance(testEventId, userIds, true, testUserId)
    }
}
