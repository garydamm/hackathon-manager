package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateProjectRequest
import com.hackathon.manager.dto.UpdateProjectRequest
import com.hackathon.manager.entity.*
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.exception.*
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

    @Mock
    lateinit var hackathonService: HackathonService

    @Mock
    lateinit var userRepository: UserRepository

    @InjectMocks
    lateinit var projectService: ProjectService

    private lateinit var testUser: User
    private lateinit var otherUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team
    private lateinit var testProject: Project
    private val testUserId = UUID.randomUUID()
    private val otherUserId = UUID.randomUUID()
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

        otherUser = User(
            id = otherUserId,
            email = "other@example.com",
            passwordHash = "hashedpassword",
            firstName = "Other",
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
            createdBy = testUser,
            name = "Test Project",
            tagline = "A test project",
            description = "Description",
            status = SubmissionStatus.draft
        )
    }

    // --- getProjectsByHackathon ---

    @Test
    fun `getProjectsByHackathon should return all projects`() {
        whenever(projectRepository.findByHackathonIdAndArchivedAtIsNull(testHackathonId)).thenReturn(listOf(testProject))

        val result = projectService.getProjectsByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Test Project")
        assertThat(result[0].hackathonId).isEqualTo(testHackathonId)
    }

    @Test
    fun `getProjectsByHackathon should exclude archived projects`() {
        whenever(projectRepository.findByHackathonIdAndArchivedAtIsNull(testHackathonId)).thenReturn(listOf(testProject))

        val result = projectService.getProjectsByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Test Project")
    }

    // --- getSubmittedProjectsByHackathon ---

    @Test
    fun `getSubmittedProjectsByHackathon should return only submitted projects`() {
        val submittedProject = Project(
            id = UUID.randomUUID(),
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )

        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(submittedProject))

        val result = projectService.getSubmittedProjectsByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].status).isEqualTo(SubmissionStatus.submitted)
    }

    @Test
    fun `getSubmittedProjectsByHackathon should exclude archived projects`() {
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(emptyList())

        val result = projectService.getSubmittedProjectsByHackathon(testHackathonId)

        assertThat(result).isEmpty()
    }

    // --- getProjectById ---

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
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `getProjectById should throw exception when project is archived`() {
        val archivedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Archived Project",
            archivedAt = OffsetDateTime.now()
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(archivedProject))

        assertThatThrownBy { projectService.getProjectById(testProjectId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    // --- getProjectByTeam ---

    @Test
    fun `getProjectByTeam should return project when exists`() {
        whenever(projectRepository.findByTeamIdAndArchivedAtIsNull(testTeamId)).thenReturn(testProject)

        val result = projectService.getProjectByTeam(testTeamId)

        assertThat(result).isNotNull
        assertThat(result!!.teamId).isEqualTo(testTeamId)
    }

    @Test
    fun `getProjectByTeam should return null when no project exists`() {
        whenever(projectRepository.findByTeamIdAndArchivedAtIsNull(testTeamId)).thenReturn(null)

        val result = projectService.getProjectByTeam(testTeamId)

        assertThat(result).isNull()
    }

    @Test
    fun `getProjectByTeam should return null when project is archived`() {
        whenever(projectRepository.findByTeamIdAndArchivedAtIsNull(testTeamId)).thenReturn(null)

        val result = projectService.getProjectByTeam(testTeamId)

        assertThat(result).isNull()
    }

    // --- createProject with team ---

    @Test
    fun `createProject with team should create project successfully`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project",
            tagline = "A new project",
            description = "Project description",
            technologies = listOf("Kotlin", "Spring Boot")
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(testTeamId, testHackathonId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { invocation ->
            val project = invocation.arguments[0] as Project
            Project(
                id = UUID.randomUUID(),
                team = project.team,
                hackathon = project.hackathon,
                createdBy = project.createdBy,
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
        assertThat(result.createdById).isEqualTo(testUserId)

        verify(projectRepository).save(any<Project>())
    }

    @Test
    fun `createProject with team should set createdBy to requesting user`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(testTeamId, testHackathonId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { invocation ->
            val project = invocation.arguments[0] as Project
            Project(
                id = UUID.randomUUID(),
                team = project.team,
                hackathon = project.hackathon,
                createdBy = project.createdBy,
                name = project.name
            )
        }

        val result = projectService.createProject(request, testUserId)

        assertThat(result.createdById).isEqualTo(testUserId)
    }

    @Test
    fun `createProject should throw exception when team not found`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Team not found")
    }

    @Test
    fun `createProject should throw exception when not a team member`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(false)

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be a team member to create a project")
    }

    @Test
    fun `createProject should throw exception when project already exists`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(testTeamId, testHackathonId)).thenReturn(true)

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ConflictException::class.java)
            .hasMessage("Team already has a project for this hackathon")
    }

    @Test
    fun `createProject should allow creation when previous project is archived`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project After Archive"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(testTeamId, testHackathonId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { invocation ->
            val project = invocation.arguments[0] as Project
            Project(
                id = UUID.randomUUID(),
                team = project.team,
                hackathon = project.hackathon,
                createdBy = project.createdBy,
                name = project.name
            )
        }

        val result = projectService.createProject(request, testUserId)

        assertThat(result.name).isEqualTo("New Project After Archive")
        verify(projectRepository).save(any<Project>())
    }

    @Test
    fun `createProject with team should throw when hackathonId does not match team hackathon`() {
        val mismatchedHackathonId = UUID.randomUUID()
        val request = CreateProjectRequest(
            teamId = testTeamId,
            hackathonId = mismatchedHackathonId,
            name = "New Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Hackathon ID does not match the team's hackathon")
    }

    // --- createProject without team (independent) ---

    @Test
    fun `createProject without team should create independent project`() {
        val request = CreateProjectRequest(
            hackathonId = testHackathonId,
            name = "Independent Project",
            tagline = "Solo work",
            description = "A project without a team"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserRegistered(testHackathonId, testUserId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { invocation ->
            val project = invocation.arguments[0] as Project
            Project(
                id = UUID.randomUUID(),
                team = project.team,
                hackathon = project.hackathon,
                createdBy = project.createdBy,
                name = project.name,
                tagline = project.tagline,
                description = project.description
            )
        }

        val result = projectService.createProject(request, testUserId)

        assertThat(result.name).isEqualTo("Independent Project")
        assertThat(result.teamId).isNull()
        assertThat(result.teamName).isNull()
        assertThat(result.createdById).isEqualTo(testUserId)
        verify(projectRepository).save(any<Project>())
    }

    @Test
    fun `createProject without team should throw when hackathonId missing`() {
        val request = CreateProjectRequest(
            name = "No Team No Hackathon"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Hackathon ID is required when creating a project without a team")
    }

    @Test
    fun `createProject without team should throw when hackathon not found`() {
        val request = CreateProjectRequest(
            hackathonId = testHackathonId,
            name = "No Hackathon"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `createProject without team should throw when hackathon archived`() {
        val archivedHackathon = Hackathon(
            id = testHackathonId,
            name = "Archived Hackathon",
            slug = "archived-hackathon",
            status = HackathonStatus.completed,
            startsAt = OffsetDateTime.now().minusDays(10),
            endsAt = OffsetDateTime.now().minusDays(5),
            createdBy = testUser,
            archived = true
        )
        val request = CreateProjectRequest(
            hackathonId = testHackathonId,
            name = "Late Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(archivedHackathon))

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Cannot create a project in an archived hackathon")
    }

    @Test
    fun `createProject without team should throw when user not registered in hackathon`() {
        val request = CreateProjectRequest(
            hackathonId = testHackathonId,
            name = "Unregistered Project"
        )

        whenever(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser))
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserRegistered(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { projectService.createProject(request, testUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be registered in the hackathon to create a project")
    }

    // --- updateProject ---

    @Test
    fun `updateProject should update project fields when user is team member`() {
        val request = UpdateProjectRequest(
            name = "Updated Project",
            tagline = "Updated tagline",
            description = "Updated description",
            demoUrl = "https://demo.example.com",
            videoUrl = "https://video.example.com",
            repositoryUrl = "https://github.com/example",
            technologies = listOf("Kotlin", "React")
        )

        // Use otherUser who is a team member but not the creator
        val projectByOther = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = otherUser,
            name = "Test Project",
            tagline = "A test project",
            description = "Description",
            status = SubmissionStatus.draft
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(projectByOther))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.updateProject(testProjectId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated Project")
        assertThat(result.tagline).isEqualTo("Updated tagline")
        assertThat(result.description).isEqualTo("Updated description")
        assertThat(result.demoUrl).isEqualTo("https://demo.example.com")
    }

    @Test
    fun `updateProject should allow project creator to update`() {
        val request = UpdateProjectRequest(name = "Updated by Creator")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.updateProject(testProjectId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated by Creator")
    }

    @Test
    fun `updateProject should allow creator of independent project to update`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project",
            status = SubmissionStatus.draft
        )
        val request = UpdateProjectRequest(name = "Updated Independent")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.updateProject(testProjectId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated Independent")
    }

    @Test
    fun `updateProject should throw exception when not found`() {
        val request = UpdateProjectRequest(name = "Updated")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.updateProject(testProjectId, request, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `updateProject should throw exception when not creator or team member`() {
        val request = UpdateProjectRequest(name = "Updated")
        val unauthorizedUserId = UUID.randomUUID()

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, unauthorizedUserId)).thenReturn(false)

        assertThatThrownBy { projectService.updateProject(testProjectId, request, unauthorizedUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be the project creator or a team member to update the project")
    }

    @Test
    fun `updateProject should throw exception when project is submitted`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )
        val request = UpdateProjectRequest(name = "Updated")

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))

        assertThatThrownBy { projectService.updateProject(testProjectId, request, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Cannot update a submitted project")
    }

    // --- submitProject ---

    @Test
    fun `submitProject should submit project successfully as team member`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.submitProject(testProjectId, testUserId)

        assertThat(result.status).isEqualTo(SubmissionStatus.submitted)
        assertThat(result.submittedAt).isNotNull()
    }

    @Test
    fun `submitProject should allow creator of independent project to submit`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project",
            status = SubmissionStatus.draft
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.submitProject(testProjectId, testUserId)

        assertThat(result.status).isEqualTo(SubmissionStatus.submitted)
    }

    @Test
    fun `submitProject should throw exception when not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.submitProject(testProjectId, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `submitProject should throw exception when not creator or team member`() {
        val unauthorizedUserId = UUID.randomUUID()

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, unauthorizedUserId)).thenReturn(false)

        assertThatThrownBy { projectService.submitProject(testProjectId, unauthorizedUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be the project creator or a team member to submit the project")
    }

    @Test
    fun `submitProject should throw exception when already submitted`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))

        assertThatThrownBy { projectService.submitProject(testProjectId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Project already submitted")
    }

    // --- unsubmitProject ---

    @Test
    fun `unsubmitProject should unsubmit project successfully`() {
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Submitted Project",
            status = SubmissionStatus.submitted,
            submittedAt = OffsetDateTime.now()
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.unsubmitProject(testProjectId, testUserId)

        assertThat(result.status).isEqualTo(SubmissionStatus.draft)
        assertThat(result.submittedAt).isNull()
    }

    @Test
    fun `unsubmitProject should allow creator of independent project to unsubmit`() {
        val independentSubmittedProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Submitted",
            status = SubmissionStatus.submitted,
            submittedAt = OffsetDateTime.now()
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentSubmittedProject))
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.unsubmitProject(testProjectId, testUserId)

        assertThat(result.status).isEqualTo(SubmissionStatus.draft)
    }

    @Test
    fun `unsubmitProject should throw exception when not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.unsubmitProject(testProjectId, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `unsubmitProject should throw exception when not creator or team member`() {
        val unauthorizedUserId = UUID.randomUUID()
        val submittedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Submitted Project",
            status = SubmissionStatus.submitted
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(submittedProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, unauthorizedUserId)).thenReturn(false)

        assertThatThrownBy { projectService.unsubmitProject(testProjectId, unauthorizedUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be the project creator or a team member to unsubmit the project")
    }

    @Test
    fun `unsubmitProject should throw exception when not submitted`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))

        assertThatThrownBy { projectService.unsubmitProject(testProjectId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Project is not submitted")
    }

    // --- archiveProject ---

    @Test
    fun `archiveProject should archive project successfully as team member`() {
        // Use a user who is a team member but not the creator
        val teamMemberId = UUID.randomUUID()
        val projectByOther = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = otherUser,
            name = "Test Project",
            status = SubmissionStatus.draft
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(projectByOther))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, teamMemberId)).thenReturn(true)
        whenever(hackathonService.isUserOrganizer(testHackathonId, teamMemberId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        projectService.archiveProject(testProjectId, teamMemberId)

        assertThat(projectByOther.archivedAt).isNotNull()
        verify(projectRepository).save(projectByOther)
    }

    @Test
    fun `archiveProject should allow project creator to archive`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        projectService.archiveProject(testProjectId, testUserId)

        assertThat(testProject.archivedAt).isNotNull()
    }

    @Test
    fun `archiveProject should allow creator of independent project to archive`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project",
            status = SubmissionStatus.draft
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        projectService.archiveProject(testProjectId, testUserId)

        assertThat(independentProject.archivedAt).isNotNull()
    }

    @Test
    fun `archiveProject should throw exception when not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.archiveProject(testProjectId, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `archiveProject should throw exception when not creator, team member, or organizer`() {
        val unauthorizedUserId = UUID.randomUUID()

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, unauthorizedUserId)).thenReturn(false)
        whenever(hackathonService.isUserOrganizer(testHackathonId, unauthorizedUserId)).thenReturn(false)

        assertThatThrownBy { projectService.archiveProject(testProjectId, unauthorizedUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be the project creator, a team member, or hackathon organizer to archive the project")
    }

    @Test
    fun `archiveProject should throw exception when already archived`() {
        val archivedProject = Project(
            id = testProjectId,
            team = testTeam,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Archived Project",
            archivedAt = OffsetDateTime.now()
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(archivedProject))

        assertThatThrownBy { projectService.archiveProject(testProjectId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Project is already archived")
    }

    @Test
    fun `archiveProject should allow organizer to archive project`() {
        val organizerId = UUID.randomUUID()

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, organizerId)).thenReturn(false)
        whenever(hackathonService.isUserOrganizer(testHackathonId, organizerId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        projectService.archiveProject(testProjectId, organizerId)

        assertThat(testProject.archivedAt).isNotNull()
        verify(projectRepository).save(testProject)
    }

    // --- linkProjectToTeam ---

    @Test
    fun `linkProjectToTeam should link unlinked project to team`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project",
            status = SubmissionStatus.draft
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(testTeamId, testHackathonId)).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.linkProjectToTeam(testProjectId, testTeamId, testUserId)

        assertThat(result.teamId).isEqualTo(testTeamId)
        assertThat(result.teamName).isEqualTo("Test Team")
        verify(projectRepository).save(independentProject)
    }

    @Test
    fun `linkProjectToTeam should throw when project not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.linkProjectToTeam(testProjectId, testTeamId, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `linkProjectToTeam should throw when team not found`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project"
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.linkProjectToTeam(testProjectId, testTeamId, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Team not found")
    }

    @Test
    fun `linkProjectToTeam should throw when user is not team member`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project"
        )
        val unauthorizedUserId = UUID.randomUUID()

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, unauthorizedUserId)).thenReturn(false)

        assertThatThrownBy { projectService.linkProjectToTeam(testProjectId, testTeamId, unauthorizedUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be a member of the target team to link a project")
    }

    @Test
    fun `linkProjectToTeam should throw when project and team are in different hackathons`() {
        val otherHackathon = Hackathon(
            id = UUID.randomUUID(),
            name = "Other Hackathon",
            slug = "other-hackathon",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now().minusDays(1),
            endsAt = OffsetDateTime.now().plusDays(1),
            createdBy = testUser
        )
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = otherHackathon,
            createdBy = testUser,
            name = "Project in Other Hackathon"
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)

        assertThatThrownBy { projectService.linkProjectToTeam(testProjectId, testTeamId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Project and team must be in the same hackathon")
    }

    @Test
    fun `linkProjectToTeam should throw when project is already linked to a team`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)

        assertThatThrownBy { projectService.linkProjectToTeam(testProjectId, testTeamId, testUserId) }
            .isInstanceOf(ConflictException::class.java)
            .hasMessage("Project is already linked to a team")
    }

    @Test
    fun `linkProjectToTeam should throw when team already has an active project`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project"
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))
        whenever(teamRepository.findById(testTeamId)).thenReturn(Optional.of(testTeam))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(testTeamId, testHackathonId)).thenReturn(true)

        assertThatThrownBy { projectService.linkProjectToTeam(testProjectId, testTeamId, testUserId) }
            .isInstanceOf(ConflictException::class.java)
            .hasMessage("Team already has an active project")
    }

    // --- unlinkProjectFromTeam ---

    @Test
    fun `unlinkProjectFromTeam should unlink project from team`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, testUserId)).thenReturn(true)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] }

        val result = projectService.unlinkProjectFromTeam(testProjectId, testUserId)

        assertThat(result.teamId).isNull()
        assertThat(result.teamName).isNull()
        verify(projectRepository).save(testProject)
    }

    @Test
    fun `unlinkProjectFromTeam should throw when project not found`() {
        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.empty())

        assertThatThrownBy { projectService.unlinkProjectFromTeam(testProjectId, testUserId) }
            .isInstanceOf(NotFoundException::class.java)
            .hasMessage("Project not found")
    }

    @Test
    fun `unlinkProjectFromTeam should throw when project is not linked to a team`() {
        val independentProject = Project(
            id = testProjectId,
            team = null,
            hackathon = testHackathon,
            createdBy = testUser,
            name = "Independent Project"
        )

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(independentProject))

        assertThatThrownBy { projectService.unlinkProjectFromTeam(testProjectId, testUserId) }
            .isInstanceOf(ValidationException::class.java)
            .hasMessage("Project is not linked to a team")
    }

    @Test
    fun `unlinkProjectFromTeam should throw when user is not team member`() {
        val unauthorizedUserId = UUID.randomUUID()

        whenever(projectRepository.findById(testProjectId)).thenReturn(Optional.of(testProject))
        whenever(teamMemberRepository.existsByTeamIdAndUserId(testTeamId, unauthorizedUserId)).thenReturn(false)

        assertThatThrownBy { projectService.unlinkProjectFromTeam(testProjectId, unauthorizedUserId) }
            .isInstanceOf(UnauthorizedException::class.java)
            .hasMessage("Must be a member of the linked team to unlink a project")
    }
}
