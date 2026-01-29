package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.*
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.JudgeManagementService
import com.hackathon.manager.service.JudgingCriteriaService
import com.hackathon.manager.service.JudgingService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.FilterType
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

@WebMvcTest(
    controllers = [JudgingController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class JudgingControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var judgingService: JudgingService

    @MockBean
    lateinit var judgingCriteriaService: JudgingCriteriaService

    @MockBean
    lateinit var judgeManagementService: JudgeManagementService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()
    private val testCriteriaId = UUID.randomUUID()
    private val testProjectId = UUID.randomUUID()
    private val testAssignmentId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    private fun createJudgingCriteriaResponse(
        id: UUID = testCriteriaId,
        hackathonId: UUID = testHackathonId
    ) = JudgingCriteriaResponse(
        id = id,
        hackathonId = hackathonId,
        name = "Innovation",
        description = "How innovative is the project?",
        maxScore = 10,
        weight = BigDecimal("1.00"),
        displayOrder = 1
    )

    private fun createJudgeInfoResponse(
        userId: UUID = testUserId
    ) = JudgeInfoResponse(
        userId = userId,
        email = "judge@example.com",
        firstName = "John",
        lastName = "Doe",
        displayName = "Judge John",
        projectsScored = 5,
        totalProjects = 10,
        isOrganizer = false
    )

    private fun createJudgeAssignmentResponse(
        id: UUID = testAssignmentId,
        hackathonId: UUID = testHackathonId,
        judgeId: UUID = testUserId,
        projectId: UUID = testProjectId
    ) = JudgeAssignmentResponse(
        id = id,
        hackathonId = hackathonId,
        judgeId = judgeId,
        projectId = projectId,
        projectName = "Test Project",
        assignedAt = OffsetDateTime.now(),
        completedAt = null,
        scores = null
    )

    private fun createLeaderboardEntryResponse(
        rank: Int = 1,
        projectId: UUID = testProjectId
    ) = LeaderboardEntryResponse(
        rank = rank,
        projectId = projectId,
        projectName = "Test Project",
        teamId = UUID.randomUUID(),
        teamName = "Test Team",
        totalScore = 85.5,
        criteriaAverages = listOf(
            CriteriaAverageResponse(
                criteriaId = testCriteriaId,
                criteriaName = "Innovation",
                averageScore = 8.5,
                maxScore = 10
            )
        )
    )

    @Test
    fun `getCriteriaByHackathon should return criteria list`() {
        val criteria = listOf(
            createJudgingCriteriaResponse(),
            createJudgingCriteriaResponse(id = UUID.randomUUID())
        )

        whenever(judgingCriteriaService.getCriteriaByHackathon(testHackathonId))
            .thenReturn(criteria)

        mockMvc.perform(
            get("/api/judging/hackathons/$testHackathonId/criteria")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(criteria[0].id.toString()))
            .andExpect(jsonPath("$[0].name").value("Innovation"))
    }

    @Test
    fun `createCriteria should create criteria for organizer`() {
        val request = CreateJudgingCriteriaRequest(
            name = "Technical Execution",
            description = "Quality of implementation",
            maxScore = 10,
            weight = BigDecimal("1.5"),
            displayOrder = 2
        )
        val response = createJudgingCriteriaResponse()

        whenever(judgingCriteriaService.createCriteria(eq(testHackathonId), any(), eq(testUserId)))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/judging/hackathons/$testHackathonId/criteria")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value(testCriteriaId.toString()))
            .andExpect(jsonPath("$.name").value("Innovation"))
    }

    @Test
    fun `createCriteria should return 403 when non-organizer attempts creation`() {
        val request = CreateJudgingCriteriaRequest(
            name = "Technical Execution",
            maxScore = 10
        )

        whenever(judgingCriteriaService.createCriteria(eq(testHackathonId), any(), eq(testUserId)))
            .thenThrow(ApiException("Only organizers can create criteria", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            post("/api/judging/hackathons/$testHackathonId/criteria")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateCriteria should update criteria for organizer`() {
        val request = UpdateJudgingCriteriaRequest(
            name = "Updated Innovation",
            description = "Updated description"
        )
        val response = createJudgingCriteriaResponse().copy(
            name = "Updated Innovation",
            description = "Updated description"
        )

        whenever(judgingCriteriaService.updateCriteria(eq(testCriteriaId), any(), eq(testUserId)))
            .thenReturn(response)

        mockMvc.perform(
            put("/api/judging/criteria/$testCriteriaId")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Innovation"))
            .andExpect(jsonPath("$.description").value("Updated description"))
    }

    @Test
    fun `updateCriteria should return 403 when non-organizer attempts update`() {
        val request = UpdateJudgingCriteriaRequest(
            name = "Updated Innovation"
        )

        whenever(judgingCriteriaService.updateCriteria(eq(testCriteriaId), any(), eq(testUserId)))
            .thenThrow(ApiException("Only organizers can update criteria", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            put("/api/judging/criteria/$testCriteriaId")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `deleteCriteria should delete criteria for organizer`() {
        mockMvc.perform(
            delete("/api/judging/criteria/$testCriteriaId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `deleteCriteria should return 403 when non-organizer attempts deletion`() {
        whenever(judgingCriteriaService.deleteCriteria(testCriteriaId, testUserId))
            .thenThrow(ApiException("Only organizers can delete criteria", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            delete("/api/judging/criteria/$testCriteriaId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `getJudges should return judges list`() {
        val judges = listOf(
            createJudgeInfoResponse(),
            createJudgeInfoResponse(userId = UUID.randomUUID())
        )

        whenever(judgeManagementService.getJudgesByHackathon(testHackathonId, testUserId))
            .thenReturn(judges)

        mockMvc.perform(
            get("/api/judging/hackathons/$testHackathonId/judges")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].userId").value(judges[0].userId.toString()))
            .andExpect(jsonPath("$[0].email").value("judge@example.com"))
    }

    @Test
    fun `addJudge should add judge for organizer`() {
        val judgeUserId = UUID.randomUUID()
        val request = AddJudgeRequest(userId = judgeUserId)
        val response = createJudgeInfoResponse(userId = judgeUserId)

        whenever(judgeManagementService.addJudge(testHackathonId, judgeUserId, testUserId))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/judging/hackathons/$testHackathonId/judges")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.userId").value(judgeUserId.toString()))
    }

    @Test
    fun `addJudge should return 403 when non-organizer attempts to add judge`() {
        val judgeUserId = UUID.randomUUID()
        val request = AddJudgeRequest(userId = judgeUserId)

        whenever(judgeManagementService.addJudge(testHackathonId, judgeUserId, testUserId))
            .thenThrow(ApiException("Only organizers can add judges", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            post("/api/judging/hackathons/$testHackathonId/judges")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `removeJudge should remove judge for organizer`() {
        val judgeUserId = UUID.randomUUID()

        mockMvc.perform(
            delete("/api/judging/hackathons/$testHackathonId/judges/$judgeUserId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isNoContent)
    }

    @Test
    fun `removeJudge should return 403 when non-organizer attempts to remove judge`() {
        val judgeUserId = UUID.randomUUID()

        whenever(judgeManagementService.removeJudge(testHackathonId, judgeUserId, testUserId))
            .thenThrow(ApiException("Only organizers can remove judges", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            delete("/api/judging/hackathons/$testHackathonId/judges/$judgeUserId")
                .with(user(createUserPrincipal()))
                .with(csrf())
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `getAssignments should return judge's assignments`() {
        val assignments = listOf(
            createJudgeAssignmentResponse(),
            createJudgeAssignmentResponse(id = UUID.randomUUID())
        )

        whenever(judgingService.getAssignmentsByJudge(testHackathonId, testUserId))
            .thenReturn(assignments)

        mockMvc.perform(
            get("/api/judging/hackathons/$testHackathonId/assignments")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(assignments[0].id.toString()))
            .andExpect(jsonPath("$[0].projectName").value("Test Project"))
    }

    @Test
    fun `getAssignment should return single assignment for judge`() {
        val assignment = createJudgeAssignmentResponse()

        whenever(judgingService.getAssignment(testAssignmentId, testUserId))
            .thenReturn(assignment)

        mockMvc.perform(
            get("/api/judging/assignments/$testAssignmentId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testAssignmentId.toString()))
            .andExpect(jsonPath("$.projectName").value("Test Project"))
    }

    @Test
    fun `submitScores should submit scores for judge`() {
        val request = SubmitScoresRequest(
            scores = listOf(
                SubmitScoreRequest(
                    criteriaId = testCriteriaId,
                    score = 8,
                    feedback = "Great work!"
                )
            )
        )
        val response = createJudgeAssignmentResponse().copy(
            completedAt = OffsetDateTime.now(),
            scores = listOf(
                ScoreResponse(
                    id = UUID.randomUUID(),
                    criteriaId = testCriteriaId,
                    criteriaName = "Innovation",
                    score = 8,
                    maxScore = 10,
                    feedback = "Great work!"
                )
            )
        )

        whenever(judgingService.submitScores(eq(testAssignmentId), any(), eq(testUserId)))
            .thenReturn(response)

        mockMvc.perform(
            post("/api/judging/assignments/$testAssignmentId/scores")
                .with(user(createUserPrincipal()))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testAssignmentId.toString()))
            .andExpect(jsonPath("$.completedAt").isNotEmpty)
            .andExpect(jsonPath("$.scores").isNotEmpty)
    }

    @Test
    fun `getLeaderboard should return ranked projects`() {
        val leaderboard = listOf(
            createLeaderboardEntryResponse(rank = 1),
            createLeaderboardEntryResponse(rank = 2, projectId = UUID.randomUUID())
        )

        whenever(judgingService.getLeaderboard(testHackathonId, testUserId))
            .thenReturn(leaderboard)

        mockMvc.perform(
            get("/api/judging/hackathons/$testHackathonId/leaderboard")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].rank").value(1))
            .andExpect(jsonPath("$[0].totalScore").value(85.5))
            .andExpect(jsonPath("$[0].criteriaAverages").isNotEmpty)
    }
}
