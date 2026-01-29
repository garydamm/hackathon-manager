package com.hackathon.manager.repository

import com.hackathon.manager.entity.EventAttendee
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.ScheduleEvent
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.EventType
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import java.time.OffsetDateTime

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class EventAttendeeRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var eventAttendeeRepository: EventAttendeeRepository

    @Autowired
    lateinit var scheduleEventRepository: ScheduleEventRepository

    private lateinit var testUser: User
    private lateinit var testUser2: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testEvent: ScheduleEvent

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Alice",
            lastName = "Smith",
            displayName = "AliceSmith"
        )
        entityManager.persist(testUser)

        testUser2 = User(
            email = "test2@example.com",
            passwordHash = "hashedpassword",
            firstName = "Bob",
            lastName = "Johnson",
            displayName = "BobJohnson"
        )
        entityManager.persist(testUser2)

        val now = OffsetDateTime.now()
        testHackathon = Hackathon(
            name = "Test Hackathon",
            slug = "test-hackathon",
            startsAt = now.plusDays(1),
            endsAt = now.plusDays(2),
            createdBy = testUser
        )
        entityManager.persist(testHackathon)

        testEvent = ScheduleEvent(
            hackathon = testHackathon,
            name = "Opening Ceremony",
            eventType = EventType.ceremony,
            startsAt = now.plusHours(1),
            endsAt = now.plusHours(2)
        )
        entityManager.persist(testEvent)

        entityManager.flush()
    }

    @Test
    fun `findByEventIdOrderByUserLastNameAscUserFirstNameAsc should return all attendees for event sorted by name`() {
        // Create attendees in reverse alphabetical order
        val attendee2 = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee2)

        val attendee1 = EventAttendee(
            event = testEvent,
            user = testUser2,
            rsvpStatus = "maybe"
        )
        entityManager.persist(attendee1)

        entityManager.flush()

        val found = eventAttendeeRepository.findByEventIdOrderByUserLastNameAscUserFirstNameAsc(testEvent.id!!)

        assertThat(found).hasSize(2)
        // Verify attendees are sorted by last name (Johnson before Smith)
        assertThat(found[0].user.lastName).isEqualTo("Johnson")
        assertThat(found[0].user.firstName).isEqualTo("Bob")
        assertThat(found[1].user.lastName).isEqualTo("Smith")
        assertThat(found[1].user.firstName).isEqualTo("Alice")
    }

    @Test
    fun `findByEventIdAndUserId should return specific RSVP when exists`() {
        val attendee = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee)
        entityManager.flush()

        val found = eventAttendeeRepository.findByEventIdAndUserId(testEvent.id!!, testUser.id!!)

        assertThat(found).isNotNull
        assertThat(found?.user?.id).isEqualTo(testUser.id)
        assertThat(found?.event?.id).isEqualTo(testEvent.id)
        assertThat(found?.rsvpStatus).isEqualTo("attending")
    }

    @Test
    fun `findByEventIdAndUserId should return null when RSVP does not exist`() {
        val found = eventAttendeeRepository.findByEventIdAndUserId(testEvent.id!!, testUser.id!!)

        assertThat(found).isNull()
    }

    @Test
    fun `existsByEventIdAndUserId should return true when RSVP exists`() {
        val attendee = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee)
        entityManager.flush()

        val exists = eventAttendeeRepository.existsByEventIdAndUserId(testEvent.id!!, testUser.id!!)

        assertThat(exists).isTrue()
    }

    @Test
    fun `existsByEventIdAndUserId should return false when RSVP does not exist`() {
        val exists = eventAttendeeRepository.existsByEventIdAndUserId(testEvent.id!!, testUser.id!!)

        assertThat(exists).isFalse()
    }

    @Test
    fun `countByEventIdAndRsvpStatus should count RSVPs by status correctly`() {
        val attendee1 = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee1)

        val attendee2 = EventAttendee(
            event = testEvent,
            user = testUser2,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee2)

        // Create third user with different status
        val testUser3 = User(
            email = "test3@example.com",
            passwordHash = "hashedpassword",
            firstName = "Charlie",
            lastName = "Wilson",
            displayName = "CharlieWilson"
        )
        entityManager.persist(testUser3)

        val attendee3 = EventAttendee(
            event = testEvent,
            user = testUser3,
            rsvpStatus = "maybe"
        )
        entityManager.persist(attendee3)

        entityManager.flush()

        val attendingCount = eventAttendeeRepository.countByEventIdAndRsvpStatus(testEvent.id!!, "attending")
        val maybeCount = eventAttendeeRepository.countByEventIdAndRsvpStatus(testEvent.id!!, "maybe")
        val notAttendingCount = eventAttendeeRepository.countByEventIdAndRsvpStatus(testEvent.id!!, "not_attending")

        assertThat(attendingCount).isEqualTo(2)
        assertThat(maybeCount).isEqualTo(1)
        assertThat(notAttendingCount).isEqualTo(0)
    }

    @Test
    fun `RSVP creation with event and user relationships should work correctly`() {
        val attendee = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "maybe",
            attended = false
        )

        val saved = eventAttendeeRepository.save(attendee)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.event.id).isEqualTo(testEvent.id)
        assertThat(saved.user.id).isEqualTo(testUser.id)
        assertThat(saved.rsvpStatus).isEqualTo("maybe")
        assertThat(saved.attended).isFalse()
        assertThat(saved.createdAt).isNotNull()
    }

    @Test
    fun `attendance marking updates attended flag correctly`() {
        val attendee = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending",
            attended = false
        )
        entityManager.persist(attendee)
        entityManager.flush()

        val attendeeId = attendee.id
        assertThat(attendeeId).isNotNull()

        // Mark as attended
        attendee.attended = true
        eventAttendeeRepository.save(attendee)
        entityManager.flush()
        entityManager.clear()

        // Retrieve and verify attendance was marked
        val retrieved = eventAttendeeRepository.findById(attendeeId!!).get()
        assertThat(retrieved.attended).isTrue()
    }

    @Test
    fun `deleteByEventIdAndUserId should delete specific RSVP`() {
        val attendee = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee)
        entityManager.flush()

        // Verify RSVP exists
        assertThat(eventAttendeeRepository.existsByEventIdAndUserId(testEvent.id!!, testUser.id!!)).isTrue()

        // Delete the RSVP
        eventAttendeeRepository.deleteByEventIdAndUserId(testEvent.id!!, testUser.id!!)
        entityManager.flush()
        entityManager.clear()

        // Verify RSVP no longer exists
        assertThat(eventAttendeeRepository.existsByEventIdAndUserId(testEvent.id!!, testUser.id!!)).isFalse()
    }

    @Test
    fun `cascade deletion when event is deleted should work correctly`() {
        val attendee = EventAttendee(
            event = testEvent,
            user = testUser,
            rsvpStatus = "attending"
        )
        entityManager.persist(attendee)
        entityManager.flush()

        val attendeeId = attendee.id
        assertThat(attendeeId).isNotNull()

        // Delete the event
        scheduleEventRepository.delete(testEvent)
        entityManager.flush()
        entityManager.clear()

        // EventAttendee should be deleted due to cascade from event
        val foundAttendee = eventAttendeeRepository.findById(attendeeId!!)
        assertThat(foundAttendee).isEmpty
    }
}
