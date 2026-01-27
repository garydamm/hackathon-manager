package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.JudgeAssignmentResponse
import com.hackathon.manager.dto.JudgeInfoResponse
import com.hackathon.manager.dto.JudgingCriteriaResponse
import com.hackathon.manager.dto.SubmitScoresRequest
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.entity.HackathonUser
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

    @Transactional(readOnly = true)
    fun getCriteriaByHackathon(hackathonId: UUID): List<JudgingCriteriaResponse> {
        return judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(hackathonId)
            .map { JudgingCriteriaResponse.fromEntity(it) }
    }

    @Transactional
    fun createCriteria(hackathonId: UUID, request: CreateJudgingCriteriaRequest, userId: UUID): JudgingCriteriaResponse {
        if (!hackathonService.isUserOrganizer(hackathonId, userId)) {
            throw ApiException("Only organizers can create judging criteria", HttpStatus.FORBIDDEN)
        }

        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val criteria = JudgingCriteria(
            hackathon = hackathon,
            name = request.name,
            description = request.description,
            maxScore = request.maxScore,
            weight = request.weight,
            displayOrder = request.displayOrder
        )

        val savedCriteria = judgingCriteriaRepository.save(criteria)
        return JudgingCriteriaResponse.fromEntity(savedCriteria)
    }

    @Transactional
    fun updateCriteria(criteriaId: UUID, request: UpdateJudgingCriteriaRequest, userId: UUID): JudgingCriteriaResponse {
        val criteria = judgingCriteriaRepository.findById(criteriaId)
            .orElseThrow { ApiException("Judging criteria not found", HttpStatus.NOT_FOUND) }

        if (!hackathonService.isUserOrganizer(criteria.hackathon.id!!, userId)) {
            throw ApiException("Only organizers can update judging criteria", HttpStatus.FORBIDDEN)
        }

        request.name?.let { criteria.name = it }
        request.description?.let { criteria.description = it }
        request.maxScore?.let { criteria.maxScore = it }
        request.weight?.let { criteria.weight = it }
        request.displayOrder?.let { criteria.displayOrder = it }

        val savedCriteria = judgingCriteriaRepository.save(criteria)
        return JudgingCriteriaResponse.fromEntity(savedCriteria)
    }

    @Transactional
    fun deleteCriteria(criteriaId: UUID, userId: UUID) {
        val criteria = judgingCriteriaRepository.findById(criteriaId)
            .orElseThrow { ApiException("Judging criteria not found", HttpStatus.NOT_FOUND) }

        if (!hackathonService.isUserOrganizer(criteria.hackathon.id!!, userId)) {
            throw ApiException("Only organizers can delete judging criteria", HttpStatus.FORBIDDEN)
        }

        judgingCriteriaRepository.delete(criteria)
    }

    // Judge management methods

    @Transactional(readOnly = true)
    fun getJudgesByHackathon(hackathonId: UUID, userId: UUID): List<JudgeInfoResponse> {
        if (!hackathonService.isUserOrganizer(hackathonId, userId)) {
            throw ApiException("Only organizers can view judges", HttpStatus.FORBIDDEN)
        }

        // Verify hackathon exists
        hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val judges = hackathonUserRepository.findByHackathonIdAndRole(hackathonId, UserRole.judge)
        val totalProjects = projectRepository.findByHackathonIdAndStatus(hackathonId, SubmissionStatus.submitted).size

        return judges.map { hackathonUser ->
            val completedAssignments = judgeAssignmentRepository
                .findByJudgeIdAndHackathonId(hackathonUser.user.id!!, hackathonId)
                .count { it.completedAt != null }

            JudgeInfoResponse(
                userId = hackathonUser.user.id!!,
                email = hackathonUser.user.email,
                firstName = hackathonUser.user.firstName,
                lastName = hackathonUser.user.lastName,
                displayName = hackathonUser.user.displayName,
                projectsScored = completedAssignments,
                totalProjects = totalProjects
            )
        }
    }

    @Transactional
    fun addJudge(hackathonId: UUID, judgeUserId: UUID, userId: UUID): JudgeInfoResponse {
        if (!hackathonService.isUserOrganizer(hackathonId, userId)) {
            throw ApiException("Only organizers can add judges", HttpStatus.FORBIDDEN)
        }

        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val user = userRepository.findById(judgeUserId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        val existingHackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, judgeUserId)

        if (existingHackathonUser != null) {
            if (existingHackathonUser.role == UserRole.judge) {
                throw ApiException("User is already a judge for this hackathon", HttpStatus.CONFLICT)
            }
            // Update existing role to judge
            existingHackathonUser.role = UserRole.judge
            hackathonUserRepository.save(existingHackathonUser)
        } else {
            // Create new HackathonUser with judge role
            val hackathonUser = HackathonUser(
                hackathon = hackathon,
                user = user,
                role = UserRole.judge
            )
            hackathonUserRepository.save(hackathonUser)
        }

        val totalProjects = projectRepository.findByHackathonIdAndStatus(hackathonId, SubmissionStatus.submitted).size

        return JudgeInfoResponse(
            userId = user.id!!,
            email = user.email,
            firstName = user.firstName,
            lastName = user.lastName,
            displayName = user.displayName,
            projectsScored = 0,
            totalProjects = totalProjects
        )
    }

    @Transactional
    fun removeJudge(hackathonId: UUID, judgeUserId: UUID, userId: UUID) {
        if (!hackathonService.isUserOrganizer(hackathonId, userId)) {
            throw ApiException("Only organizers can remove judges", HttpStatus.FORBIDDEN)
        }

        // Verify hackathon exists
        hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val hackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, judgeUserId)
            ?: throw ApiException("User is not associated with this hackathon", HttpStatus.NOT_FOUND)

        if (hackathonUser.role != UserRole.judge) {
            throw ApiException("User is not a judge for this hackathon", HttpStatus.BAD_REQUEST)
        }

        // Delete the HackathonUser entry (removes judge role)
        hackathonUserRepository.delete(hackathonUser)
    }

    // Scoring methods

    @Transactional(readOnly = true)
    fun getAssignmentsByJudge(hackathonId: UUID, userId: UUID): List<JudgeAssignmentResponse> {
        // Verify hackathon exists
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        // Verify user is a judge for this hackathon
        val hackathonUser = hackathonUserRepository.findByHackathonIdAndUserId(hackathonId, userId)
        if (hackathonUser == null || hackathonUser.role != UserRole.judge) {
            throw ApiException("User is not a judge for this hackathon", HttpStatus.FORBIDDEN)
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
}
