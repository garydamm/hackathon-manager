package com.hackathon.manager.controller

import com.hackathon.manager.dto.CreateHackathonRequest
import com.hackathon.manager.dto.HackathonResponse
import com.hackathon.manager.dto.HackathonSearchResponse
import com.hackathon.manager.dto.OrganizerInfo
import com.hackathon.manager.dto.ParticipantResponse
import com.hackathon.manager.dto.PromoteOrganizerRequest
import com.hackathon.manager.dto.UpdateHackathonRequest
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.HackathonSearchService
import com.hackathon.manager.service.HackathonService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/hackathons")
class HackathonController(
    private val hackathonService: HackathonService,
    private val hackathonSearchService: HackathonSearchService
) {

    @GetMapping
    fun getAllHackathons(): ResponseEntity<List<HackathonResponse>> {
        val hackathons = hackathonService.getActiveHackathons()
        return ResponseEntity.ok(hackathons)
    }

    @GetMapping("/search")
    fun searchHackathons(
        @RequestParam(required = false) query: String?,
        @RequestParam(required = false) timeFrame: String?,
        @RequestParam(required = false) startDate: String?,
        @RequestParam(required = false) endDate: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false, defaultValue = "0") page: Int,
        @RequestParam(required = false, defaultValue = "20") size: Int
    ): ResponseEntity<HackathonSearchResponse> {
        val results = hackathonSearchService.search(
            query = query,
            timeFrame = timeFrame,
            startDate = startDate,
            endDate = endDate,
            status = status,
            page = page,
            size = size
        )
        return ResponseEntity.ok(results)
    }

    @GetMapping("/my-drafts")
    fun getMyDraftHackathons(
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<HackathonResponse>> {
        val hackathons = hackathonService.getUserDraftHackathons(principal.id)
        return ResponseEntity.ok(hackathons)
    }

    @GetMapping("/{slug}")
    fun getHackathonBySlug(
        @PathVariable slug: String,
        @AuthenticationPrincipal principal: UserPrincipal?
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.getHackathonBySlug(slug, principal?.id)
        return ResponseEntity.ok(hackathon)
    }

    @GetMapping("/id/{id}")
    fun getHackathonById(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal?
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.getHackathonById(id, principal?.id)
        return ResponseEntity.ok(hackathon)
    }

    @PostMapping
    fun createHackathon(
        @Valid @RequestBody request: CreateHackathonRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.createHackathon(request, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(hackathon)
    }

    @PutMapping("/{id}")
    fun updateHackathon(
        @PathVariable id: UUID,
        @RequestBody request: UpdateHackathonRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<HackathonResponse> {
        if (!hackathonService.isUserOrganizer(id, principal.id)) {
            throw ApiException("Only organizers can update hackathons", HttpStatus.FORBIDDEN)
        }
        val hackathon = hackathonService.updateHackathon(id, request)
        return ResponseEntity.ok(hackathon)
    }

    @PostMapping("/{id}/register")
    fun registerForHackathon(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.registerForHackathon(id, principal.id)
        return ResponseEntity.ok(hackathon)
    }

    @DeleteMapping("/{id}/register")
    fun unregisterForHackathon(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.unregisterForHackathon(id, principal.id)
        return ResponseEntity.ok(hackathon)
    }

    @GetMapping("/{id}/organizers")
    fun getHackathonOrganizers(
        @PathVariable id: UUID
    ): ResponseEntity<List<OrganizerInfo>> {
        val organizers = hackathonService.getHackathonOrganizers(id)
        return ResponseEntity.ok(organizers)
    }

    @GetMapping("/{id}/participants")
    fun getHackathonParticipants(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal?
    ): ResponseEntity<List<ParticipantResponse>> {
        if (principal == null) {
            throw ApiException("Authentication required", HttpStatus.UNAUTHORIZED)
        }
        val participants = hackathonService.getHackathonParticipants(id)
        return ResponseEntity.ok(participants)
    }

    @PostMapping("/{id}/organizers")
    fun promoteToOrganizer(
        @PathVariable id: UUID,
        @Valid @RequestBody request: PromoteOrganizerRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<OrganizerInfo>> {
        val organizers = hackathonService.promoteToOrganizer(id, request.userId, principal.id)
        return ResponseEntity.ok(organizers)
    }

    @DeleteMapping("/{id}/organizers/{userId}")
    fun demoteOrganizer(
        @PathVariable id: UUID,
        @PathVariable userId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<OrganizerInfo>> {
        val organizers = hackathonService.demoteOrganizer(id, userId, principal.id)
        return ResponseEntity.ok(organizers)
    }

    @PostMapping("/{id}/archive")
    fun archiveHackathon(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.archiveHackathon(id, principal.id)
        return ResponseEntity.ok(hackathon)
    }

    @PostMapping("/{id}/unarchive")
    fun unarchiveHackathon(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<HackathonResponse> {
        val hackathon = hackathonService.unarchiveHackathon(id, principal.id)
        return ResponseEntity.ok(hackathon)
    }
}
