package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateScheduleEventRequest
import com.hackathon.manager.dto.ScheduleEventResponse
import com.hackathon.manager.dto.UpdateScheduleEventRequest
import com.hackathon.manager.entity.EventAttendee
import com.hackathon.manager.entity.ScheduleEvent
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.EventAttendeeRepository
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.ScheduleEventRepository
import com.hackathon.manager.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class ScheduleService(
    private val scheduleEventRepository: ScheduleEventRepository,
    private val hackathonRepository: HackathonRepository,
    private val eventAttendeeRepository: EventAttendeeRepository,
    private val userRepository: UserRepository,
    private val hackathonService: HackathonService
) {

    @Transactional(readOnly = true)
    fun getScheduleByHackathon(hackathonId: UUID): List<ScheduleEventResponse> {
        return scheduleEventRepository.findByHackathonIdOrderByStartsAt(hackathonId)
            .map { ScheduleEventResponse.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getScheduleEventById(id: UUID): ScheduleEventResponse {
        val event = scheduleEventRepository.findById(id)
            .orElseThrow { ApiException("Schedule event not found", HttpStatus.NOT_FOUND) }
        return ScheduleEventResponse.fromEntity(event)
    }

    @Transactional
    fun createScheduleEvent(request: CreateScheduleEventRequest): ScheduleEventResponse {
        val hackathon = hackathonRepository.findById(request.hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        val event = ScheduleEvent(
            hackathon = hackathon,
            name = request.name,
            description = request.description,
            eventType = request.eventType,
            location = request.location,
            virtualLink = request.virtualLink,
            startsAt = request.startsAt,
            endsAt = request.endsAt,
            isMandatory = request.isMandatory
        )

        val savedEvent = scheduleEventRepository.save(event)
        return ScheduleEventResponse.fromEntity(savedEvent)
    }

    @Transactional
    fun updateScheduleEvent(id: UUID, request: UpdateScheduleEventRequest): ScheduleEventResponse {
        val event = scheduleEventRepository.findById(id)
            .orElseThrow { ApiException("Schedule event not found", HttpStatus.NOT_FOUND) }

        request.name?.let { event.name = it }
        request.description?.let { event.description = it }
        request.eventType?.let { event.eventType = it }
        request.location?.let { event.location = it }
        request.virtualLink?.let { event.virtualLink = it }
        request.startsAt?.let { event.startsAt = it }
        request.endsAt?.let { event.endsAt = it }
        request.isMandatory?.let { event.isMandatory = it }

        val savedEvent = scheduleEventRepository.save(event)
        return ScheduleEventResponse.fromEntity(savedEvent)
    }

    @Transactional
    fun deleteScheduleEvent(id: UUID) {
        if (!scheduleEventRepository.existsById(id)) {
            throw ApiException("Schedule event not found", HttpStatus.NOT_FOUND)
        }
        scheduleEventRepository.deleteById(id)
    }

    @Transactional(readOnly = true)
    fun getScheduleByHackathonWithRsvp(hackathonId: UUID, userId: UUID?): List<ScheduleEventResponse> {
        val events = scheduleEventRepository.findByHackathonIdOrderByStartsAt(hackathonId)

        return events.map { event ->
            // Count RSVPs by status
            val attendingCount = eventAttendeeRepository.countByEventIdAndRsvpStatus(event.id!!, "attending").toInt()
            val maybeCount = eventAttendeeRepository.countByEventIdAndRsvpStatus(event.id!!, "maybe").toInt()
            val notAttendingCount = eventAttendeeRepository.countByEventIdAndRsvpStatus(event.id!!, "not_attending").toInt()

            // Get user's RSVP status if userId provided
            val userAttendee = userId?.let {
                eventAttendeeRepository.findByEventIdAndUserId(event.id!!, it)
            }

            ScheduleEventResponse.fromEntity(
                event = event,
                attendingCount = attendingCount,
                maybeCount = maybeCount,
                notAttendingCount = notAttendingCount,
                userAttendee = userAttendee
            )
        }
    }

    @Transactional
    fun rsvpToEvent(eventId: UUID, userId: UUID, rsvpStatus: String): ScheduleEventResponse {
        // Validate rsvpStatus
        val validStatuses = listOf("attending", "maybe", "not_attending")
        if (rsvpStatus !in validStatuses) {
            throw ApiException("Invalid RSVP status. Must be one of: ${validStatuses.joinToString(", ")}", HttpStatus.BAD_REQUEST)
        }

        // Validate event exists
        val event = scheduleEventRepository.findById(eventId)
            .orElseThrow { ApiException("Schedule event not found", HttpStatus.NOT_FOUND) }

        // Validate user exists
        val user = userRepository.findById(userId)
            .orElseThrow { ApiException("User not found", HttpStatus.NOT_FOUND) }

        // Validate user is registered for hackathon
        if (!hackathonService.isUserRegistered(event.hackathon.id!!, userId)) {
            throw ApiException("User must be registered for hackathon to RSVP", HttpStatus.FORBIDDEN)
        }

        // Create or update RSVP
        val attendee = eventAttendeeRepository.findByEventIdAndUserId(eventId, userId)
            ?: EventAttendee(event = event, user = user)

        attendee.rsvpStatus = rsvpStatus
        eventAttendeeRepository.save(attendee)

        // Return updated event with RSVP counts
        return getScheduleByHackathonWithRsvp(event.hackathon.id!!, userId)
            .first { it.id == eventId }
    }

    @Transactional
    fun removeRsvp(eventId: UUID, userId: UUID) {
        if (!scheduleEventRepository.existsById(eventId)) {
            throw ApiException("Schedule event not found", HttpStatus.NOT_FOUND)
        }

        eventAttendeeRepository.deleteByEventIdAndUserId(eventId, userId)
    }
}
