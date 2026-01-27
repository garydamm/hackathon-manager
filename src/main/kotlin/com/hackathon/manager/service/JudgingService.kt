package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.JudgeInfoResponse
import com.hackathon.manager.dto.JudgingCriteriaResponse
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.entity.enums.UserRole
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.HackathonUserRepository
import com.hackathon.manager.repository.JudgeAssignmentRepository
import com.hackathon.manager.repository.JudgingCriteriaRepository
import com.hackathon.manager.repository.ProjectRepository
import com.hackathon.manager.repository.UserRepository
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
    private val judgeAssignmentRepository: JudgeAssignmentRepository
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
}
