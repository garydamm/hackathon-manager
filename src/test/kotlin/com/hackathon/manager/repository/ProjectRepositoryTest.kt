package com.hackathon.manager.repository

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
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
class ProjectRepositoryTest : AbstractRepositoryTest() {

    @Autowired
    lateinit var entityManager: TestEntityManager

    @Autowired
    lateinit var projectRepository: ProjectRepository

    @Autowired
    lateinit var hackathonRepository: HackathonRepository

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team

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

        testTeam = Team(
            hackathon = testHackathon,
            name = "Test Team",
            createdBy = testUser
        )
        entityManager.persist(testTeam)

        entityManager.flush()
    }

    @Test
    fun `findByTeamId should return project for team`() {
        val project = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Test Project"
        )
        entityManager.persist(project)
        entityManager.flush()

        val found = projectRepository.findByTeamIdAndArchivedAtIsNull(testTeam.id!!)

        assertThat(found).isNotNull
        assertThat(found?.name).isEqualTo("Test Project")
        assertThat(found?.team?.id).isEqualTo(testTeam.id)
    }

    @Test
    fun `findByTeamId should return null when team has no project`() {
        val anotherTeam = Team(
            hackathon = testHackathon,
            name = "Another Team",
            createdBy = testUser
        )
        entityManager.persist(anotherTeam)
        entityManager.flush()

        val found = projectRepository.findByTeamIdAndArchivedAtIsNull(anotherTeam.id!!)

        assertThat(found).isNull()
    }

    @Test
    fun `findByHackathonId should return all projects for hackathon`() {
        val project1 = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Project 1",
            status = SubmissionStatus.draft
        )
        entityManager.persist(project1)

        val anotherTeam = Team(
            hackathon = testHackathon,
            name = "Team 2",
            createdBy = testUser
        )
        entityManager.persist(anotherTeam)

        val project2 = Project(
            team = anotherTeam,
            hackathon = testHackathon,
            name = "Project 2",
            status = SubmissionStatus.submitted
        )
        entityManager.persist(project2)

        entityManager.flush()

        val found = projectRepository.findByHackathonIdAndArchivedAtIsNull(testHackathon.id!!)

        assertThat(found).hasSize(2)
        assertThat(found.map { it.name }).containsExactlyInAnyOrder("Project 1", "Project 2")
    }

    @Test
    fun `findByHackathonId should return empty list when hackathon has no projects`() {
        val anotherHackathon = Hackathon(
            name = "Another Hackathon",
            slug = "another-hackathon",
            startsAt = OffsetDateTime.now().plusDays(3),
            endsAt = OffsetDateTime.now().plusDays(4),
            createdBy = testUser
        )
        entityManager.persist(anotherHackathon)
        entityManager.flush()

        val found = projectRepository.findByHackathonIdAndArchivedAtIsNull(anotherHackathon.id!!)

        assertThat(found).isEmpty()
    }

    @Test
    fun `findByHackathonIdAndStatus should filter by status correctly`() {
        val draftProject = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Draft Project",
            status = SubmissionStatus.draft
        )
        entityManager.persist(draftProject)

        val team2 = Team(
            hackathon = testHackathon,
            name = "Team 2",
            createdBy = testUser
        )
        entityManager.persist(team2)

        val submittedProject = Project(
            team = team2,
            hackathon = testHackathon,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )
        entityManager.persist(submittedProject)

        val team3 = Team(
            hackathon = testHackathon,
            name = "Team 3",
            createdBy = testUser
        )
        entityManager.persist(team3)

        val acceptedProject = Project(
            team = team3,
            hackathon = testHackathon,
            name = "Accepted Project",
            status = SubmissionStatus.accepted
        )
        entityManager.persist(acceptedProject)

        entityManager.flush()

        val draftProjects = projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(
            testHackathon.id!!,
            SubmissionStatus.draft
        )
        assertThat(draftProjects).hasSize(1)
        assertThat(draftProjects[0].name).isEqualTo("Draft Project")

        val submittedProjects = projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(
            testHackathon.id!!,
            SubmissionStatus.submitted
        )
        assertThat(submittedProjects).hasSize(1)
        assertThat(submittedProjects[0].name).isEqualTo("Submitted Project")

        val acceptedProjects = projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(
            testHackathon.id!!,
            SubmissionStatus.accepted
        )
        assertThat(acceptedProjects).hasSize(1)
        assertThat(acceptedProjects[0].name).isEqualTo("Accepted Project")
    }

    @Test
    fun `findByHackathonIdAndStatus should return empty list when no projects match status`() {
        val project = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Test Project",
            status = SubmissionStatus.draft
        )
        entityManager.persist(project)
        entityManager.flush()

        val found = projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(
            testHackathon.id!!,
            SubmissionStatus.rejected
        )

        assertThat(found).isEmpty()
    }

    @Test
    fun `project creation with team and hackathon relationships should work correctly`() {
        val project = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "New Project",
            tagline = "An innovative solution",
            description = "This project aims to solve a problem",
            status = SubmissionStatus.draft,
            demoUrl = "https://demo.example.com",
            repositoryUrl = "https://github.com/example/project",
            technologies = arrayOf("Kotlin", "Spring Boot", "PostgreSQL")
        )

        val saved = projectRepository.save(project)
        entityManager.flush()
        entityManager.clear()

        assertThat(saved.id).isNotNull()
        assertThat(saved.name).isEqualTo("New Project")
        assertThat(saved.tagline).isEqualTo("An innovative solution")
        assertThat(saved.description).isEqualTo("This project aims to solve a problem")
        assertThat(saved.status).isEqualTo(SubmissionStatus.draft)
        assertThat(saved.demoUrl).isEqualTo("https://demo.example.com")
        assertThat(saved.repositoryUrl).isEqualTo("https://github.com/example/project")
        assertThat(saved.technologies).containsExactly("Kotlin", "Spring Boot", "PostgreSQL")
        assertThat(saved.team.id).isEqualTo(testTeam.id)
        assertThat(saved.hackathon.id).isEqualTo(testHackathon.id)
        assertThat(saved.createdAt).isNotNull()
        assertThat(saved.updatedAt).isNotNull()
    }

    @Test
    fun `cascade deletion should delete project when team is deleted`() {
        val project = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Cascade Test Project"
        )
        entityManager.persist(project)
        entityManager.flush()

        val projectId = project.id
        assertThat(projectId).isNotNull()

        // Delete the team
        entityManager.remove(testTeam)
        entityManager.flush()
        entityManager.clear()

        // Project should be deleted due to cascade from team
        val foundProject = projectRepository.findById(projectId!!)
        assertThat(foundProject).isEmpty
    }

    @Test
    fun `cascade deletion should delete project when hackathon is deleted`() {
        val project = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Cascade Test Project"
        )
        entityManager.persist(project)
        entityManager.flush()

        val projectId = project.id
        assertThat(projectId).isNotNull()

        // Delete the hackathon
        hackathonRepository.delete(testHackathon)
        entityManager.flush()
        entityManager.clear()

        // Project should be deleted due to cascade from hackathon
        val foundProject = projectRepository.findById(projectId!!)
        assertThat(foundProject).isEmpty
    }

    @Test
    fun `archivedAt field should be nullable and persist correctly`() {
        // Create project without archivedAt (should default to null)
        val project = Project(
            team = testTeam,
            hackathon = testHackathon,
            name = "Test Project"
        )
        entityManager.persist(project)
        entityManager.flush()

        val projectId = project.id!!
        assertThat(project.archivedAt).isNull()

        // Set archivedAt timestamp
        val archiveTime = OffsetDateTime.now()
        project.archivedAt = archiveTime
        entityManager.flush()
        entityManager.clear()

        // Verify archivedAt was persisted
        val found = projectRepository.findById(projectId)
        assertThat(found).isPresent
        assertThat(found.get().archivedAt).isNotNull()
        // Compare as instants to handle timezone differences
        assertThat(found.get().archivedAt!!.toInstant())
            .isEqualTo(archiveTime.toInstant())
    }
}
