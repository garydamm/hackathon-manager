package com.hackathon.manager.repository

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
class ScheduleEventRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var scheduleEventRepository: ScheduleEventRepository

    @Autowired
    lateinit var hackathonRepository: HackathonRepository

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User",
            displayName = "TestUser"
        )
        entityManager.persist(testUser)

        val now = OffsetDateTime.now()
        testHackathon = Hackathon(
            name = "Test Hackathon",
            slug = "test-hackathon",
            startsAt = now.plusDays(1),
            endsAt = now.plusDays(2),
            createdBy = testUser
        )
        entityManager.persist(testHackathon)

        entityManager.flush()
    }

    @Test
    fun `findByHackathonIdOrderByStartsAt should return sorted events`() {
        val now = OffsetDateTime.now()

        // Create events out of chronological order
        val event2 = ScheduleEvent(
            hackathon = testHackathon,
            name = "Lunch Break",
            eventType = EventType.meal,
            startsAt = now.plusHours(4),
            endsAt = now.plusHours(5)
        )
        entityManager.persist(event2)

        val event1 = ScheduleEvent(
            hackathon = testHackathon,
            name = "Opening Ceremony",
            eventType = EventType.ceremony,
            startsAt = now.plusHours(1),
            endsAt = now.plusHours(2)
        )
        entityManager.persist(event1)

        val event3 = ScheduleEvent(
            hackathon = testHackathon,
            name = "Final Presentations",
            eventType = EventType.presentation,
            startsAt = now.plusHours(8),
            endsAt = now.plusHours(10)
        )
        entityManager.persist(event3)

        entityManager.flush()

        val found = scheduleEventRepository.findByHackathonIdOrderByStartsAt(testHackathon.id!!)

        assertThat(found).hasSize(3)
        // Verify events are sorted by startsAt
        assertThat(found[0].name).isEqualTo("Opening Ceremony")
        assertThat(found[1].name).isEqualTo("Lunch Break")
        assertThat(found[2].name).isEqualTo("Final Presentations")
    }

    @Test
    fun `findByHackathonIdOrderByStartsAt should return empty list when hackathon has no events`() {
        val anotherHackathon = Hackathon(
            name = "Another Hackathon",
            slug = "another-hackathon",
            startsAt = OffsetDateTime.now().plusDays(3),
            endsAt = OffsetDateTime.now().plusDays(4),
            createdBy = testUser
        )
        entityManager.persist(anotherHackathon)
        entityManager.flush()

        val found = scheduleEventRepository.findByHackathonIdOrderByStartsAt(anotherHackathon.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `event creation with hackathon relationship should work correctly`() {
        val now = OffsetDateTime.now()
        val startsAt = now.plusHours(2)
        val endsAt = now.plusHours(4)

        val event = ScheduleEvent(
            hackathon = testHackathon,
            name = "Workshop: Intro to Kotlin",
            description = "Learn the basics of Kotlin programming",
            eventType = EventType.workshop,
            location = "Room 101",
            virtualLink = "https://zoom.us/j/123456789",
            startsAt = startsAt,
            endsAt = endsAt,
            isMandatory = true
        )

        val saved = scheduleEventRepository.save(event)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.name).isEqualTo("Workshop: Intro to Kotlin")
        assertThat(saved.description).isEqualTo("Learn the basics of Kotlin programming")
        assertThat(saved.eventType).isEqualTo(EventType.workshop)
        assertThat(saved.location).isEqualTo("Room 101")
        assertThat(saved.virtualLink).isEqualTo("https://zoom.us/j/123456789")
        assertThat(saved.startsAt).isEqualTo(startsAt)
        assertThat(saved.endsAt).isEqualTo(endsAt)
        assertThat(saved.isMandatory).isTrue()
        assertThat(saved.hackathon.id).isEqualTo(testHackathon.id)
        assertThat(saved.createdAt).isNotNull()
        assertThat(saved.updatedAt).isNotNull()
    }

    @Test
    fun `date time storage and retrieval accuracy should be maintained`() {
        val startsAt = OffsetDateTime.parse("2026-02-15T09:30:00-08:00")
        val endsAt = OffsetDateTime.parse("2026-02-15T17:00:00-08:00")

        val event = ScheduleEvent(
            hackathon = testHackathon,
            name = "Full Day Workshop",
            startsAt = startsAt,
            endsAt = endsAt
        )

        val saved = scheduleEventRepository.save(event)
        entityManager.flush()
        entityManager.clear()

        val retrieved = scheduleEventRepository.findById(saved.id!!).get()

        // Verify that timestamps are stored and retrieved accurately
        // Note: OffsetDateTime comparisons account for timezone differences
        assertThat(retrieved.startsAt).isEqualTo(startsAt)
        assertThat(retrieved.endsAt).isEqualTo(endsAt)
        // Verify the duration between events is correct (7.5 hours)
        assertThat(java.time.Duration.between(retrieved.startsAt, retrieved.endsAt).toHours()).isEqualTo(7)
    }

    @Test
    fun `cascade deletion when hackathon is deleted should work correctly`() {
        val now = OffsetDateTime.now()
        val event = ScheduleEvent(
            hackathon = testHackathon,
            name = "Cascade Test Event",
            startsAt = now.plusHours(1),
            endsAt = now.plusHours(2)
        )
        entityManager.persist(event)
        entityManager.flush()

        val eventId = event.id
        assertThat(eventId).isNotNull()

        // Delete the hackathon
        hackathonRepository.delete(testHackathon)
        entityManager.flush()
        entityManager.clear()

        // Event should be deleted due to cascade from hackathon
        val foundEvent = scheduleEventRepository.findById(eventId!!)
        assertThat(foundEvent).isEmpty
    }
}
