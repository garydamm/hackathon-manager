package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateScheduleEventRequest
import com.hackathon.manager.dto.ScheduleEventResponse
import com.hackathon.manager.dto.UpdateScheduleEventRequest
import com.hackathon.manager.entity.ScheduleEvent
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.ScheduleEventRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class ScheduleService(
    private val scheduleEventRepository: ScheduleEventRepository,
    private val hackathonRepository: HackathonRepository
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
}
