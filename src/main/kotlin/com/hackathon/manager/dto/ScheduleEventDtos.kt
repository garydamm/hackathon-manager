package com.hackathon.manager.dto

import com.hackathon.manager.entity.EventAttendee
import com.hackathon.manager.entity.ScheduleEvent
import com.hackathon.manager.entity.enums.EventType
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.*

data class ScheduleEventResponse(
    val id: UUID,
    val hackathonId: UUID,
    val name: String,
    val description: String?,
    val eventType: EventType,
    val location: String?,
    val virtualLink: String?,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val isMandatory: Boolean,
    val attendingCount: Int = 0,
    val maybeCount: Int = 0,
    val notAttendingCount: Int = 0,
    val userRsvpStatus: String? = null,
    val userAttended: Boolean? = null
) {
    companion object {
        fun fromEntity(
            event: ScheduleEvent,
            attendingCount: Int = 0,
            maybeCount: Int = 0,
            notAttendingCount: Int = 0,
            userAttendee: EventAttendee? = null
        ): ScheduleEventResponse {
            return ScheduleEventResponse(
                id = event.id!!,
                hackathonId = event.hackathon.id!!,
                name = event.name,
                description = event.description,
                eventType = event.eventType,
                location = event.location,
                virtualLink = event.virtualLink,
                startsAt = event.startsAt,
                endsAt = event.endsAt,
                isMandatory = event.isMandatory,
                attendingCount = attendingCount,
                maybeCount = maybeCount,
                notAttendingCount = notAttendingCount,
                userRsvpStatus = userAttendee?.rsvpStatus,
                userAttended = userAttendee?.attended
            )
        }
    }
}

data class CreateScheduleEventRequest(
    @field:NotNull(message = "Hackathon ID is required")
    val hackathonId: UUID,

    @field:NotBlank(message = "Name is required")
    val name: String,

    val description: String? = null,
    val eventType: EventType = EventType.other,
    val location: String? = null,
    val virtualLink: String? = null,

    @field:NotNull(message = "Start time is required")
    val startsAt: OffsetDateTime,

    @field:NotNull(message = "End time is required")
    val endsAt: OffsetDateTime,

    val isMandatory: Boolean = false
)

data class UpdateScheduleEventRequest(
    val name: String? = null,
    val description: String? = null,
    val eventType: EventType? = null,
    val location: String? = null,
    val virtualLink: String? = null,
    val startsAt: OffsetDateTime? = null,
    val endsAt: OffsetDateTime? = null,
    val isMandatory: Boolean? = null
)
