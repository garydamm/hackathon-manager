package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.JudgingCriteriaResponse
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.JudgingCriteriaRepository
import com.hackathon.manager.util.applyIfNotNull
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class JudgingCriteriaService(
    private val judgingCriteriaRepository: JudgingCriteriaRepository,
    private val hackathonRepository: HackathonRepository,
    private val hackathonService: HackathonService
) {

    @Transactional(readOnly = true)
    fun getCriteriaByHackathon(hackathonId: UUID): List<JudgingCriteriaResponse> {
        return judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(hackathonId)
            .map { judgingCriteria -> JudgingCriteriaResponse.fromEntity(judgingCriteria) }
    }

    @Transactional
    fun createCriteria(hackathonId: UUID, request: CreateJudgingCriteriaRequest, userId: UUID): JudgingCriteriaResponse {
        if (!hackathonService.isUserOrganizer(hackathonId, userId)) {
            throw ApiException("Only organizers can create judging criteria", HttpStatus.FORBIDDEN)
        }

        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val judgingCriteria = JudgingCriteria(
            hackathon = hackathon,
            name = request.name,
            description = request.description,
            maxScore = request.maxScore,
            weight = request.weight,
            displayOrder = request.displayOrder
        )

        val savedCriteria = judgingCriteriaRepository.save(judgingCriteria)
        return JudgingCriteriaResponse.fromEntity(savedCriteria)
    }

    @Transactional
    fun updateCriteria(criteriaId: UUID, request: UpdateJudgingCriteriaRequest, userId: UUID): JudgingCriteriaResponse {
        val judgingCriteria = judgingCriteriaRepository.findById(criteriaId)
            .orElseThrow { ApiException("Judging criteria not found", HttpStatus.NOT_FOUND) }

        if (!hackathonService.isUserOrganizer(judgingCriteria.hackathon.id!!, userId)) {
            throw ApiException("Only organizers can update judging criteria", HttpStatus.FORBIDDEN)
        }

        request.name.applyIfNotNull { judgingCriteria.name = it }
        request.description.applyIfNotNull { judgingCriteria.description = it }
        request.maxScore.applyIfNotNull { judgingCriteria.maxScore = it }
        request.weight.applyIfNotNull { judgingCriteria.weight = it }
        request.displayOrder.applyIfNotNull { judgingCriteria.displayOrder = it }

        val savedCriteria = judgingCriteriaRepository.save(judgingCriteria)
        return JudgingCriteriaResponse.fromEntity(savedCriteria)
    }

    @Transactional
    fun deleteCriteria(criteriaId: UUID, userId: UUID) {
        val judgingCriteria = judgingCriteriaRepository.findById(criteriaId)
            .orElseThrow { ApiException("Judging criteria not found", HttpStatus.NOT_FOUND) }

        if (!hackathonService.isUserOrganizer(judgingCriteria.hackathon.id!!, userId)) {
            throw ApiException("Only organizers can delete judging criteria", HttpStatus.FORBIDDEN)
        }

        judgingCriteriaRepository.delete(judgingCriteria)
    }
}
