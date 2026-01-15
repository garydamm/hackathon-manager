package com.hackathon.manager.controller

import com.hackathon.manager.dto.AnnouncementResponse
import com.hackathon.manager.dto.CreateAnnouncementRequest
import com.hackathon.manager.dto.UpdateAnnouncementRequest
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.AnnouncementService
import com.hackathon.manager.service.HackathonService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/announcements")
class AnnouncementController(
    private val announcementService: AnnouncementService,
    private val hackathonService: HackathonService
) {

    @GetMapping("/hackathon/{hackathonId}")
    fun getAnnouncementsByHackathon(@PathVariable hackathonId: UUID): ResponseEntity<List<AnnouncementResponse>> {
        val announcements = announcementService.getAnnouncementsByHackathon(hackathonId)
        return ResponseEntity.ok(announcements)
    }

    @GetMapping("/{id}")
    fun getAnnouncementById(@PathVariable id: UUID): ResponseEntity<AnnouncementResponse> {
        val announcement = announcementService.getAnnouncementById(id)
        return ResponseEntity.ok(announcement)
    }

    @PostMapping
    fun createAnnouncement(
        @Valid @RequestBody request: CreateAnnouncementRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<AnnouncementResponse> {
        if (!hackathonService.isUserOrganizer(request.hackathonId, principal.id)) {
            throw ApiException("Only organizers can create announcements", HttpStatus.FORBIDDEN)
        }
        val announcement = announcementService.createAnnouncement(request, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(announcement)
    }

    @PutMapping("/{id}")
    fun updateAnnouncement(
        @PathVariable id: UUID,
        @RequestBody request: UpdateAnnouncementRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<AnnouncementResponse> {
        val existing = announcementService.getAnnouncementById(id)
        if (!hackathonService.isUserOrganizer(existing.hackathonId, principal.id)) {
            throw ApiException("Only organizers can update announcements", HttpStatus.FORBIDDEN)
        }
        val announcement = announcementService.updateAnnouncement(id, request)
        return ResponseEntity.ok(announcement)
    }

    @DeleteMapping("/{id}")
    fun deleteAnnouncement(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        val existing = announcementService.getAnnouncementById(id)
        if (!hackathonService.isUserOrganizer(existing.hackathonId, principal.id)) {
            throw ApiException("Only organizers can delete announcements", HttpStatus.FORBIDDEN)
        }
        announcementService.deleteAnnouncement(id)
        return ResponseEntity.noContent().build()
    }
}
