package com.hackathon.manager.service

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.JudgeAssignment
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.Score
import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.Team
import com.hackathon.manager.entity.User
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.JudgeAssignmentRepository
import com.hackathon.manager.repository.JudgingCriteriaRepository
import com.hackathon.manager.repository.ProjectRepository
import com.hackathon.manager.repository.ScoreRepository
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
class LeaderboardServiceTest {

    @Mock
    lateinit var judgingCriteriaRepository: JudgingCriteriaRepository

    @Mock
    lateinit var hackathonRepository: HackathonRepository

    @Mock
    lateinit var hackathonService: HackathonService

    @Mock
    lateinit var projectRepository: ProjectRepository

    @Mock
    lateinit var judgeAssignmentRepository: JudgeAssignmentRepository

    @Mock
    lateinit var scoreRepository: ScoreRepository

    @InjectMocks
    lateinit var leaderboardService: LeaderboardService

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
            createdBy = testUser,
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

    @Test
    fun `getLeaderboard should return ranked projects for organizer`() {
        val testCriteria2 = JudgingCriteria(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            name = "Technical Excellence",
            description = "Quality of implementation",
            maxScore = 10,
            weight = BigDecimal("2.00"),
            displayOrder = 2
        )

        val score1 = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 8
        )

        val score2 = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment,
            criteria = testCriteria2,
            score = 9
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria, testCriteria2))
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByProjectId(testProjectId))
            .thenReturn(listOf(testAssignment))
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignmentId))
            .thenReturn(listOf(score1, score2))

        val result = leaderboardService.getLeaderboard(testHackathonId, testUserId)

        assertThat(result).hasSize(1)
        assertThat(result[0].rank).isEqualTo(1)
        assertThat(result[0].projectId).isEqualTo(testProjectId)
        assertThat(result[0].projectName).isEqualTo("Test Project")
        assertThat(result[0].teamId).isEqualTo(testTeamId)
        assertThat(result[0].teamName).isEqualTo("Test Team")
        assertThat(result[0].criteriaAverages).hasSize(2)
    }

    @Test
    fun `getLeaderboard should calculate weighted average correctly`() {
        // Create a scenario where we can verify weighted average calculation
        // Criteria 1: weight 1.0, score 10 -> contributes 10
        // Criteria 2: weight 2.0, score 5 -> contributes 10
        // Total: (10*1 + 5*2) / (1+2) = 20/3 = 6.67

        val testCriteria2 = JudgingCriteria(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            name = "Technical Excellence",
            maxScore = 10,
            weight = BigDecimal("2.00"),
            displayOrder = 2
        )

        val score1 = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 10
        )

        val score2 = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment,
            criteria = testCriteria2,
            score = 5
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria, testCriteria2))
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByProjectId(testProjectId))
            .thenReturn(listOf(testAssignment))
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignmentId))
            .thenReturn(listOf(score1, score2))

        val result = leaderboardService.getLeaderboard(testHackathonId, testUserId)

        assertThat(result).hasSize(1)
        // (10*1 + 5*2) / (1+2) = 20/3 ≈ 6.67
        assertThat(result[0].totalScore).isBetween(6.66, 6.68)
    }

    @Test
    fun `getLeaderboard should allow participant to view when hackathon is completed`() {
        val completedHackathon = Hackathon(
            id = testHackathonId,
            name = "Test Hackathon",
            slug = "test-hackathon",
            status = HackathonStatus.completed,
            startsAt = OffsetDateTime.now().minusDays(9),
            endsAt = OffsetDateTime.now().minusDays(7),
            createdBy = testUser
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(completedHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testJudgeUserId)).thenReturn(false)
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject))
        whenever(judgeAssignmentRepository.findByProjectId(testProjectId))
            .thenReturn(emptyList())

        val result = leaderboardService.getLeaderboard(testHackathonId, testJudgeUserId)

        assertThat(result).hasSize(1)
    }

    @Test
    fun `getLeaderboard should throw forbidden for participant when hackathon is not completed`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testJudgeUserId)).thenReturn(false)

        assertThatThrownBy { leaderboardService.getLeaderboard(testHackathonId, testJudgeUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Results are only available after the hackathon is completed")
    }

    @Test
    fun `getLeaderboard should throw not found when hackathon does not exist`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.empty())

        assertThatThrownBy { leaderboardService.getLeaderboard(testHackathonId, testUserId) }
            .isInstanceOf(ApiException::class.java)
            .hasMessage("Hackathon not found")
    }

    @Test
    fun `getLeaderboard should return empty list when no criteria exist`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(emptyList())

        val result = leaderboardService.getLeaderboard(testHackathonId, testUserId)

        assertThat(result).isEmpty()
    }

    @Test
    fun `getLeaderboard should return empty list when no submitted projects exist`() {
        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(emptyList())

        val result = leaderboardService.getLeaderboard(testHackathonId, testUserId)

        assertThat(result).isEmpty()
    }

    @Test
    fun `getLeaderboard should rank projects by total score descending`() {
        val testTeam2 = Team(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            name = "Test Team 2",
            createdBy = testUser
        )

        val testProject2 = Project(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            team = testTeam2,
            createdBy = testUser,
            name = "Test Project 2",
            status = SubmissionStatus.submitted
        )

        val testAssignment2 = JudgeAssignment(
            id = UUID.randomUUID(),
            hackathon = testHackathon,
            judge = testJudgeUser,
            project = testProject2
        )

        val score1 = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment,
            criteria = testCriteria,
            score = 5
        )

        val score2 = Score(
            id = UUID.randomUUID(),
            judgeAssignment = testAssignment2,
            criteria = testCriteria,
            score = 9
        )

        whenever(hackathonRepository.findById(testHackathonId)).thenReturn(Optional.of(testHackathon))
        whenever(hackathonService.isUserOrganizer(testHackathonId, testUserId)).thenReturn(true)
        whenever(judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(testHackathonId))
            .thenReturn(listOf(testCriteria))
        whenever(projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(testHackathonId, SubmissionStatus.submitted))
            .thenReturn(listOf(testProject, testProject2))
        whenever(judgeAssignmentRepository.findByProjectId(testProjectId))
            .thenReturn(listOf(testAssignment))
        whenever(judgeAssignmentRepository.findByProjectId(testProject2.id!!))
            .thenReturn(listOf(testAssignment2))
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignmentId))
            .thenReturn(listOf(score1))
        whenever(scoreRepository.findByJudgeAssignmentId(testAssignment2.id!!))
            .thenReturn(listOf(score2))

        val result = leaderboardService.getLeaderboard(testHackathonId, testUserId)

        assertThat(result).hasSize(2)
        // Project 2 should be ranked first with higher score
        assertThat(result[0].rank).isEqualTo(1)
        assertThat(result[0].projectName).isEqualTo("Test Project 2")
        assertThat(result[0].totalScore).isEqualTo(9.0)

        assertThat(result[1].rank).isEqualTo(2)
        assertThat(result[1].projectName).isEqualTo("Test Project")
        assertThat(result[1].totalScore).isEqualTo(5.0)
    }
}
