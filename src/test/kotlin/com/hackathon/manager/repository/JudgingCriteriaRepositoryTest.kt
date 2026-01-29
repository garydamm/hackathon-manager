package com.hackathon.manager.repository

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.User
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import java.math.BigDecimal
import java.time.OffsetDateTime

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JudgingCriteriaRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var judgingCriteriaRepository: JudgingCriteriaRepository

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
    fun `findByHackathonIdOrderByDisplayOrder should return sorted criteria`() {
        // Create criteria out of displayOrder order
        val criteria3 = JudgingCriteria(
            hackathon = testHackathon,
            name = "Presentation",
            description = "Quality of presentation",
            maxScore = 10,
            weight = BigDecimal("1.50"),
            displayOrder = 3
        )
        entityManager.persist(criteria3)

        val criteria1 = JudgingCriteria(
            hackathon = testHackathon,
            name = "Innovation",
            description = "Creativity and innovation",
            maxScore = 10,
            weight = BigDecimal("2.00"),
            displayOrder = 1
        )
        entityManager.persist(criteria1)

        val criteria2 = JudgingCriteria(
            hackathon = testHackathon,
            name = "Technical Complexity",
            description = "Technical difficulty",
            maxScore = 10,
            weight = BigDecimal("1.75"),
            displayOrder = 2
        )
        entityManager.persist(criteria2)

        entityManager.flush()

        val found = judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathon.id!!)

        assertThat(found).hasSize(3)
        // Verify criteria are sorted by displayOrder
        assertThat(found[0].name).isEqualTo("Innovation")
        assertThat(found[0].displayOrder).isEqualTo(1)
        assertThat(found[1].name).isEqualTo("Technical Complexity")
        assertThat(found[1].displayOrder).isEqualTo(2)
        assertThat(found[2].name).isEqualTo("Presentation")
        assertThat(found[2].displayOrder).isEqualTo(3)
    }

    @Test
    fun `findByHackathonIdOrderByDisplayOrder should return empty list when hackathon has no criteria`() {
        val anotherHackathon = Hackathon(
            name = "Another Hackathon",
            slug = "another-hackathon",
            startsAt = OffsetDateTime.now().plusDays(3),
            endsAt = OffsetDateTime.now().plusDays(4),
            createdBy = testUser
        )
        entityManager.persist(anotherHackathon)
        entityManager.flush()

        val found = judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(anotherHackathon.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `criteria creation with hackathon relationship should work correctly`() {
        val criteria = JudgingCriteria(
            hackathon = testHackathon,
            name = "User Experience",
            description = "How user-friendly is the solution?",
            maxScore = 10,
            weight = BigDecimal("1.25"),
            displayOrder = 1
        )

        val saved = judgingCriteriaRepository.save(criteria)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.name).isEqualTo("User Experience")
        assertThat(saved.description).isEqualTo("How user-friendly is the solution?")
        assertThat(saved.maxScore).isEqualTo(10)
        assertThat(saved.weight).isEqualByComparingTo(BigDecimal("1.25"))
        assertThat(saved.displayOrder).isEqualTo(1)
        assertThat(saved.hackathon.id).isEqualTo(testHackathon.id)
        assertThat(saved.createdAt).isNotNull()
    }

    @Test
    fun `display order sorting accuracy should be maintained`() {
        // Create multiple criteria with different display orders
        for (i in 1..5) {
            val criteria = JudgingCriteria(
                hackathon = testHackathon,
                name = "Criteria $i",
                displayOrder = i
            )
            entityManager.persist(criteria)
        }
        entityManager.flush()

        val found = judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathon.id!!)

        assertThat(found).hasSize(5)
        // Verify that displayOrder is accurate
        for (i in 0..4) {
            assertThat(found[i].displayOrder).isEqualTo(i + 1)
            assertThat(found[i].name).isEqualTo("Criteria ${i + 1}")
        }
    }

    @Test
    fun `cascade deletion when hackathon is deleted should work correctly`() {
        val criteria = JudgingCriteria(
            hackathon = testHackathon,
            name = "Cascade Test Criteria",
            displayOrder = 1
        )
        entityManager.persist(criteria)
        entityManager.flush()

        val criteriaId = criteria.id
        assertThat(criteriaId).isNotNull()

        // Delete the hackathon
        hackathonRepository.delete(testHackathon)
        entityManager.flush()
        entityManager.clear()

        // Criteria should be deleted due to cascade from hackathon
        val foundCriteria = judgingCriteriaRepository.findById(criteriaId!!)
        assertThat(foundCriteria).isEmpty
    }
}
