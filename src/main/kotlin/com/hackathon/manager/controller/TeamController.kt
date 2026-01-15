package com.hackathon.manager.controller

import com.hackathon.manager.dto.CreateTeamRequest
import com.hackathon.manager.dto.JoinTeamRequest
import com.hackathon.manager.dto.TeamResponse
import com.hackathon.manager.dto.UpdateTeamRequest
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.TeamService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/teams")
class TeamController(
    private val teamService: TeamService
) {

    @GetMapping("/hackathon/{hackathonId}")
    fun getTeamsByHackathon(@PathVariable hackathonId: UUID): ResponseEntity<List<TeamResponse>> {
        val teams = teamService.getTeamsByHackathon(hackathonId)
        return ResponseEntity.ok(teams)
    }

    @GetMapping("/{id}")
    fun getTeamById(@PathVariable id: UUID): ResponseEntity<TeamResponse> {
        val team = teamService.getTeamById(id)
        return ResponseEntity.ok(team)
    }

    @GetMapping("/hackathon/{hackathonId}/my-team")
    fun getMyTeam(
        @PathVariable hackathonId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<TeamResponse?> {
        val team = teamService.getUserTeamInHackathon(hackathonId, principal.id)
        return ResponseEntity.ok(team)
    }

    @PostMapping
    fun createTeam(
        @Valid @RequestBody request: CreateTeamRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<TeamResponse> {
        val team = teamService.createTeam(request, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(team)
    }

    @PutMapping("/{id}")
    fun updateTeam(
        @PathVariable id: UUID,
        @RequestBody request: UpdateTeamRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<TeamResponse> {
        val team = teamService.updateTeam(id, request, principal.id)
        return ResponseEntity.ok(team)
    }

    @PostMapping("/join")
    fun joinTeam(
        @Valid @RequestBody request: JoinTeamRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<TeamResponse> {
        val team = teamService.joinTeamByInviteCode(request.inviteCode, principal.id)
        return ResponseEntity.ok(team)
    }

    @PostMapping("/{id}/leave")
    fun leaveTeam(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        teamService.leaveTeam(id, principal.id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/regenerate-invite")
    fun regenerateInviteCode(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Map<String, String>> {
        val inviteCode = teamService.regenerateInviteCode(id, principal.id)
        return ResponseEntity.ok(mapOf("inviteCode" to inviteCode))
    }
}
