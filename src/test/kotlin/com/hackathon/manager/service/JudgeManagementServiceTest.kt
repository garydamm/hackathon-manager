package com.hackathon.manager.service

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.JudgeAssignment
import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.entity.enums.UserRole
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.HackathonUserRepository
import com.hackathon.manager.repository.JudgeAssignmentRepository
import com.hackathon.manager.repository.ProjectRepository
import com.hackathon.manager.repository.UserRepository
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
class JudgeManagementServiceTest {

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var hackathonService: HackathonService

    @Mock
    lateinit var hackathonUserRepository: HackathonUserRepository

    @Mock
    lateinit var userRepository: UserRepository

    @Mock
    lateinit var projectRepository: ProjectRepository

    @Mock
    lateinit var judgeAssignmentRepository: JudgeAssignmentRepository

    @InjectMocks
    lateinit var judgeManagementService: JudgeManagementService

    private lateinit var testUser: User
    private lateinit var testJudgeUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testTeam: Team
    private lateinit var testProject: Project
    private val testUserId = UUID.randomUUID()
    private val testJudgeUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testTeamId = UUID.randomUUID()
    private val testProjectId = UUID.randomUUID()

    @BeforeEach
    fun setUp() {
        testUser = User(
            id = testUserId,
            email = "organizer@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "Organizer"
        )

        testJudgeUser = User(
            id = testJudgeUserId,
            email = "judge@example.com",
            passwordHash = "hashedpassword",
            firstName = "Test",
            lastName = "Judge",
            displayName = "Judge Display"
        )

        testHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            description = "A test hackathon",
            status = HackathonStatus.in_progress,
            startsAt = OffsetDateTime.now().plusDays(7),
            endsAt = OffsetDateTime.now().plusDays(9),
            createdBy = testUser
        )

        testTeam = Team(
            id = testTeamId,
            hackathon = testHackathon,
            name = "Test Team",
            createdBy = testUser
        )

        testProject = Project(
            id = testProjectId,
            hackathon = testHackathon,
            team = testTeam,
            name = "Test Project",
            status = SubmissionStatus.submitted
        )
    }

    @Test
    fun `getJudgesByHackathon should return judges with scoring progress`() {
        val judgeHackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.judge
        )

        val completedAssignment = JudgeAssignment(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            judge = testJudgeUser,
            project = testProject,
            completedAt = OffsetDateTime.now()
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndRole(testHackathonId, UserRole.judge))
            .thenReturn(listOf(judgeHackathonUser))
        whenever(hackathonUserRepository.findByHackathonIdAndRole(testHackathonId, UserRole.organizer))
            .thenReturn(emptyList())
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByJudgeIdAndHackathonId(testJudgeUserId, testHackathonId))
            .thenReturn(listOf(completedAssignment))

        val result = judgeManagementService.getJudgesByHackathon(testHackathonId, testUserId)

        assertThat(result).hasSize(1)
        assertThat(result[0].userId).isEqualTo(testJudgeUserId)
        assertThat(result[0].email).isEqualTo("judge@example.com")
        assertThat(result[0].projectsScored).isEqualTo(1)
        assertThat(result[0].totalProjects).isEqualTo(1)
    }

    @Test
    fun `getJudgesByHackathon should throw forbidden when user is not organizer`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgeManagementService.getJudgesByHackathon(testHackathonId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can view judges")
    }

    @Test
    fun `addJudge should create new HackathonUser with judge role`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testJudgeUserId)).thenReturn(Optional.of(testJudgeUser))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId)).thenReturn(null)
        whenever(hackathonUserRepository.save(any<HackathonUser>())).thenAnswer { it.arguments[0] }
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))

        val result = judgeManagementService.addJudge(testHackathonId, testJudgeUserId, testUserId)

        assertThat(result.userId).isEqualTo(testJudgeUserId)
        assertThat(result.email).isEqualTo("judge@example.com")
        assertThat(result.totalProjects).isEqualTo(1)
        assertThat(result.projectsScored).isEqualTo(0)
        verify(hackathonUserRepository).save(argThat { role == UserRole.judge })
    }

    @Test
    fun `addJudge should update existing HackathonUser role to judge`() {
        val existingParticipant = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.participant
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testJudgeUserId)).thenReturn(Optional.of(testJudgeUser))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(existingParticipant)
        whenever(hackathonUserRepository.save(any<HackathonUser>())).thenAnswer { it.arguments[0] }
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(emptyList())

        val result = judgeManagementService.addJudge(testHackathonId, testJudgeUserId, testUserId)

        assertThat(result.userId).isEqualTo(testJudgeUserId)
        verify(hackathonUserRepository).save(argThat { role == UserRole.judge })
    }

    @Test
    fun `addJudge should throw conflict when user is already a judge`() {
        val existingJudge = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.judge
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testJudgeUserId)).thenReturn(Optional.of(testJudgeUser))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(existingJudge)

        assertThatThrownBy { judgeManagementService.addJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User is already a judge for this hackathon")
    }

    @Test
    fun `addJudge should throw forbidden when user is not organizer`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgeManagementService.addJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can add judges")
    }

    @Test
    fun `addJudge should throw not found when user does not exist`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testJudgeUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { judgeManagementService.addJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User not found")
    }

    @Test
    fun `removeJudge should delete HackathonUser`() {
        val judgeHackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.judge
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(judgeHackathonUser)

        judgeManagementService.removeJudge(testHackathonId, testJudgeUserId, testUserId)

        verify(hackathonUserRepository).delete(judgeHackathonUser)
    }

    @Test
    fun `removeJudge should throw forbidden when user is not organizer`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgeManagementService.removeJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can remove judges")
    }

    @Test
    fun `removeJudge should throw not found when user not associated with hackathon`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(null)

        assertThatThrownBy { judgeManagementService.removeJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User is not associated with this hackathon")
    }

    @Test
    fun `removeJudge should throw bad request when user is not a judge`() {
        val participantHackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.participant
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(participantHackathonUser)

        assertThatThrownBy { judgeManagementService.removeJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User is not a judge for this hackathon")
    }
}
