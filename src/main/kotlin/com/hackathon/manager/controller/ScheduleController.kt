package com.hackathon.manager.controller

import com.hackathon.manager.dto.BulkMarkAttendanceRequest
import com.hackathon.manager.dto.CreateScheduleEventRequest
import com.hackathon.manager.dto.EventAttendeeResponse
import com.hackathon.manager.dto.MarkAttendanceRequest
import com.hackathon.manager.dto.RsvpRequest
import com.hackathon.manager.dto.ScheduleEventResponse
import com.hackathon.manager.dto.UpdateScheduleEventRequest
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.HackathonService
import com.hackathon.manager.service.ScheduleService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/schedule")
class ScheduleController(
    private val scheduleService: ScheduleService,
    private val hackathonService: HackathonService
) {

    @GetMapping("/hackathon/{hackathonId}")
    fun getScheduleByHackathon(
        @PathVariable hackathonId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal?
    ): ResponseEntity<List<ScheduleEventResponse>> {
        val events = scheduleService.getScheduleByHackathonWithRsvp(hackathonId, principal?.id)
        return ResponseEntity.ok(events)
    }

    @GetMapping("/{id}")
    fun getScheduleEventById(@PathVariable id: UUID): ResponseEntity<ScheduleEventResponse> {
        val event = scheduleService.getScheduleEventById(id)
        return ResponseEntity.ok(event)
    }

    @PostMapping
    fun createScheduleEvent(
        @Valid @RequestBody request: CreateScheduleEventRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ScheduleEventResponse> {
        if (!hackathonService.isUserOrganizer(request.hackathonId, principal.id)) {
            throw ApiException("Only organizers can create schedule events", HttpStatus.FORBIDDEN)
        }
        val event = scheduleService.createScheduleEvent(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(event)
    }

    @PutMapping("/{id}")
    fun updateScheduleEvent(
        @PathVariable id: UUID,
        @RequestBody request: UpdateScheduleEventRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ScheduleEventResponse> {
        val existing = scheduleService.getScheduleEventById(id)
        if (!hackathonService.isUserOrganizer(existing.hackathonId, principal.id)) {
            throw ApiException("Only organizers can update schedule events", HttpStatus.FORBIDDEN)
        }
        val event = scheduleService.updateScheduleEvent(id, request)
        return ResponseEntity.ok(event)
    }

    @DeleteMapping("/{id}")
    fun deleteScheduleEvent(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        val existing = scheduleService.getScheduleEventById(id)
        if (!hackathonService.isUserOrganizer(existing.hackathonId, principal.id)) {
            throw ApiException("Only organizers can delete schedule events", HttpStatus.FORBIDDEN)
        }
        scheduleService.deleteScheduleEvent(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{eventId}/rsvp")
    fun rsvpToEvent(
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: RsvpRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ScheduleEventResponse> {
        val event = scheduleService.rsvpToEvent(eventId, principal.id, request.rsvpStatus)
        return ResponseEntity.status(HttpStatus.CREATED).body(event)
    }

    @PutMapping("/{eventId}/rsvp")
    fun updateRsvp(
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: RsvpRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ScheduleEventResponse> {
        val event = scheduleService.rsvpToEvent(eventId, principal.id, request.rsvpStatus)
        return ResponseEntity.ok(event)
    }

    @DeleteMapping("/{eventId}/rsvp")
    fun removeRsvp(
        @PathVariable eventId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        scheduleService.removeRsvp(eventId, principal.id)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{eventId}/attendees")
    fun getEventAttendees(
        @PathVariable eventId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<List<EventAttendeeResponse>> {
        val attendees = scheduleService.getEventAttendees(eventId, principal.id)
        return ResponseEntity.ok(attendees)
    }

    @PostMapping("/{eventId}/attendance")
    fun markAttendance(
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: MarkAttendanceRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        scheduleService.markAttendance(eventId, request.userId, request.attended, principal.id)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/{eventId}/attendance/bulk")
    fun bulkMarkAttendance(
        @PathVariable eventId: UUID,
        @Valid @RequestBody request: BulkMarkAttendanceRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<Void> {
        scheduleService.bulkMarkAttendance(eventId, request.userIds, request.attended, principal.id)
        return ResponseEntity.ok().build()
    }
}
