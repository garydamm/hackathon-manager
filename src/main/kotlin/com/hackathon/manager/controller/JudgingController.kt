package com.hackathon.manager.controller

import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.JudgingCriteriaResponse
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.JudgingService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/judging")
class JudgingController(
    private val judgingService: JudgingService
) {

    @GetMapping("/hackathons/{hackathonId}/criteria")
    fun getCriteriaByHackathon(
        @PathVariable hackathonId: UUID
    ): ResponseEntity<List<JudgingCriteriaResponse>> {
        val criteria = judgingService.getCriteriaByHackathon(hackathonId)
        return ResponseEntity.ok(criteria)
    }

    @PostMapping("/hackathons/{hackathonId}/criteria")
    fun createCriteria(
        @PathVariable hackathonId: UUID,
        @Valid @RequestBody request: CreateJudgingCriteriaRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgingCriteriaResponse> {
        val criteria = judgingService.createCriteria(hackathonId, request, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(criteria)
    }

    @PutMapping("/criteria/{criteriaId}")
    fun updateCriteria(
        @PathVariable criteriaId: UUID,
        @Valid @RequestBody request: UpdateJudgingCriteriaRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgingCriteriaResponse> {
        val criteria = judgingService.updateCriteria(criteriaId, request, principal.id)
        return ResponseEntity.ok(criteria)
    }

    @DeleteMapping("/criteria/{criteriaId}")
    fun deleteCriteria(
        @PathVariable criteriaId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        judgingService.deleteCriteria(criteriaId, principal.id)
        return ResponseEntity.noContent().build()
    }
}
