package com.hackathon.manager.service

import com.hackathon.manager.dto.HackathonSearchResponse
import com.hackathon.manager.dto.HackathonSearchResult
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.exception.ValidationException
import com.hackathon.manager.repository.HackathonSearchRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class HackathonSearchService(
    private val hackathonSearchRepository: HackathonSearchRepository
) {

    companion object {
        const val MAX_PAGE_SIZE = 100
        const val DEFAULT_PAGE_SIZE = 20

        private val VALID_TIME_FRAMES = setOf("upcoming", "ongoing", "past")
        private val VALID_STATUSES = setOf(
            "registration_open", "registration_closed", "in_progress",
            "judging", "completed", "cancelled"
        )
    }

    @Transactional(readOnly = true)
    fun search(
        query: String?,
        timeFrame: String?,
        startDate: String?,
        endDate: String?,
        status: String?,
        page: Int,
        size: Int
    ): HackathonSearchResponse {
        // Validate size
        if (size > MAX_PAGE_SIZE) {
            throw ValidationException("Page size must not exceed $MAX_PAGE_SIZE")
        }
        if (size < 1) {
            throw ValidationException("Page size must be at least 1")
        }
        if (page < 0) {
            throw ValidationException("Page number must not be negative")
        }

        // Validate timeFrame
        if (timeFrame != null && timeFrame !in VALID_TIME_FRAMES) {
            throw ValidationException("Invalid timeFrame: $timeFrame. Must be one of: ${VALID_TIME_FRAMES.joinToString(", ")}")
        }

        // Validate status
        val hackathonStatus = if (status != null) {
            if (status !in VALID_STATUSES) {
                throw ValidationException("Invalid status: $status. Must be one of: ${VALID_STATUSES.joinToString(", ")}")
            }
            HackathonStatus.valueOf(status)
        } else {
            null
        }

        // Parse and validate dates
        val parsedStartDate = parseDate(startDate, "startDate")
        val parsedEndDate = parseDate(endDate, "endDate")

        val pageable = PageRequest.of(page, size)

        val results: Page<HackathonSearchResult> = hackathonSearchRepository.search(
            query = query?.takeIf { it.isNotBlank() },
            status = hackathonStatus,
            timeFrame = timeFrame,
            startDate = parsedStartDate,
            endDate = parsedEndDate,
            pageable = pageable
        )

        return HackathonSearchResponse(
            results = results.content,
            page = results.number,
            size = results.size,
            totalElements = results.totalElements,
            totalPages = results.totalPages
        )
    }

    private fun parseDate(dateStr: String?, fieldName: String): OffsetDateTime? {
        if (dateStr.isNullOrBlank()) return null
        return try {
            val localDate = LocalDate.parse(dateStr)
            localDate.atStartOfDay().atOffset(ZoneOffset.UTC)
        } catch (e: Exception) {
            throw ValidationException("Invalid $fieldName format. Expected ISO date (e.g., 2024-01-15)")
        }
    }
}
