package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.SubmitScoreRequest
import com.hackathon.manager.dto.SubmitScoresRequest
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.JudgeAssignment
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.Score
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
import com.hackathon.manager.repository.JudgingCriteriaRepository
import com.hackathon.manager.repository.ProjectRepository
import com.hackathon.manager.repository.ScoreRepository
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
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class JudgingServiceTest {

    @Mock
    lateinit var judgingCriteriaRepository: JudgingCriteriaRepository

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

    @Mock
    lateinit var scoreRepository: ScoreRepository

    @InjectMocks
    lateinit var judgingService: JudgingService

    private lateinit var testUser: User
    private lateinit var testJudgeUser: User
    private lateinit var testHackathon: Hackathon
    private lateinit var testCriteria: JudgingCriteria
    private lateinit var testTeam: Team
    private lateinit var testProject: Project
    private lateinit var testAssignment: JudgeAssignment
    private val testUserId = UUID.randomUUID()
    private val testJudgeUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testCriteriaId = UUID.randomUUID()
    private val testTeamId = UUID.randomUUID()
    private val testProjectId = UUID.randomUUID()
    private val testAssignmentId = UUID.randomUUID()

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

        testCriteria = JudgingCriteria(
            id = testCriteriaId,
            hackathon = testHackathon,
            name = "Innovation",
            description = "How innovative is the project",
            maxScore = 10,
            weight = BigDecimal("1.00"),
            displayOrder = 1
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

        testAssignment = JudgeAssignment(
            id = testAssignmentId,
            hackathon = testHackathon,
            judge = testJudgeUser,
            project = testProject
        )
    }

    // Criteria management tests

    @Test
    fun `getCriteriaByHackathon should return criteria ordered by displayOrder`() {
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))

        val result = judgingService.getCriteriaByHackathon(testHackathonId)

        assertThat(result).hasSize(1)
        assertThat(result[0].name).isEqualTo("Innovation")
        assertThat(result[0].hackathonId).isEqualTo(testHackathonId)
    }

    @Test
    fun `createCriteria should create criteria when user is organizer`() {
        val request = CreateJudgingCriteriaRequest(
            name = "Technical Excellence",
            description = "Quality of code",
            maxScore = 10,
            weight = BigDecimal("1.50"),
            displayOrder = 2
        )

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(judgingCriteriaRepository.save(any<JudgingCriteria>())).thenAnswer { invocation ->
            val criteria = invocation.arguments[0] as JudgingCriteria
            JudgingCriteria(
                id = UUID.randomUUID(),
                hackathon = criteria.hackathon,
                name = criteria.name,
                description = criteria.description,
                maxScore = criteria.maxScore,
                weight = criteria.weight,
                displayOrder = criteria.displayOrder
            )
        }

        val result = judgingService.createCriteria(testHackathonId, request, testUserId)

        assertThat(result.name).isEqualTo("Technical Excellence")
        assertThat(result.weight).isEqualTo(BigDecimal("1.50"))
        verify(judgingCriteriaRepository).save(any<JudgingCriteria>())
    }

    @Test
    fun `createCriteria should throw forbidden when user is not organizer`() {
        val request = CreateJudgingCriteriaRequest(name = "Test")

        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgingService.createCriteria(testHackathonId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can create judging criteria")
    }

    @Test
    fun `updateCriteria should update criteria when user is organizer`() {
        val request = UpdateJudgingCriteriaRequest(
            name = "Updated Name",
            maxScore = 20
        )

        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.of(testCriteria))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.save(any<JudgingCriteria>())).thenAnswer { it.arguments[0] }

        val result = judgingService.updateCriteria(testCriteriaId, request, testUserId)

        assertThat(result.name).isEqualTo("Updated Name")
        assertThat(result.maxScore).isEqualTo(20)
    }

    @Test
    fun `updateCriteria should throw not found when criteria does not exist`() {
        val request = UpdateJudgingCriteriaRequest(name = "Test")

        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.empty())

        assertThatThrownBy { judgingService.updateCriteria(testCriteriaId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Judging criteria not found")
    }

    @Test
    fun `deleteCriteria should delete criteria when user is organizer`() {
        whenever(judgingCriteriaRepository.findById(testCriteriaId)).thenReturn(Optional.of(testCriteria))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)

        judgingService.deleteCriteria(testCriteriaId, testUserId)

        verify(judgingCriteriaRepository).delete(testCriteria)
    }

    // Judge management tests

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
        whenever(projectRepository.findByHackathonIdAndStatus(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByJudgeIdAndHackathonId(testJudgeUserId, testHackathonId))
            .thenReturn(listOf(completedAssignment))

        val result = judgingService.getJudgesByHackathon(testHackathonId, testUserId)

        assertThat(result).hasSize(1)
        assertThat(result[0].userId).isEqualTo(testJudgeUserId)
        assertThat(result[0].email).isEqualTo("judge@example.com")
        assertThat(result[0].projectsScored).isEqualTo(1)
        assertThat(result[0].totalProjects).isEqualTo(1)
    }

    @Test
    fun `getJudgesByHackathon should throw forbidden when user is not organizer`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgingService.getJudgesByHackathon(testHackathonId, testUserId) }
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
        whenever(projectRepository.findByHackathonIdAndStatus(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))

        val result = judgingService.addJudge(testHackathonId, testJudgeUserId, testUserId)

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
        whenever(projectRepository.findByHackathonIdAndStatus(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(emptyList())

        val result = judgingService.addJudge(testHackathonId, testJudgeUserId, testUserId)

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

        assertThatThrownBy { judgingService.addJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User is already a judge for this hackathon")
    }

    @Test
    fun `addJudge should throw forbidden when user is not organizer`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgingService.addJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can add judges")
    }

    @Test
    fun `addJudge should throw not found when user does not exist`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(userRepository.findById(testJudgeUserId)).thenReturn(Optional.empty())

        assertThatThrownBy { judgingService.addJudge(testHackathonId, testJudgeUserId, testUserId) }
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

        judgingService.removeJudge(testHackathonId, testJudgeUserId, testUserId)

        verify(hackathonUserRepository).delete(judgeHackathonUser)
    }

    @Test
    fun `removeJudge should throw forbidden when user is not organizer`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(false)

        assertThatThrownBy { judgingService.removeJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Only organizers can remove judges")
    }

    @Test
    fun `removeJudge should throw not found when user not associated with hackathon`() {
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(null)

        assertThatThrownBy { judgingService.removeJudge(testHackathonId, testJudgeUserId, testUserId) }
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

        assertThatThrownBy { judgingService.removeJudge(testHackathonId, testJudgeUserId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User is not a judge for this hackathon")
    }

    // Scoring tests

    @Test
    fun `getAssignmentsByJudge should return assignments for judge`() {
        val judgeHackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.judge
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(judgeHackathonUser)
        whenever(projectRepository.findByHackathonIdAndStatus(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByJudgeIdAndHackathonId(testJudgeUserId, testHackathonId))
            .thenReturn(listOf(testAssignment))

        val result = judgingService.getAssignmentsByJudge(testHackathonId, testJudgeUserId)

        assertThat(result).hasSize(1)
        assertThat(result[0].projectId).isEqualTo(testProjectId)
        assertThat(result[0].judgeId).isEqualTo(testJudgeUserId)
    }

    @Test
    fun `getAssignmentsByJudge should auto-create assignments for new projects`() {
        val judgeHackathonUser = HackathonUser(
            hackathon = testHackathon,
            user = testJudgeUser,
            role = UserRole.judge
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testJudgeUserId))
            .thenReturn(judgeHackathonUser)
        whenever(projectRepository.findByHackathonIdAndStatus(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByJudgeIdAndHackathonId(testJudgeUserId, testHackathonId))
            .thenReturn(emptyList())
        whenever(userRepository.findById(testJudgeUserId)).thenReturn(Optional.of(testJudgeUser))
        whenever(judgeAssignmentRepository.save(any<JudgeAssignment>())).thenAnswer { invocation ->
            val assignment = invocation.arguments[0] as JudgeAssignment
            JudgeAssignment(
                id = UUID.randomUUID(),
                hackathon = assignment.hackathon,
                judge = assignment.judge,
                project = assignment.project
            )
        }

        val result = judgingService.getAssignmentsByJudge(testHackathonId, testJudgeUserId)

        assertThat(result).hasSize(1)
        verify(judgeAssignmentRepository).save(any<JudgeAssignment>())
    }

    @Test
    fun `getAssignmentsByJudge should throw forbidden when user is not a judge`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonUserRepository.findByHackathonIdAndUserId(testHackathonId, testUserId))
            .thenReturn(null)

        assertThatThrownBy { judgingService.getAssignmentsByJudge(testHackathonId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("User is not a judge for this hackathon")
    }

    @Test
    fun `getAssignment should return assignment with scores`() {
        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))

        val result = judgingService.getAssignment(testAssignmentId, testJudgeUserId)

        assertThat(result.id).isEqualTo(testAssignmentId)
        assertThat(result.projectId).isEqualTo(testProjectId)
        assertThat(result.scores).isNotNull()
    }

    @Test
    fun `getAssignment should throw forbidden when user is not the judge`() {
        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))

        assertThatThrownBy { judgingService.getAssignment(testAssignmentId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Not authorized to view this assignment")
    }

    @Test
    fun `getAssignment should throw not found when assignment does not exist`() {
        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.empty())

        assertThatThrownBy { judgingService.getAssignment(testAssignmentId, testJudgeUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Assignment not found")
    }

    @Test
    fun `submitScores should create new scores`() {
        val request = SubmitScoresRequest(
            scores = listOf(
                SubmitScoreRequest(
                    criteriaId = testCriteriaId,
                    score = 8,
                    feedback = "Great work"
                )
            )
        )

        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))
        whenever(scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignmentId, testCriteriaId))
            .thenReturn(null)
        whenever(scoreRepository.save(any<Score>())).thenAnswer { invocation ->
            val score = invocation.arguments[0] as Score
            Score(
                id = UUID.randomUUID(),
                judgeAssignment = score.judgeAssignment,
                criteria = score.criteria,
                score = score.score,
                feedback = score.feedback
            )
        }
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignmentId))
            .thenReturn(listOf(
                Score(
                    id = UUID.randomUUID(),
                    judgeAssignment = testAssignment,
                    criteria = testCriteria,
                    score = 8
                )
            ))
        whenever(judgeAssignmentRepository.save(any<JudgeAssignment>())).thenAnswer { it.arguments[0] }

        val result = judgingService.submitScores(testAssignmentId, request, testJudgeUserId)

        assertThat(result.id).isEqualTo(testAssignmentId)
        verify(scoreRepository).save(any<Score>())
    }

    @Test
    fun `submitScores should update existing scores`() {
        val existingScore = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 5,
            feedback = "Initial feedback"
        )

        val request = SubmitScoresRequest(
            scores = listOf(
                SubmitScoreRequest(
                    criteriaId = testCriteriaId,
                    score = 9,
                    feedback = "Updated feedback"
                )
            )
        )

        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))
        whenever(scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignmentId, testCriteriaId))
            .thenReturn(existingScore)
        whenever(scoreRepository.save(any<Score>())).thenAnswer { it.arguments[0] }
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignmentId))
            .thenReturn(listOf(existingScore))
        whenever(judgeAssignmentRepository.save(any<JudgeAssignment>())).thenAnswer { it.arguments[0] }

        judgingService.submitScores(testAssignmentId, request, testJudgeUserId)

        assertThat(existingScore.score).isEqualTo(9)
        assertThat(existingScore.feedback).isEqualTo("Updated feedback")
        verify(scoreRepository).save(existingScore)
    }

    @Test
    fun `submitScores should throw forbidden when user is not the judge`() {
        val request = SubmitScoresRequest(scores = emptyList())

        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))

        assertThatThrownBy { judgingService.submitScores(testAssignmentId, request, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Not authorized to submit scores for this assignment")
    }

    @Test
    fun `submitScores should throw bad request when score exceeds max`() {
        val request = SubmitScoresRequest(
            scores = listOf(
                SubmitScoreRequest(
                    criteriaId = testCriteriaId,
                    score = 15, // maxScore is 10
                    feedback = null
                )
            )
        )

        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))

        assertThatThrownBy { judgingService.submitScores(testAssignmentId, request, testJudgeUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Score for 'Innovation' must be between 0 and 10")
    }

    @Test
    fun `submitScores should throw bad request when criteria not found`() {
        val unknownCriteriaId = UUID.randomUUID()
        val request = SubmitScoresRequest(
            scores = listOf(
                SubmitScoreRequest(
                    criteriaId = unknownCriteriaId,
                    score = 5,
                    feedback = null
                )
            )
        )

        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))

        assertThatThrownBy { judgingService.submitScores(testAssignmentId, request, testJudgeUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessageContaining("Criteria not found")
    }

    @Test
    fun `submitScores should mark assignment completed when all criteria scored`() {
        val request = SubmitScoresRequest(
            scores = listOf(
                SubmitScoreRequest(
                    criteriaId = testCriteriaId,
                    score = 8,
                    feedback = null
                )
            )
        )

        whenever(judgeAssignmentRepository.findById(testAssignmentId)).thenReturn(Optional.of(testAssignment))
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))
        whenever(scoreRepository.findByJudgeAssignmentIdAndCriteriaId(testAssignmentId, testCriteriaId))
            .thenReturn(null)
        whenever(scoreRepository.save(any<Score>())).thenAnswer { invocation ->
            val score = invocation.arguments[0] as Score
            Score(
                id = UUID.randomUUID(),
                judgeAssignment = score.judgeAssignment,
                criteria = score.criteria,
                score = score.score,
                feedback = score.feedback
            )
        }
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignmentId))
            .thenReturn(listOf(
                Score(
                    id = UUID.randomUUID(),
                    judgeAssignment = testAssignment,
                    criteria = testCriteria,
                    score = 8
                )
            ))
        whenever(judgeAssignmentRepository.save(any<JudgeAssignment>())).thenAnswer { it.arguments[0] }

        judgingService.submitScores(testAssignmentId, request, testJudgeUserId)

        assertThat(testAssignment.completedAt).isNotNull()
        verify(judgeAssignmentRepository).save(testAssignment)
    }
}
