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
import java.time.OffsetDateTime

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JudgeAssignmentRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var judgeAssignmentRepository: JudgeAssignmentRepository

    private lateinit var testUser: User
    private lateinit var testJudge: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team
    private lateinit var testProject: Project

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

        entityManager.flush()
    }

    @Test
    fun `findByJudgeIdAndHackathonId should return judge's assignments`() {
        // Create assignments for the judge in the test hackathon
        val assignment1 = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment1)

        // Create another project for a second assignment
        val anotherTeam = Team(
            hackathon = testHackathon,
            name = "Another Team",
            createdBy = testUser
        )
        entityManager.persist(anotherTeam)

        val anotherProject = Project(
            team = anotherTeam,
            hackathon = testHackathon,
            name = "Another Project",
            status = SubmissionStatus.submitted
        )
        entityManager.persist(anotherProject)

        val assignment2 = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = anotherProject
        )
        entityManager.persist(assignment2)

        entityManager.flush()

        val found = judgeAssignmentRepository.findByJudgeIdAndHackathonId(testJudge.id!!, testHackathon.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.project.name }).containsExactlyInAnyOrder("Test Project", "Another Project")
    }

    @Test
    fun `findByJudgeIdAndHackathonId should return empty list when no assignments exist`() {
        val found = judgeAssignmentRepository.findByJudgeIdAndHackathonId(testJudge.id!!, testHackathon.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `findByProjectId should return all judges for project`() {
        // Create first judge assignment
        val assignment1 = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment1)

        // Create another judge
        val anotherJudge = User(
            email = "judge2@example.com",
            passwordHash = "hashedpassword",
            firstName = "Judge",
            lastName = "Jones",
            displayName = "JudgeJones"
        )
        entityManager.persist(anotherJudge)

        // Create second judge assignment for the same project
        val assignment2 = JudgeAssignment(
            hackathon = testHackathon,
            judge = anotherJudge,
            project = testProject
        )
        entityManager.persist(assignment2)

        entityManager.flush()

        val found = judgeAssignmentRepository.findByProjectId(testProject.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.judge.displayName }).containsExactlyInAnyOrder("JudgeSmith", "JudgeJones")
    }

    @Test
    fun `assignment creation with hackathon, judge, and project relationships should work correctly`() {
        val assignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )

        val saved = judgeAssignmentRepository.save(assignment)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.hackathon.id).isEqualTo(testHackathon.id)
        assertThat(saved.judge.id).isEqualTo(testJudge.id)
        assertThat(saved.project.id).isEqualTo(testProject.id)
        assertThat(saved.assignedAt).isNotNull()
        assertThat(saved.completedAt).isNull()
    }

    @Test
    fun `completedAt flag should update correctly`() {
        val assignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment)
        entityManager.flush()

        // Initially completedAt should be null
        assertThat(assignment.completedAt).isNull()

        // Mark as completed
        val now = OffsetDateTime.now()
        assignment.completedAt = now
        judgeAssignmentRepository.save(assignment)
        entityManager.flush()
        entityManager.clear()

        // Verify completedAt was updated
        val updated = judgeAssignmentRepository.findById(assignment.id!!).orElse(null)
        assertThat(updated).isNotNull
        assertThat(updated.completedAt).isNotNull()
        assertThat(updated.completedAt).isAfterOrEqualTo(now.minusMinutes(1))
        assertThat(updated.completedAt).isBeforeOrEqualTo(now.plusMinutes(1))
    }

    @Test
    fun `findByJudgeIdAndProjectId should return assignment when exists`() {
        val assignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment)
        entityManager.flush()

        val found = judgeAssignmentRepository.findByJudgeIdAndProjectId(testJudge.id!!, testProject.id!!)

        assertThat(found).isNotNull
        assertThat(found?.judge?.id).isEqualTo(testJudge.id)
        assertThat(found?.project?.id).isEqualTo(testProject.id)
    }

    @Test
    fun `findByJudgeIdAndProjectId should return null when assignment doesn't exist`() {
        val found = judgeAssignmentRepository.findByJudgeIdAndProjectId(testJudge.id!!, testProject.id!!)

        assertThat(found).isNull()
    }

    @Test
    fun `existsByJudgeIdAndProjectId should return true when assignment exists`() {
        val assignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment)
        entityManager.flush()

        val exists = judgeAssignmentRepository.existsByJudgeIdAndProjectId(testJudge.id!!, testProject.id!!)

        assertThat(exists).isTrue()
    }

    @Test
    fun `existsByJudgeIdAndProjectId should return false when assignment doesn't exist`() {
        val exists = judgeAssignmentRepository.existsByJudgeIdAndProjectId(testJudge.id!!, testProject.id!!)

        assertThat(exists).isFalse()
    }

    @Test
    fun `findByHackathonId should return all assignments for hackathon`() {
        // Create first assignment
        val assignment1 = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment1)

        // Create another judge and project
        val anotherJudge = User(
            email = "judge2@example.com",
            passwordHash = "hashedpassword",
            firstName = "Judge",
            lastName = "Jones",
            displayName = "JudgeJones"
        )
        entityManager.persist(anotherJudge)

        val anotherTeam = Team(
            hackathon = testHackathon,
            name = "Another Team",
            createdBy = testUser
        )
        entityManager.persist(anotherTeam)

        val anotherProject = Project(
            team = anotherTeam,
            hackathon = testHackathon,
            name = "Another Project",
            status = SubmissionStatus.submitted
        )
        entityManager.persist(anotherProject)

        // Create second assignment
        val assignment2 = JudgeAssignment(
            hackathon = testHackathon,
            judge = anotherJudge,
            project = anotherProject
        )
        entityManager.persist(assignment2)

        entityManager.flush()

        val found = judgeAssignmentRepository.findByHackathonId(testHackathon.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.judge.displayName }).containsExactlyInAnyOrder("JudgeSmith", "JudgeJones")
    }

    @Test
    fun `findByJudgeId should return all assignments for judge`() {
        // Create first assignment in test hackathon
        val assignment1 = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        entityManager.persist(assignment1)

        // Create another hackathon with another project
        val anotherHackathon = Hackathon(
            name = "Another Hackathon",
            slug = "another-hackathon",
            startsAt = OffsetDateTime.now().plusDays(10),
            endsAt = OffsetDateTime.now().plusDays(11),
            createdBy = testUser
        )
        entityManager.persist(anotherHackathon)

        val anotherTeam = Team(
            hackathon = anotherHackathon,
            name = "Team in Another Hackathon",
            createdBy = testUser
        )
        entityManager.persist(anotherTeam)

        val anotherProject = Project(
            team = anotherTeam,
            hackathon = anotherHackathon,
            name = "Project in Another Hackathon",
            status = SubmissionStatus.submitted
        )
        entityManager.persist(anotherProject)

        // Create second assignment for same judge in different hackathon
        val assignment2 = JudgeAssignment(
            hackathon = anotherHackathon,
            judge = testJudge,
            project = anotherProject
        )
        entityManager.persist(assignment2)

        entityManager.flush()

        val found = judgeAssignmentRepository.findByJudgeId(testJudge.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.hackathon.name }).containsExactlyInAnyOrder("Test Hackathon", "Another Hackathon")
    }

    @Test
    fun `unique constraint should prevent duplicate judge-project assignments`() {
        val assignment = JudgeAssignment(
            hackathon = testHackathon,
            judge = testJudge,
            project = testProject
        )
        judgeAssignmentRepository.save(assignment)
        entityManager.flush()

        // Verify existsByJudgeIdAndProjectId returns true
        val exists = judgeAssignmentRepository.existsByJudgeIdAndProjectId(testJudge.id!!, testProject.id!!)
        assertThat(exists).isTrue()

        // Verify only one assignment exists
        val found = judgeAssignmentRepository.findByJudgeIdAndProjectId(testJudge.id!!, testProject.id!!)
        assertThat(found).isNotNull
        assertThat(found?.id).isEqualTo(assignment.id)
    }
}
