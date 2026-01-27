package com.hackathon.manager.controller

import com.hackathon.manager.dto.AddJudgeRequest
import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.JudgeInfoResponse
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

    // Judge management endpoints

    @GetMapping("/hackathons/{hackathonId}/judges")
    fun getJudges(
        @PathVariable hackathonId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<JudgeInfoResponse>> {
        val judges = judgingService.getJudgesByHackathon(hackathonId, principal.id)
        return ResponseEntity.ok(judges)
    }

    @PostMapping("/hackathons/{hackathonId}/judges")
    fun addJudge(
        @PathVariable hackathonId: UUID,
        @Valid @RequestBody request: AddJudgeRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgeInfoResponse> {
        val judge = judgingService.addJudge(hackathonId, request.userId, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(judge)
    }

    @DeleteMapping("/hackathons/{hackathonId}/judges/{userId}")
    fun removeJudge(
        @PathVariable hackathonId: UUID,
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        judgingService.removeJudge(hackathonId, userId, principal.id)
        return ResponseEntity.noContent().build()
    }
}
