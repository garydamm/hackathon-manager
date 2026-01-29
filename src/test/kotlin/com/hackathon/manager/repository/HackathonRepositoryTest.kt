package com.hackathon.manager.repository

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.UserRole
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
class HackathonRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var hackathonRepository: HackathonRepository

    @Autowired
    lateinit var hackathonUserRepository: HackathonUserRepository

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User"
        )
        entityManager.persist(testUser)

        testHackathon = Hackathon(
            name = "Test Hackathon",
            slug = "test-hackathon",
            description = "A test hackathon",
            status = HackathonStatus.draft,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )
    }

    @Test
    fun `findBySlug should return hackathon when exists`() {
        entityManager.persist(testHackathon)
        entityManager.flush()

        val found = hackathonRepository.findBySlug("test-hackathon")

        assertThat(found).isNotNull
        assertThat(found!!.slug).isEqualTo("test-hackathon")
        assertThat(found.name).isEqualTo("Test Hackathon")
    }

    @Test
    fun `findBySlug should return null when not exists`() {
        val found = hackathonRepository.findBySlug("non-existent")

        assertThat(found).isNull()
    }

    @Test
    fun `existsBySlug should return true when exists`() {
        entityManager.persist(testHackathon)
        entityManager.flush()

        val exists = hackathonRepository.existsBySlug("test-hackathon")

        assertThat(exists).isTrue()
    }

    @Test
    fun `existsBySlug should return false when not exists`() {
        val exists = hackathonRepository.existsBySlug("non-existent")

        assertThat(exists).isFalse()
    }

    @Test
    fun `findByStatusIn should return hackathons with matching statuses`() {
        val draftHackathon = testHackathon
        val openHackathon = Hackathon(
            name = "Open Hackathon",
            slug = "open-hackathon",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )
        val closedHackathon = Hackathon(
            name = "Closed Hackathon",
            slug = "closed-hackathon",
            status = HackathonStatus.completed,
            startsAt = OffsetDateTime.now().minusDays(10),
            endsAt = OffsetDateTime.now().minusDays(8),
            createdBy = testUser
        )

        entityManager.persist(draftHackathon)
        entityManager.persist(openHackathon)
        entityManager.persist(closedHackathon)
        entityManager.flush()

        val found = hackathonRepository.findByStatusIn(
            listOf(HackathonStatus.draft, HackathonStatus.registration_open)
        )

        assertThat(found).hasSize(2)
        assertThat(found.map { it.status }).containsExactlyInAnyOrder(
            HackathonStatus.draft,
            HackathonStatus.registration_open
        )
    }

    @Test
    fun `findActiveHackathons should return non-draft hackathons`() {
        val draftHackathon = testHackathon
        val openHackathon = Hackathon(
            name = "Open Hackathon",
            slug = "open-hackathon",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )
        val inProgressHackathon = Hackathon(
            name = "In Progress Hackathon",
            slug = "in-progress-hackathon",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now().minusDays(1),
            endsAt = OffsetDateTime.now().plusDays(1),
            createdBy = testUser
        )

        entityManager.persist(draftHackathon)
        entityManager.persist(openHackathon)
        entityManager.persist(inProgressHackathon)
        entityManager.flush()

        val found = hackathonRepository.findActiveHackathons()

        assertThat(found).hasSize(2)
        assertThat(found.map { it.status }).containsExactlyInAnyOrder(
            HackathonStatus.registration_open,
            HackathonStatus.in_progress
        )
    }

    @Test
    fun `findByOrganizerAndStatus should return hackathons for organizer`() {
        entityManager.persist(testHackathon)
        entityManager.flush()

        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.organizer
        )
        entityManager.persist(hackathonUser)
        entityManager.flush()

        val found = hackathonRepository.findByOrganizerAndStatus(testUser.id!!, HackathonStatus.draft)

        assertThat(found).hasSize(1)
        assertThat(found[0].name).isEqualTo("Test Hackathon")
    }

    @Test
    fun `findByOrganizerAndStatus should return empty for non-organizer`() {
        val otherUser = User(
            email = "other@example.com",
            passwordHash = "hashedpassword",
            firstName = "Other",
            lastName = "User"
        )
        entityManager.persist(otherUser)
        entityManager.persist(testHackathon)
        entityManager.flush()

        val hackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testUser,
            role = UserRole.organizer
        )
        entityManager.persist(hackathonUser)
        entityManager.flush()

        val found = hackathonRepository.findByOrganizerAndStatus(otherUser.id!!, HackathonStatus.draft)

        assertThat(found).isEmpty()
    }

    @Test
    fun `save should persist hackathon with all fields`() {
        testHackathon.location = "San Francisco"
        testHackathon.isVirtual = false
        testHackathon.maxTeamSize = 4
        testHackathon.minTeamSize = 2
        testHackathon.maxParticipants = 100

        val saved = hackathonRepository.save(testHackathon)

        assertThat(saved.id).isNotNull()

        val found = entityManager.find(Hackathon::class.java, saved.id)
        assertThat(found.location).isEqualTo("San Francisco")
        assertThat(found.isVirtual).isFalse()
        assertThat(found.maxTeamSize).isEqualTo(4)
        assertThat(found.minTeamSize).isEqualTo(2)
        assertThat(found.maxParticipants).isEqualTo(100)
    }
}
