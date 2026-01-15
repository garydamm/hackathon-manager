package com.hackathon.manager.dto

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.enums.HackathonStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.*

data class HackathonResponse(
    val id: UUID,
    val name: String,
    val slug: String,
    val description: String?,
    val rules: String?,
    val status: HackathonStatus,
    val bannerUrl: String?,
    val logoUrl: String?,
    val location: String?,
    val isVirtual: Boolean,
    val timezone: String,
    val registrationOpensAt: OffsetDateTime?,
    val registrationClosesAt: OffsetDateTime?,
    val startsAt: OffsetDateTime,
    val endsAt: OffsetDateTime,
    val judgingStartsAt: OffsetDateTime?,
    val judgingEndsAt: OffsetDateTime?,
    val maxTeamSize: Int,
    val minTeamSize: Int,
    val maxParticipants: Int?,
    val participantCount: Int?,
    val createdAt: OffsetDateTime?
) {
    companion object {
        fun fromEntity(hackathon: Hackathon, participantCount: Int? = null): HackathonResponse {
            return HackathonResponse(
                id = hackathon.id!!,
                name = hackathon.name,
                slug = hackathon.slug,
                description = hackathon.description,
                rules = hackathon.rules,
                status = hackathon.status,
                bannerUrl = hackathon.bannerUrl,
                logoUrl = hackathon.logoUrl,
                location = hackathon.location,
                isVirtual = hackathon.isVirtual,
                timezone = hackathon.timezone,
                registrationOpensAt = hackathon.registrationOpensAt,
                registrationClosesAt = hackathon.registrationClosesAt,
                startsAt = hackathon.startsAt,
                endsAt = hackathon.endsAt,
                judgingStartsAt = hackathon.judgingStartsAt,
                judgingEndsAt = hackathon.judgingEndsAt,
                maxTeamSize = hackathon.maxTeamSize,
                minTeamSize = hackathon.minTeamSize,
                maxParticipants = hackathon.maxParticipants,
                participantCount = participantCount,
                createdAt = hackathon.createdAt
            )
        }
    }
}

data class CreateHackathonRequest(
    @field:NotBlank(message = "Name is required")
    val name: String,

    @field:NotBlank(message = "Slug is required")
    val slug: String,

    val description: String? = null,
    val rules: String? = null,
    val bannerUrl: String? = null,
    val logoUrl: String? = null,
    val location: String? = null,
    val isVirtual: Boolean = false,
    val timezone: String = "UTC",
    val registrationOpensAt: OffsetDateTime? = null,
    val registrationClosesAt: OffsetDateTime? = null,

    @field:NotNull(message = "Start date is required")
    val startsAt: OffsetDateTime,

    @field:NotNull(message = "End date is required")
    val endsAt: OffsetDateTime,

    val judgingStartsAt: OffsetDateTime? = null,
    val judgingEndsAt: OffsetDateTime? = null,
    val maxTeamSize: Int = 5,
    val minTeamSize: Int = 1,
    val maxParticipants: Int? = null
)

data class UpdateHackathonRequest(
    val name: String? = null,
    val description: String? = null,
    val rules: String? = null,
    val status: HackathonStatus? = null,
    val bannerUrl: String? = null,
    val logoUrl: String? = null,
    val location: String? = null,
    val isVirtual: Boolean? = null,
    val timezone: String? = null,
    val registrationOpensAt: OffsetDateTime? = null,
    val registrationClosesAt: OffsetDateTime? = null,
    val startsAt: OffsetDateTime? = null,
    val endsAt: OffsetDateTime? = null,
    val judgingStartsAt: OffsetDateTime? = null,
    val judgingEndsAt: OffsetDateTime? = null,
    val maxTeamSize: Int? = null,
    val minTeamSize: Int? = null,
    val maxParticipants: Int? = null
)
