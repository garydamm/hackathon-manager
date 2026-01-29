package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateScheduleEventRequest
import com.hackathon.manager.dto.UpdateScheduleEventRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.ScheduleEvent
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.EventType
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.EventAttendeeRepository
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.ScheduleEventRepository
import com.hackathon.manager.repository.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class ScheduleServiceTest {

    @Mock
    lateinit var scheduleEventRepository: ScheduleEventRepository

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var eventAttendeeRepository: EventAttendeeRepository

    @Mock
    lateinit var userRepository: UserRepository

    @Mock
    lateinit var hackathonService: HackathonService

    @InjectMocks
    lateinit var scheduleService: ScheduleService

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testScheduleEvent: ScheduleEvent
    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testEventId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        testUser = User(
            id = testUserId,
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User"
        )

        testHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now().minusDays(1),
            endsAt = OffsetDateTime.now().plusDays(1),
            createdBy = testUser
        )

        testScheduleEvent = ScheduleEvent(
            id = testEventId,
            hackathon = testHackathon,
            name = "Opening Ceremony",
            description = "Welcome to the hackathon!",
            eventType = EventType.ceremony,
            location = "Main Hall",
            startsAt = OffsetDateTime.now().plusHours(1),
            endsAt = OffsetDateTime.now().plusHours(2),
            isMandatory = true
        )
    }

    @Test
    fun `getScheduleByHackathon should return events ordered by start time`() {
        val laterEvent = ScheduleEvent(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            name = "Lunch",
            eventType = EventType.meal,
            startsAt = OffsetDateTime.now().plusHours(4),
            endsAt = OffsetDateTime.now().plusHours(5)
        )

        whenever(scheduleEventRepository.findByHackathonIdOrderByStartsAt(testHackathonId))
            .thenReturn(listOf(testScheduleEvent, laterEvent))

        val result = scheduleService.getScheduleByHackathon(testHackathonId)

        assertThat(result).hasSize(2)
        assertThat(result[0].name).isEqualTo("Opening Ceremony")
        assertThat(result[1].name).isEqualTo("Lunch")
    }

    @Test
    fun `getScheduleEventById should return event when found`() {
        whenever(scheduleEventRepository.findById(testEventId)).thenReturn(Optional.of(testScheduleEvent))

        val result = scheduleService.getScheduleEventById(testEventId)

        assertThat(result.id).isEqualTo(testEventId)
        assertThat(result.name).isEqualTo("Opening Ceremony")
        assertThat(result.eventType).isEqualTo(EventType.ceremony)
        assertThat(result.isMandatory).isTrue()
    }

    @Test
    fun `getScheduleEventById should throw exception when not found`() {
        whenever(scheduleEventRepository.findById(testEventId)).thenReturn(Optional.empty())

        assertThatThrownBy { scheduleService.getScheduleEventById(testEventId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Schedule event not found")
    }

    @Test
    fun `createScheduleEvent should create event successfully`() {
        val request = CreateScheduleEventRequest(
            hackathonId = testHackathonId,
            name = "Workshop",
            description = "Learn something new",
            eventType = EventType.workshop,
            location = "Room A",
            virtualLink = "https://meet.example.com/workshop",
            startsAt = OffsetDateTime.now().plusHours(3),
            endsAt = OffsetDateTime.now().plusHours(4),
            isMandatory = false
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(scheduleEventRepository.save(any<ScheduleEvent>())).thenAnswer { invocation ->
            val event = invocation.arguments[0] as ScheduleEvent
            ScheduleEvent(
                id = UUID.randomUUID(),
                hackathon = event.hackathon,
                name = event.name,
                description = event.description,
                eventType = event.eventType,
                location = event.location,
                virtualLink = event.virtualLink,
                startsAt = event.startsAt,
                endsAt = event.endsAt,
                isMandatory = event.isMandatory
            )
        }

        val result = scheduleService.createScheduleEvent(request)

        assertThat(result.name).isEqualTo("Workshop")
        assertThat(result.description).isEqualTo("Learn something new")
        assertThat(result.eventType).isEqualTo(EventType.workshop)
        assertThat(result.location).isEqualTo("Room A")
        assertThat(result.virtualLink).isEqualTo("https://meet.example.com/workshop")
        assertThat(result.isMandatory).isFalse()

        verify(scheduleEventRepository).save(any<ScheduleEvent>())
    }

    @Test
    fun `createScheduleEvent should throw exception when hackathon not found`() {
        val request = CreateScheduleEventRequest(
            hackathonId = testHackathonId,
            name = "Workshop",
            startsAt = OffsetDateTime.now().plusHours(3),
            endsAt = OffsetDateTime.now().plusHours(4)
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { scheduleService.createScheduleEvent(request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `createScheduleEvent should use default event type`() {
        val request = CreateScheduleEventRequest(
            hackathonId = testHackathonId,
            name = "General Event",
            startsAt = OffsetDateTime.now().plusHours(3),
            endsAt = OffsetDateTime.now().plusHours(4)
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(scheduleEventRepository.save(any<ScheduleEvent>())).thenAnswer { invocation ->
            val event = invocation.arguments[0] as ScheduleEvent
            ScheduleEvent(
                id = UUID.randomUUID(),
                hackathon = event.hackathon,
                name = event.name,
                eventType = event.eventType,
                startsAt = event.startsAt,
                endsAt = event.endsAt
            )
        }

        val result = scheduleService.createScheduleEvent(request)

        assertThat(result.eventType).isEqualTo(EventType.other)
    }

    @Test
    fun `updateScheduleEvent should update event fields`() {
        val request = UpdateScheduleEventRequest(
            name = "Updated Ceremony",
            description = "Updated description",
            eventType = EventType.presentation,
            location = "New Location",
            virtualLink = "https://new-link.com",
            startsAt = OffsetDateTime.now().plusHours(2),
            endsAt = OffsetDateTime.now().plusHours(3),
            isMandatory = false
        )

        whenever(scheduleEventRepository.findById(testEventId)).thenReturn(Optional.of(testScheduleEvent))
        whenever(scheduleEventRepository.save(any<ScheduleEvent>())).thenAnswer { it.arguments[0] }

        val result = scheduleService.updateScheduleEvent(testEventId, request)

        assertThat(result.name).isEqualTo("Updated Ceremony")
        assertThat(result.description).isEqualTo("Updated description")
        assertThat(result.eventType).isEqualTo(EventType.presentation)
        assertThat(result.location).isEqualTo("New Location")
        assertThat(result.virtualLink).isEqualTo("https://new-link.com")
        assertThat(result.isMandatory).isFalse()
    }

    @Test
    fun `updateScheduleEvent should update only provided fields`() {
        val request = UpdateScheduleEventRequest(
            name = "Only Name Updated"
        )

        whenever(scheduleEventRepository.findById(testEventId)).thenReturn(Optional.of(testScheduleEvent))
        whenever(scheduleEventRepository.save(any<ScheduleEvent>())).thenAnswer { it.arguments[0] }

        val result = scheduleService.updateScheduleEvent(testEventId, request)

        assertThat(result.name).isEqualTo("Only Name Updated")
        assertThat(result.description).isEqualTo("Welcome to the hackathon!")
        assertThat(result.eventType).isEqualTo(EventType.ceremony)
        assertThat(result.isMandatory).isTrue()
    }

    @Test
    fun `updateScheduleEvent should throw exception when not found`() {
        val request = UpdateScheduleEventRequest(name = "Updated")

        whenever(scheduleEventRepository.findById(testEventId)).thenReturn(Optional.empty())

        assertThatThrownBy { scheduleService.updateScheduleEvent(testEventId, request) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Schedule event not found")
    }

    @Test
    fun `deleteScheduleEvent should delete event successfully`() {
        whenever(scheduleEventRepository.existsById(testEventId)).thenReturn(true)

        scheduleService.deleteScheduleEvent(testEventId)

        verify(scheduleEventRepository).deleteById(testEventId)
    }

    @Test
    fun `deleteScheduleEvent should throw exception when not found`() {
        whenever(scheduleEventRepository.existsById(testEventId)).thenReturn(false)

        assertThatThrownBy { scheduleService.deleteScheduleEvent(testEventId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Schedule event not found")

        verify(scheduleEventRepository, never()).deleteById(any())
    }
}
