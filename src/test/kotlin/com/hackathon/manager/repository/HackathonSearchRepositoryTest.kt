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
import org.springframework.context.annotation.Import
import org.springframework.data.domain.PageRequest
import java.time.OffsetDateTime
import java.time.ZoneOffset

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(HackathonSearchRepository::class)
class HackathonSearchRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var searchRepository: HackathonSearchRepository

    private lateinit var testUser: User

    private val defaultPageable = PageRequest.of(0, 20)

    @BeforeEach
    fun setUp() {
        testUser = User(
            email = "searchtest@example.com",
            passwordHash = "hashedpassword",
            firstName = "Search",
            lastName = "Tester"
        )
        entityManager.persist(testUser)
        entityManager.flush()
    }

    private fun createHackathon(
        name: String,
        slug: String,
        description: String? = null,
        status: HackathonStatus = HackathonStatus.registration_open,
        startsAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC).plusDays(7),
        endsAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC).plusDays(9),
        archived: Boolean = false,
        location: String? = null,
        isVirtual: Boolean = false
    ): Hackathon {
        val hackathon = Hackathon(
            name = name,
            slug = slug,
            description = description,
            status = status,
            startsAt = startsAt,
            endsAt = endsAt,
            archived = archived,
            location = location,
            isVirtual = isVirtual,
            createdBy = testUser
        )
        entityManager.persist(hackathon)
        return hackathon
    }

    private fun flushAndClear() {
        entityManager.flush()
        entityManager.entityManager.clear()
    }

    // --- Full-text search tests ---

    @Test
    fun `full-text search by name returns matching hackathons ranked by relevance`() {
        createHackathon(
            name = "AI Innovation Challenge",
            slug = "ai-innovation",
            description = "Build something cool",
            status = HackathonStatus.registration_open
        )
        createHackathon(
            name = "Web Development Sprint",
            slug = "web-dev-sprint",
            description = "AI powered web applications",
            status = HackathonStatus.registration_open
        )
        createHackathon(
            name = "Cooking Contest",
            slug = "cooking-contest",
            description = "Make the best dish",
            status = HackathonStatus.registration_open
        )
        flushAndClear()

        val results = searchRepository.search(
            query = "AI",
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(2)
        assertThat(results.content.map { it.slug }).containsExactlyInAnyOrder(
            "ai-innovation", "web-dev-sprint"
        )
        // Name match (weight A) should rank higher than description match (weight B)
        assertThat(results.content[0].slug).isEqualTo("ai-innovation")
        assertThat(results.content[0].relevanceScore).isNotNull()
        assertThat(results.content[0].relevanceScore!!).isGreaterThan(results.content[1].relevanceScore!!)
    }

    @Test
    fun `full-text search by description returns matching hackathons`() {
        createHackathon(
            name = "Spring Hackathon",
            slug = "spring-hack",
            description = "Build innovative machine learning solutions",
            status = HackathonStatus.registration_open
        )
        createHackathon(
            name = "Summer Code Jam",
            slug = "summer-jam",
            description = "Create awesome web applications",
            status = HackathonStatus.registration_open
        )
        flushAndClear()

        val results = searchRepository.search(
            query = "machine learning",
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("spring-hack")
        assertThat(results.content[0].relevanceScore).isNotNull()
    }

    // --- Time frame filter tests ---

    @Test
    fun `filter by timeFrame=upcoming returns only future hackathons`() {
        createHackathon(
            name = "Future Hack",
            slug = "future-hack",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(10),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(12)
        )
        createHackathon(
            name = "Current Hack",
            slug = "current-hack",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1)
        )
        createHackathon(
            name = "Old Hack",
            slug = "old-hack",
            status = HackathonStatus.completed,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(20),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(18)
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = "upcoming",
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("future-hack")
    }

    @Test
    fun `filter by timeFrame=ongoing returns only currently running hackathons`() {
        createHackathon(
            name = "Future Hack",
            slug = "future-hack",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(10),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(12)
        )
        createHackathon(
            name = "Current Hack",
            slug = "current-hack",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1)
        )
        createHackathon(
            name = "Old Hack",
            slug = "old-hack",
            status = HackathonStatus.completed,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(20),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(18)
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = "ongoing",
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("current-hack")
    }

    @Test
    fun `filter by timeFrame=past returns only completed hackathons`() {
        createHackathon(
            name = "Future Hack",
            slug = "future-hack",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(10),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(12)
        )
        createHackathon(
            name = "Current Hack",
            slug = "current-hack",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1)
        )
        createHackathon(
            name = "Old Hack",
            slug = "old-hack",
            status = HackathonStatus.completed,
            startsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(20),
            endsAt = OffsetDateTime.now(ZoneOffset.UTC).minusDays(18)
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = "past",
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("old-hack")
    }

    // --- Custom date range test ---

    @Test
    fun `filter by custom date range returns hackathons within range`() {
        val rangeStart = OffsetDateTime.of(2025, 6, 1, 0, 0, 0, 0, ZoneOffset.UTC)
        val rangeEnd = OffsetDateTime.of(2025, 6, 30, 23, 59, 59, 0, ZoneOffset.UTC)

        createHackathon(
            name = "June Hack",
            slug = "june-hack",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.of(2025, 6, 10, 0, 0, 0, 0, ZoneOffset.UTC),
            endsAt = OffsetDateTime.of(2025, 6, 12, 0, 0, 0, 0, ZoneOffset.UTC)
        )
        createHackathon(
            name = "July Hack",
            slug = "july-hack",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.of(2025, 7, 10, 0, 0, 0, 0, ZoneOffset.UTC),
            endsAt = OffsetDateTime.of(2025, 7, 12, 0, 0, 0, 0, ZoneOffset.UTC)
        )
        createHackathon(
            name = "May Hack",
            slug = "may-hack",
            status = HackathonStatus.registration_open,
            startsAt = OffsetDateTime.of(2025, 5, 10, 0, 0, 0, 0, ZoneOffset.UTC),
            endsAt = OffsetDateTime.of(2025, 5, 12, 0, 0, 0, 0, ZoneOffset.UTC)
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = rangeStart,
            endDate = rangeEnd,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("june-hack")
    }

    // --- Status filter test ---

    @Test
    fun `filter by status=registration_open returns only matching hackathons`() {
        createHackathon(
            name = "Open Hack",
            slug = "open-hack",
            status = HackathonStatus.registration_open
        )
        createHackathon(
            name = "In Progress Hack",
            slug = "in-progress-hack",
            status = HackathonStatus.in_progress
        )
        createHackathon(
            name = "Completed Hack",
            slug = "completed-hack",
            status = HackathonStatus.completed
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = HackathonStatus.registration_open,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("open-hack")
        assertThat(results.content[0].status).isEqualTo(HackathonStatus.registration_open)
    }

    // --- Combined filters test ---

    @Test
    fun `combining query and status filters returns correct intersection`() {
        createHackathon(
            name = "AI Open Hackathon",
            slug = "ai-open",
            description = "Artificial intelligence competition",
            status = HackathonStatus.registration_open
        )
        createHackathon(
            name = "AI Closed Hackathon",
            slug = "ai-closed",
            description = "Another AI event",
            status = HackathonStatus.in_progress
        )
        createHackathon(
            name = "Web Open Hackathon",
            slug = "web-open",
            description = "Web development event",
            status = HackathonStatus.registration_open
        )
        flushAndClear()

        val results = searchRepository.search(
            query = "AI",
            status = HackathonStatus.registration_open,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("ai-open")
    }

    // --- Exclusion tests ---

    @Test
    fun `archived hackathons are never returned`() {
        createHackathon(
            name = "Active Hack",
            slug = "active-hack",
            status = HackathonStatus.registration_open,
            archived = false
        )
        createHackathon(
            name = "Archived Hack",
            slug = "archived-hack",
            status = HackathonStatus.registration_open,
            archived = true
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("active-hack")
    }

    @Test
    fun `draft hackathons are never returned`() {
        createHackathon(
            name = "Published Hack",
            slug = "published-hack",
            status = HackathonStatus.registration_open
        )
        createHackathon(
            name = "Draft Hack",
            slug = "draft-hack",
            status = HackathonStatus.draft
        )
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        assertThat(results.content[0].slug).isEqualTo("published-hack")
    }

    // --- Pagination test ---

    @Test
    fun `pagination returns correct page, size, totalElements, and totalPages`() {
        // Create 5 hackathons
        for (i in 1..5) {
            createHackathon(
                name = "Hackathon $i",
                slug = "hackathon-$i",
                status = HackathonStatus.registration_open,
                startsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(i.toLong()),
                endsAt = OffsetDateTime.now(ZoneOffset.UTC).plusDays(i.toLong() + 2)
            )
        }
        flushAndClear()

        val page0 = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = PageRequest.of(0, 2)
        )

        assertThat(page0.content).hasSize(2)
        assertThat(page0.number).isEqualTo(0)
        assertThat(page0.size).isEqualTo(2)
        assertThat(page0.totalElements).isEqualTo(5)
        assertThat(page0.totalPages).isEqualTo(3)

        val page1 = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = PageRequest.of(1, 2)
        )

        assertThat(page1.content).hasSize(2)
        assertThat(page1.number).isEqualTo(1)

        val page2 = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = PageRequest.of(2, 2)
        )

        assertThat(page2.content).hasSize(1)
        assertThat(page2.number).isEqualTo(2)
    }

    // --- No personal information test ---

    @Test
    fun `no personal information appears in search results`() {
        val hackathon = createHackathon(
            name = "Public Hack",
            slug = "public-hack",
            description = "A public hackathon",
            status = HackathonStatus.registration_open
        )
        // Add a participant to the hackathon
        val participant = User(
            email = "participant@example.com",
            passwordHash = "hashedpassword",
            firstName = "Participant",
            lastName = "Person"
        )
        entityManager.persist(participant)
        entityManager.flush()

        val hackathonUser = HackathonUser(
            hackathon = hackathon,
            user = participant,
            role = UserRole.participant
        )
        entityManager.persist(hackathonUser)
        flushAndClear()

        val results = searchRepository.search(
            query = null,
            status = null,
            timeFrame = null,
            startDate = null,
            endDate = null,
            pageable = defaultPageable
        )

        assertThat(results.totalElements).isEqualTo(1)
        val result = results.content[0]

        // Verify public fields are present
        assertThat(result.id).isNotNull()
        assertThat(result.name).isEqualTo("Public Hack")
        assertThat(result.slug).isEqualTo("public-hack")
        assertThat(result.description).isEqualTo("A public hackathon")
        assertThat(result.status).isEqualTo(HackathonStatus.registration_open)
        assertThat(result.participantCount).isEqualTo(1)

        // HackathonSearchResult DTO does not have createdBy, email, or any user fields
        // This is enforced by the DTO structure itself — verify by checking the DTO has
        // only the expected fields (no createdBy, no user info)
        val resultString = result.toString()
        assertThat(resultString).doesNotContain("searchtest@example.com")
        assertThat(resultString).doesNotContain("participant@example.com")
        assertThat(resultString).doesNotContain("hashedpassword")
    }
}
