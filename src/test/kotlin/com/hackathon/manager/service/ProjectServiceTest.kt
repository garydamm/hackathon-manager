package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateProjectRequest
import com.hackathon.manager.dto.UpdateProjectRequest
import com.hackathon.manager.entity.*
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.*
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
class ProjectServiceTest {

    @Mock
    lateinit var projectRepository: ProjectRepository

    @Mock
    lateinit var teamRepository: TeamRepository

    @Mock
    lateinit var teamMemberRepository: TeamMemberRepository

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @InjectMocks
    lateinit var projectService: ProjectService

    private lateinit var testUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team
    private lateinit var testProject: Project
    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testTeamId = UUID.randomUUID()
    private val testProjectId = UUID.randomUUID()

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

        testTeam = Team(
            id = testTeamId,
            hackathon = testHackathon,
            name = "Test Team",
            inviteCode = "ABC12345",
            isOpen = true,
            createdBy = testUser
        )

        testProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            name = "Test Project",
            tagline = "A test project",
            description = "Description",
            status = SubmissionStatus.draft
        )
    }

    @Test
    fun `getProjectsByHackathon should return all projects`() {
        whenever(projectRepository.findByHackathonId(testHackathonId)).thenReturn(listOf(testProject))

        val result = projectService.getProjectsByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Test Project")
        assertThat(result[0].hackathonId).isEqualTo(testHackathonId)
    }

    @Test
    fun `getSubmittedProjectsByHackathon should return only submitted projects`() {
        val submittedProject = Project(
            id = UUID.randomUUID(),
            team = testTeam,
            hackathon = testHackathon,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )

        whenever(projectRepository.findByHackathonIdAndStatus(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(submittedProject))

        val result = projectService.getSubmittedProjectsByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].status).isEqualTo(SubmissionStatus.submitted)
    }

    @Test
    fun `getProjectById should return project when found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))

        val result = projectService.getProjectById(testProjectId)

        assertThat(result.id).isEqualTo(testProjectId)
        assertThat(result.name).isEqualTo("Test Project")
    }

    @Test
    fun `getProjectById should throw exception when not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.getProjectById(testProjectId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `getProjectByTeam should return project when exists`() {
        whenever(projectRepository.findByTeamId(testTeamId)).thenReturn(testProject)

        val result = projectService.getProjectByTeam(testTeamId)

        assertThat(result).isNotNull
        assertThat(result!!.teamId).isEqualTo(testTeamId)
    }

    @Test
    fun `getProjectByTeam should return null when no project exists`() {
        whenever(projectRepository.findByTeamId(testTeamId)).thenReturn(null)

        val result = projectService.getProjectByTeam(testTeamId)

        assertThat(result).isNull()
    }

    @Test
    fun `createProject should create project successfully`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project",
            tagline = "A new project",
            description = "Project description",
            technologies = listOf("Kotlin", "Spring Boot")
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonId(testTeamId, testHackathonId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { invocation ->
            val project = invocation.arguments[0] as Project
            Project(
                id = UUID.randomUUID(),
                team = project.team,
                hackathon = project.hackathon,
                name = project.name,
                tagline = project.tagline,
                description = project.description,
                technologies = project.technologies
            )
        }

        val result = projectService.createProject(request, testUserId)

        assertThat(result.name).isEqualTo("New Project")
        assertThat(result.tagline).isEqualTo("A new project")
        assertThat(result.technologies).containsExactly("Kotlin", "Spring Boot")
        assertThat(result.status).isEqualTo(SubmissionStatus.draft)

        verify(projectRepository).save(any<Project>())
    }

    @Test
    fun `createProject should throw exception when team not found`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Team not found")
    }

    @Test
    fun `createProject should throw exception when not a team member`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(false)

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Must be a team member to create a project")
    }

    @Test
    fun `createProject should throw exception when project already exists`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonId(testTeamId, testHackathonId)).thenReturn(true)

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Team already has a project for this hackathon")
    }

    @Test
    fun `updateProject should update project fields`() {
        val request = UpdateProjectRequest(
            name = "Updated Project",
            tagline = "Updated tagline",
            description = "Updated description",
            demoUrl = "https://demo.example.com",
            videoUrl = "https://video.example.com",
            repositoryUrl = "https://github.com/example",
            technologies = listOf("Kotlin", "React")
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.updateProject(testProjectId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated Project")
        assertThat(result.tagline).isEqualTo("Updated tagline")
        assertThat(result.description).isEqualTo("Updated description")
        assertThat(result.demoUrl).isEqualTo("https://demo.example.com")
    }

    @Test
    fun `updateProject should throw exception when not found`() {
        val request = UpdateProjectRequest(name = "Updated")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.updateProject(testProjectId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `updateProject should throw exception when not a team member`() {
        val request = UpdateProjectRequest(name = "Updated")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(false)

        assertThatThrownBy { projectService.updateProject(testProjectId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Must be a team member to update the project")
    }

    @Test
    fun `updateProject should throw exception when project is submitted`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )
        val request = UpdateProjectRequest(name = "Updated")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)

        assertThatThrownBy { projectService.updateProject(testProjectId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Cannot update a submitted project")
    }

    @Test
    fun `submitProject should submit project successfully`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.submitProject(testProjectId, testUserId)

        assertThat(result.status).isEqualTo(SubmissionStatus.submitted)
        assertThat(result.submittedAt).isNotNull()
    }

    @Test
    fun `submitProject should throw exception when not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.submitProject(testProjectId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `submitProject should throw exception when not a team member`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(false)

        assertThatThrownBy { projectService.submitProject(testProjectId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Must be a team member to submit the project")
    }

    @Test
    fun `submitProject should throw exception when already submitted`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)

        assertThatThrownBy { projectService.submitProject(testProjectId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Project already submitted")
    }

    @Test
    fun `unsubmitProject should unsubmit project successfully`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            name = "Submitted Project",
            status = SubmissionStatus.submitted,
            submittedAt = OffsetDateTime.now()
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.unsubmitProject(testProjectId, testUserId)

        assertThat(result.status).isEqualTo(SubmissionStatus.draft)
        assertThat(result.submittedAt).isNull()
    }

    @Test
    fun `unsubmitProject should throw exception when not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.unsubmitProject(testProjectId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `unsubmitProject should throw exception when not a team member`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(false)

        assertThatThrownBy { projectService.unsubmitProject(testProjectId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Must be a team member to unsubmit the project")
    }

    @Test
    fun `unsubmitProject should throw exception when not submitted`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)

        assertThatThrownBy { projectService.unsubmitProject(testProjectId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Project is not submitted")
    }
}
