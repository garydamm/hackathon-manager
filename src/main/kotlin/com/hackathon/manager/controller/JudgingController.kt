package com.hackathon.manager.controller

import com.hackathon.manager.dto.AddJudgeRequest
import com.hackathon.manager.dto.CreateJudgingCriteriaRequest
import com.hackathon.manager.dto.JudgeAssignmentResponse
import com.hackathon.manager.dto.JudgeInfoResponse
import com.hackathon.manager.dto.JudgingCriteriaResponse
import com.hackathon.manager.dto.LeaderboardEntryResponse
import com.hackathon.manager.dto.SubmitScoresRequest
import com.hackathon.manager.dto.UpdateJudgingCriteriaRequest
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.JudgeManagementService
import com.hackathon.manager.service.JudgingCriteriaService
import com.hackathon.manager.service.LeaderboardService
import com.hackathon.manager.service.ScoringService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/judging")
class JudgingController(
    private val judgingCriteriaService: JudgingCriteriaService,
    private val judgeManagementService: JudgeManagementService,
    private val scoringService: ScoringService,
    private val leaderboardService: LeaderboardService
) {

    @GetMapping("/hackathons/{hackathonId}/criteria")
    fun getCriteriaByHackathon(
        @PathVariable hackathonId: UUID
    ): ResponseEntity<List<JudgingCriteriaResponse>> {
        val criteria = judgingCriteriaService.getCriteriaByHackathon(hackathonId)
        return ResponseEntity.ok(criteria)
    }

    @PostMapping("/hackathons/{hackathonId}/criteria")
    fun createCriteria(
        @PathVariable hackathonId: UUID,
        @Valid @RequestBody request: CreateJudgingCriteriaRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgingCriteriaResponse> {
        val criteria = judgingCriteriaService.createCriteria(hackathonId, request, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(criteria)
    }

    @PutMapping("/criteria/{criteriaId}")
    fun updateCriteria(
        @PathVariable criteriaId: UUID,
        @Valid @RequestBody request: UpdateJudgingCriteriaRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgingCriteriaResponse> {
        val criteria = judgingCriteriaService.updateCriteria(criteriaId, request, principal.id)
        return ResponseEntity.ok(criteria)
    }

    @DeleteMapping("/criteria/{criteriaId}")
    fun deleteCriteria(
        @PathVariable criteriaId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        judgingCriteriaService.deleteCriteria(criteriaId, principal.id)
        return ResponseEntity.noContent().build()
    }

    // Judge management endpoints

    @GetMapping("/hackathons/{hackathonId}/judges")
    fun getJudges(
        @PathVariable hackathonId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<JudgeInfoResponse>> {
        val judges = judgeManagementService.getJudgesByHackathon(hackathonId, principal.id)
        return ResponseEntity.ok(judges)
    }

    @PostMapping("/hackathons/{hackathonId}/judges")
    fun addJudge(
        @PathVariable hackathonId: UUID,
        @Valid @RequestBody request: AddJudgeRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgeInfoResponse> {
        val judge = judgeManagementService.addJudge(hackathonId, request.userId, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(judge)
    }

    @DeleteMapping("/hackathons/{hackathonId}/judges/{userId}")
    fun removeJudge(
        @PathVariable hackathonId: UUID,
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        judgeManagementService.removeJudge(hackathonId, userId, principal.id)
        return ResponseEntity.noContent().build()
    }

    // Scoring endpoints

    @GetMapping("/hackathons/{hackathonId}/assignments")
    fun getAssignments(
        @PathVariable hackathonId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<JudgeAssignmentResponse>> {
        val assignments = scoringService.getAssignmentsByJudge(hackathonId, principal.id)
        return ResponseEntity.ok(assignments)
    }

    @GetMapping("/assignments/{assignmentId}")
    fun getAssignment(
        @PathVariable assignmentId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgeAssignmentResponse> {
        val assignment = scoringService.getAssignment(assignmentId, principal.id)
        return ResponseEntity.ok(assignment)
    }

    @PostMapping("/assignments/{assignmentId}/scores")
    fun submitScores(
        @PathVariable assignmentId: UUID,
        @Valid @RequestBody request: SubmitScoresRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<JudgeAssignmentResponse> {
        val assignment = scoringService.submitScores(assignmentId, request, principal.id)
        return ResponseEntity.ok(assignment)
    }

    // Leaderboard endpoint

    @GetMapping("/hackathons/{hackathonId}/leaderboard")
    fun getLeaderboard(
        @PathVariable hackathonId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<LeaderboardEntryResponse>> {
        val leaderboard = leaderboardService.getLeaderboard(hackathonId, principal.id)
        return ResponseEntity.ok(leaderboard)
    }
}
