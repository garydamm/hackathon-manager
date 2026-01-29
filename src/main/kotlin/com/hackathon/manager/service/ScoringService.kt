package com.hackathon.manager.service

import com.hackathon.manager.dto.JudgeAssignmentResponse
import com.hackathon.manager.dto.SubmitScoreRequest
import com.hackathon.manager.dto.SubmitScoresRequest
import com.hackathon.manager.entity.JudgeAssignment
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.Score
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
class ScoringService(
    private val judgingCriteriaRepository: JudgingCriteriaRepository,
    private val hackathonRepository: HackathonRepository,
    private val hackathonUserRepository: HackathonUserRepository,
    private val userRepository: UserRepository,
    private val projectRepository: ProjectRepository,
    private val judgeAssignmentRepository: JudgeAssignmentRepository,
    private val scoreRepository: ScoreRepository
) {

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
        val criteriaById = mapCriteriaIds(criteria)

        // Validate and save each score
        validateAndSaveScores(request, assignment, criteriaById, assignmentId)

        // Check if all criteria have been scored to mark assignment as complete
        checkAssignmentCompletion(assignment, criteria, assignmentId)

        return JudgeAssignmentResponse.fromEntity(assignment, includeScores = true)
    }

    private fun mapCriteriaIds(criteria: List<JudgingCriteria>): Map<UUID, JudgingCriteria> {
        return criteria.mapNotNull { criterion ->
            criterion.id?.let { id -> id to criterion }
        }.toMap()
    }

    private fun validateAndSaveScores(
        request: SubmitScoresRequest,
        assignment: JudgeAssignment,
        criteriaById: Map<UUID, JudgingCriteria>,
        assignmentId: UUID
    ) {
        for (scoreRequest in request.scores) {
            val criterion = criteriaById[scoreRequest.criteriaId]
                ?: throw ApiException("Criteria not found: ${scoreRequest.criteriaId}", HttpStatus.BAD_REQUEST)

            validateScoreRange(scoreRequest.score, criterion)
            saveOrUpdateScore(scoreRequest, assignment, criterion, assignmentId)
        }
    }

    private fun validateScoreRange(score: Int, criterion: JudgingCriteria) {
        if (score < 0 || score > criterion.maxScore) {
            throw ApiException(
                "Score for '${criterion.name}' must be between 0 and ${criterion.maxScore}",
                HttpStatus.BAD_REQUEST
            )
        }
    }

    private fun saveOrUpdateScore(
        scoreRequest: SubmitScoreRequest,
        assignment: JudgeAssignment,
        criterion: JudgingCriteria,
        assignmentId: UUID
    ) {
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

    private fun checkAssignmentCompletion(
        assignment: JudgeAssignment,
        criteria: List<JudgingCriteria>,
        assignmentId: UUID
    ) {
        val scoredCriteriaIds = scoreRepository.findByJudgeAssignmentId(assignmentId).map { it.criteria.id }.toSet()
        val allCriteriaIds = criteria.map { it.id }.toSet()

        if (scoredCriteriaIds.containsAll(allCriteriaIds)) {
            assignment.completedAt = OffsetDateTime.now()
            judgeAssignmentRepository.save(assignment)
        }
    }
}
