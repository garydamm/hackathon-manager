package com.hackathon.manager.dto

import com.hackathon.manager.entity.EventAttendee
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import java.time.OffsetDateTime
import java.util.*

data class EventAttendeeResponse(
    val id: UUID,
    val eventId: UUID,
    val userId: UUID,
    val userFirstName: String,
    val userLastName: String,
    val userEmail: String,
    val rsvpStatus: String,
    val attended: Boolean,
    val createdAt: OffsetDateTime?
) {
    companion object {
        fun fromEntity(attendee: EventAttendee): EventAttendeeResponse {
            return EventAttendeeResponse(
                id = attendee.id!!,
                eventId = attendee.event.id!!,
                userId = attendee.user.id!!,
                userFirstName = attendee.user.firstName,
                userLastName = attendee.user.lastName,
                userEmail = attendee.user.email,
                rsvpStatus = attendee.rsvpStatus,
                attended = attendee.attended,
                createdAt = attendee.createdAt
            )
        }
    }
}

data class RsvpRequest(
    @field:NotBlank(message = "RSVP status is required")
    @field:Pattern(
        regexp = "^(attending|maybe|not_attending)$",
        message = "RSVP status must be one of: attending, maybe, not_attending"
    )
    val rsvpStatus: String
)

data class MarkAttendanceRequest(
    @field:NotNull(message = "User ID is required")
    val userId: UUID,

    @field:NotNull(message = "Attended status is required")
    val attended: Boolean
)

data class BulkMarkAttendanceRequest(
    @field:NotNull(message = "User IDs list is required")
    val userIds: List<UUID>,

    @field:NotNull(message = "Attended status is required")
    val attended: Boolean
)
