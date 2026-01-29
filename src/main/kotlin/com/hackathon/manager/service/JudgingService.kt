package com.hackathon.manager.service

import com.hackathon.manager.dto.CriteriaAverageResponse
import com.hackathon.manager.dto.JudgeAssignmentResponse
import com.hackathon.manager.dto.LeaderboardEntryResponse
import com.hackathon.manager.dto.SubmitScoresRequest
import com.hackathon.manager.entity.JudgeAssignment
import com.hackathon.manager.entity.Score
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
import java.time.OffsetDateTime
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class JudgingService(
    private val judgingCriteriaRepository: JudgingCriteriaRepository,
    private val hackathonRepository: HackathonRepository,
    private val hackathonService: HackathonService,
    private val hackathonUserRepository: HackathonUserRepository,
    private val userRepository: UserRepository,
    private val projectRepository: ProjectRepository,
    private val judgeAssignmentRepository: JudgeAssignmentRepository,
    private val scoreRepository: ScoreRepository
) {

    // Scoring methods

    @Transactional
    fun getAssignmentsByJudge(hackathonId: UUID, userId: UUID): List<JudgeAssignmentResponse> {
        // Verify hackathon exists
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        // Verify user is a judge or organizer for this hackathon
        val hackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
        if (hackathonUser == null || (hackathonUser.role != UserRole.judge && hackathonUser.role != UserRole.organizer)) {
            throw ApiException("User is not a judge or organizer for this hackathon", HttpStatus.FORBIDDEN)
        }

        // Get all submitted projects for the hackathon
        val submittedProjects = projectRepository.findByHackathonIdAndStatus(hackathonId, SubmissionStatus.submitted)

        // Get existing assignments for this judge
        val existingAssignments = judgeAssignmentRepository.findByJudgeIdAndHackathonId(userId, hackathonId)
        val assignmentsByProjectId = existingAssignments.associateBy { it.project.id }

        // Find projects without assignments
        val projectsWithoutAssignment = submittedProjects.filter { it.id !in assignmentsByProjectId }

        // Auto-create assignments for projects that don't have one yet (lazy load user only if needed)
        val newAssignments = if (projectsWithoutAssignment.isNotEmpty()) {
            val user = userRepository.findById(userId)
                .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

            projectsWithoutAssignment.map { project ->
                val newAssignment = JudgeAssignment(
                    hackathon = hackathon,
                    judge = user,
                    project = project
                )
                judgeAssignmentRepository.save(newAssignment)
            }
        } else {
            emptyList()
        }

        val allAssignments = existingAssignments + newAssignments
        return allAssignments.map { JudgeAssignmentResponse.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getAssignment(assignmentId: UUID, userId: UUID): JudgeAssignmentResponse {
        val assignment = judgeAssignmentRepository.findById(assignmentId)
            .orElseThrow { ApiException("Assignment not found", HttpStatus.NOT_FOUND) }

        // Verify user is the judge for this assignment
        if (assignment.judge.id != userId) {
            throw ApiException("Not authorized to view this assignment", HttpStatus.FORBIDDEN)
        }

        return JudgeAssignmentResponse.fromEntity(assignment, includeScores = true)
    }

    @Transactional
    fun submitScores(assignmentId: UUID, request: SubmitScoresRequest, userId: UUID): JudgeAssignmentResponse {
        val assignment = judgeAssignmentRepository.findById(assignmentId)
            .orElseThrow { ApiException("Assignment not found", HttpStatus.NOT_FOUND) }

        // Verify user is the judge for this assignment
        if (assignment.judge.id != userId) {
            throw ApiException("Not authorized to submit scores for this assignment", HttpStatus.FORBIDDEN)
        }

        val hackathonId = assignment.hackathon.id!!
        val criteria = judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(hackathonId)
        val criteriaById = criteria.associateBy { it.id }

        // Validate and save each score
        for (scoreRequest in request.scores) {
            val criterion = criteriaById[scoreRequest.criteriaId]
                ?: throw ApiException("Criteria not found: ${scoreRequest.criteriaId}", HttpStatus.BAD_REQUEST)

            // Validate score is within range
            if (scoreRequest.score < 0 || scoreRequest.score > criterion.maxScore) {
                throw ApiException(
                    "Score for '${criterion.name}' must be between 0 and ${criterion.maxScore}",
                    HttpStatus.BAD_REQUEST
                )
            }

            // Find existing score or create new one
            val existingScore = scoreRepository.findByJudgeAssignmentIdAndCriteriaId(assignmentId, scoreRequest.criteriaId)

            if (existingScore != null) {
                existingScore.score = scoreRequest.score
                existingScore.feedback = scoreRequest.feedback
                scoreRepository.save(existingScore)
            } else {
                val newScore = Score(
                    judgeAssignment = assignment,
                    criteria = criterion,
                    score = scoreRequest.score,
                    feedback = scoreRequest.feedback
                )
                val savedScore = scoreRepository.save(newScore)
                assignment.scores.add(savedScore)
            }
        }

        // Check if all criteria have been scored to mark assignment as complete
        val scoredCriteriaIds = scoreRepository.findByJudgeAssignmentId(assignmentId).map { it.criteria.id }.toSet()
        val allCriteriaIds = criteria.map { it.id }.toSet()

        if (scoredCriteriaIds.containsAll(allCriteriaIds)) {
            assignment.completedAt = OffsetDateTime.now()
            judgeAssignmentRepository.save(assignment)
        }

        return JudgeAssignmentResponse.fromEntity(assignment, includeScores = true)
    }

    // Leaderboard methods

    @Transactional(readOnly = true)
    fun getLeaderboard(hackathonId: UUID, userId: UUID): List<LeaderboardEntryResponse> {
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        // Check authorization: organizers can view anytime, participants only when completed
        val isOrganizer = hackathonService.isUserOrganizer(hackathonId, userId)

        if (!isOrganizer) {
            if (hackathon.status != HackathonStatus.completed) {
                throw ApiException("Results are only available after the hackathon is completed", HttpStatus.FORBIDDEN)
            }
        }

        // Get all criteria for this hackathon
        val criteria = judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(hackathonId)
        if (criteria.isEmpty()) {
            return emptyList()
        }

        // Get all submitted projects
        val submittedProjects = projectRepository.findByHackathonIdAndStatus(hackathonId, SubmissionStatus.submitted)
        if (submittedProjects.isEmpty()) {
            return emptyList()
        }

        // Calculate scores for each project
        val projectScores = submittedProjects.map { project ->
            // Get all scores for this project across all judge assignments
            val projectAssignments = judgeAssignmentRepository.findByProjectId(project.id!!)

            // Calculate weighted average per criteria
            val criteriaAverages = criteria.map { criterion ->
                val scoresForCriteria = projectAssignments.flatMap { assignment ->
                    scoreRepository.findByJudgeAssignmentId(assignment.id!!)
                        .filter { it.criteria.id == criterion.id }
                }

                val averageScore = if (scoresForCriteria.isNotEmpty()) {
                    scoresForCriteria.map { it.score }.average()
                } else {
                    0.0
                }

                CriteriaAverageResponse(
                    criteriaId = criterion.id!!,
                    criteriaName = criterion.name,
                    averageScore = averageScore,
                    maxScore = criterion.maxScore
                ) to criterion.weight.toDouble()
            }

            // Calculate total weighted score: sum(score * weight) / sum(weight)
            val totalWeightedScore = criteriaAverages.sumOf { (avg, weight) ->
                avg.averageScore * weight
            }
            val totalWeight = criteriaAverages.sumOf { (_, weight) -> weight }
            val totalScore = if (totalWeight > 0) totalWeightedScore / totalWeight else 0.0

            ProjectScoreData(
                project = project,
                totalScore = totalScore,
                criteriaAverages = criteriaAverages.map { it.first }
            )
        }

        // Sort by total score descending and assign ranks
        val sortedProjects = projectScores.sortedByDescending { it.totalScore }

        return sortedProjects.mapIndexed { index, data ->
            LeaderboardEntryResponse(
                rank = index + 1,
                projectId = data.project.id!!,
                projectName = data.project.name,
                teamId = data.project.team.id!!,
                teamName = data.project.team.name,
                totalScore = data.totalScore,
                criteriaAverages = data.criteriaAverages
            )
        }
    }

    private data class ProjectScoreData(
        val project: com.hackathon.manager.entity.Project,
        val totalScore: Double,
        val criteriaAverages: List<CriteriaAverageResponse>
    )
}
