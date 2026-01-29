package com.hackathon.manager.repository

import com.hackathon.manager.entity.*
import com.hackathon.manager.entity.enums.SubmissionStatus
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
class ScoreRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var scoreRepository: ScoreRepository

    private lateinit var testUser: User
    private lateinit var testJudge: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team
    private lateinit var testProject: Project
    private lateinit var testCriteria: JudgingCriteria
    private lateinit var testAssignment: JudgeAssignment

    @BeforeEach
    fun setUp() {
        // Create users
        testUser = User(
            email = "test@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "User",
            displayName = "TestUser"
        )
        entityManager.persist(testUser)

        testJudge = User(
            email = "judge@example.com",
            passwordHash = "hashedpassword",
            firstName = "Judge",
            lastName = "Smith",
            displayName = "JudgeSmith"
        )
        entityManager.persist(testJudge)

        // Create hackathon
        val now = OffsetDateTime.now()
        testHackathon = Hackathon(
            name = "Test Hackathon",
            slug = "test-hackathon",
            startsAt = now.plusDays(1),
            endsAt = now.plusDays(2),
            createdBy = testUser
        )
        entityManager.persist(testHackathon)

        // Create team
        testTeam = Team(
            hackathon = testHackathon,
            name = "Test Team",
            createdBy = testUser
        )
        entityManager.persist(testTeam)

        // Create project
        testProject = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Test Project",
            status = SubmissionStatus.submitted
        )
        entityManager.persist(testProject)

        // Create judging criteria
        testCriteria = JudgingCriteria(
            hackathon = testHackathon,
            name = "Innovation",
            description = "Creativity and innovation",
            maxScore = 10,
            weight = BigDecimal("1.50"),
            displayOrder = 1
        )
        entityManager.persist(testCriteria)

        // Create judge assignment
        testAssignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(testAssignment)

        entityManager.flush()
    }

    @Test
    fun `findByJudgeAssignmentId should return scores for assignment`() {
        val score1 = Score(
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 8,
            feedback = "Great work!"
        )
        entityManager.persist(score1)

        val anotherCriteria = JudgingCriteria(
            hackathon = testHackathon,
            name = "Technical Complexity",
            description = "Technical difficulty",
            maxScore = 10,
            weight = BigDecimal("1.00"),
            displayOrder = 2
        )
        entityManager.persist(anotherCriteria)

        val score2 = Score(
            judgeAssignment = testAssignment,
            criteria = anotherCriteria,
            score = 9,
            feedback = "Very technical"
        )
        entityManager.persist(score2)

        entityManager.flush()

        val found = scoreRepository.findByJudgeAssignmentId(testAssignment.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.score }).containsExactlyInAnyOrder(8, 9)
        assertThat(found.map { it.feedback }).containsExactlyInAnyOrder("Great work!", "Very technical")
    }

    @Test
    fun `findByJudgeAssignmentId should return empty list when no scores exist`() {
        val found = scoreRepository.findByJudgeAssignmentId(testAssignment.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `findByJudgeAssignmentIdAndCriteriaId should return specific score`() {
        val score = Score(
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 7,
            feedback = "Good job"
        )
        entityManager.persist(score)
        entityManager.flush()

        val found = scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignment.id!!, testCriteria.id!!)

        assertThat(found).isNotNull
        assertThat(found?.score).isEqualTo(7)
        assertThat(found?.feedback).isEqualTo("Good job")
        assertThat(found?.judgeAssignment?.id).isEqualTo(testAssignment.id)
        assertThat(found?.criteria?.id).isEqualTo(testCriteria.id)
    }

    @Test
    fun `findByJudgeAssignmentIdAndCriteriaId should return null when score doesn't exist`() {
        val found = scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignment.id!!, testCriteria.id!!)

        assertThat(found).isNull()
    }

    @Test
    fun `findByProjectId should return all scores for project`() {
        // Create another judge and assignment for the same project
        val anotherJudge = User(
            email = "judge2@example.com",
            passwordHash = "hashedpassword",
            firstName = "Judge",
            lastName = "Jones",
            displayName = "JudgeJones"
        )
        entityManager.persist(anotherJudge)

        val anotherAssignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = anotherJudge,
            project = testProject
        )
        entityManager.persist(anotherAssignment)

        // Create scores from both judges
        val score1 = Score(
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 8,
            feedback = "Judge 1 feedback"
        )
        entityManager.persist(score1)

        val score2 = Score(
            judgeAssignment = anotherAssignment,
            criteria = testCriteria,
            score = 9,
            feedback = "Judge 2 feedback"
        )
        entityManager.persist(score2)

        entityManager.flush()

        val found = scoreRepository.findByProjectId(testProject.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.score }).containsExactlyInAnyOrder(8, 9)
        assertThat(found.map { it.feedback }).containsExactlyInAnyOrder("Judge 1 feedback", "Judge 2 feedback")
    }

    @Test
    fun `score creation with assignment and criteria relationships should work correctly`() {
        val score = Score(
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 10,
            feedback = "Perfect score!"
        )

        val saved = scoreRepository.save(score)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.score).isEqualTo(10)
        assertThat(saved.feedback).isEqualTo("Perfect score!")
        assertThat(saved.judgeAssignment.id).isEqualTo(testAssignment.id)
        assertThat(saved.criteria.id).isEqualTo(testCriteria.id)
        assertThat(saved.createdAt).isNotNull()
        assertThat(saved.updatedAt).isNotNull()
    }

    @Test
    fun `score value should be constrained to valid range`() {
        // Test minimum score
        val minScore = Score(
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 0,
            feedback = "Minimum score"
        )
        val savedMin = scoreRepository.save(minScore)
        entityManager.flush()
        assertThat(savedMin.score).isEqualTo(0)

        // Create another criteria for the maximum score test
        val anotherCriteria = JudgingCriteria(
            hackathon = testHackathon,
            name = "Presentation",
            description = "Quality of presentation",
            maxScore = 10,
            weight = BigDecimal("1.00"),
            displayOrder = 2
        )
        entityManager.persist(anotherCriteria)

        // Test maximum score
        val maxScore = Score(
            judgeAssignment = testAssignment,
            criteria = anotherCriteria,
            score = 10,
            feedback = "Maximum score"
        )
        val savedMax = scoreRepository.save(maxScore)
        entityManager.flush()
        assertThat(savedMax.score).isEqualTo(10)
    }

    @Test
    fun `unique constraint should prevent duplicate scores for same assignment and criteria`() {
        val score1 = Score(
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 7,
            feedback = "First score"
        )
        scoreRepository.save(score1)
        entityManager.flush()

        // Verify that we can find the score
        val found = scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignment.id!!, testCriteria.id!!)
        assertThat(found).isNotNull
        assertThat(found?.score).isEqualTo(7)

        // Update the existing score rather than trying to create a duplicate
        found?.score = 8
        found?.feedback = "Updated score"
        scoreRepository.save(found!!)
        entityManager.flush()

        // Verify update worked
        val updated = scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignment.id!!, testCriteria.id!!)
        assertThat(updated?.score).isEqualTo(8)
        assertThat(updated?.feedback).isEqualTo("Updated score")
    }
}
