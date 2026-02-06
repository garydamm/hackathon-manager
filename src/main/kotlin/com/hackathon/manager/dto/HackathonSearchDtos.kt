package com.hackathon.manager.dto

import com.hackathon.manager.entity.enums.HackathonStatus
import java.time.OffsetDateTime
import java.util.*

data class HackathonSearchResult(
    val id: UUID,
    val name: String,
    val slug: String,
    val description: String?,
    val status: HackathonStatus,
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
    val participantCount: Long,
    val bannerUrl: String?,
    val logoUrl: String?,
    val relevanceScore: Double?
)

data class HackathonSearchResponse(
    val results: List<HackathonSearchResult>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int
)
