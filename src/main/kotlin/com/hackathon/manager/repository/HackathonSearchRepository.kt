package com.hackathon.manager.repository

import com.hackathon.manager.dto.HackathonSearchResult
import com.hackathon.manager.entity.enums.HackathonStatus
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Repository
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Repository
class HackathonSearchRepository(
    @PersistenceContext private val entityManager: EntityManager
) {

    fun search(
        query: String?,
        status: HackathonStatus?,
        timeFrame: String?,
        startDate: OffsetDateTime?,
        endDate: OffsetDateTime?,
        pageable: Pageable
    ): Page<HackathonSearchResult> {
        val conditions = mutableListOf<String>()
        val params = mutableMapOf<String, Any>()

        // Always exclude archived and draft hackathons
        conditions.add("h.archived = false")
        conditions.add("h.status != 'draft'")

        // Full-text search
        if (!query.isNullOrBlank()) {
            conditions.add("h.search_vector @@ plainto_tsquery('english', :query)")
            params["query"] = query
        }

        // Status filter
        if (status != null) {
            conditions.add("CAST(h.status AS text) = :status")
            params["status"] = status.name
        }

        // Time frame filter
        when (timeFrame) {
            "upcoming" -> conditions.add("h.starts_at > NOW()")
            "ongoing" -> {
                conditions.add("h.starts_at <= NOW()")
                conditions.add("h.ends_at >= NOW()")
            }
            "past" -> conditions.add("h.ends_at < NOW()")
        }

        // Custom date range filters
        if (startDate != null) {
            conditions.add("h.starts_at >= :startDate")
            params["startDate"] = startDate
        }
        if (endDate != null) {
            conditions.add("h.ends_at <= :endDate")
            params["endDate"] = endDate
        }

        val whereClause = conditions.joinToString(" AND ")

        val relevanceSelect = if (!query.isNullOrBlank()) {
            "ts_rank(h.search_vector, plainto_tsquery('english', :query)) AS relevance_score"
        } else {
            "CAST(NULL AS float) AS relevance_score"
        }

        val orderBy = if (!query.isNullOrBlank()) {
            "ORDER BY relevance_score DESC"
        } else {
            "ORDER BY h.starts_at DESC"
        }

        val selectSql = """
            SELECT h.id, h.name, h.slug, h.description, CAST(h.status AS text),
                   h.location, h.is_virtual, h.timezone,
                   h.registration_opens_at, h.registration_closes_at,
                   h.starts_at, h.ends_at,
                   h.judging_starts_at, h.judging_ends_at,
                   h.max_team_size, h.min_team_size, h.max_participants,
                   COALESCE((SELECT COUNT(*) FROM hackathon_users hu WHERE hu.hackathon_id = h.id), 0) AS participant_count,
                   h.banner_url, h.logo_url,
                   $relevanceSelect
            FROM hackathons h
            WHERE $whereClause
            $orderBy
        """.trimIndent()

        val countSql = """
            SELECT COUNT(*)
            FROM hackathons h
            WHERE $whereClause
        """.trimIndent()

        // Execute count query
        val countQuery = entityManager.createNativeQuery(countSql)
        params.forEach { (key, value) -> countQuery.setParameter(key, value) }
        val totalElements = (countQuery.singleResult as Number).toLong()

        // Execute main query with pagination
        val dataQuery = entityManager.createNativeQuery(selectSql)
        params.forEach { (key, value) -> dataQuery.setParameter(key, value) }
        dataQuery.firstResult = pageable.offset.toInt()
        dataQuery.maxResults = pageable.pageSize

        @Suppress("UNCHECKED_CAST")
        val rows = dataQuery.resultList as List<Array<Any?>>

        val results = rows.map { row ->
            HackathonSearchResult(
                id = row[0] as java.util.UUID,
                name = row[1] as String,
                slug = row[2] as String,
                description = row[3] as String?,
                status = HackathonStatus.valueOf(row[4] as String),
                location = row[5] as String?,
                isVirtual = row[6] as Boolean,
                timezone = row[7] as String,
                registrationOpensAt = toOffsetDateTime(row[8]),
                registrationClosesAt = toOffsetDateTime(row[9]),
                startsAt = toOffsetDateTime(row[10])!!,
                endsAt = toOffsetDateTime(row[11])!!,
                judgingStartsAt = toOffsetDateTime(row[12]),
                judgingEndsAt = toOffsetDateTime(row[13]),
                maxTeamSize = (row[14] as Number).toInt(),
                minTeamSize = (row[15] as Number).toInt(),
                maxParticipants = (row[16] as Number?)?.toInt(),
                participantCount = (row[17] as Number).toLong(),
                bannerUrl = row[18] as String?,
                logoUrl = row[19] as String?,
                relevanceScore = (row[20] as Number?)?.toDouble()
            )
        }

        return PageImpl(results, pageable, totalElements)
    }

    private fun toOffsetDateTime(value: Any?): OffsetDateTime? {
        return when (value) {
            null -> null
            is OffsetDateTime -> value
            is Instant -> value.atOffset(ZoneOffset.UTC)
            else -> throw IllegalArgumentException("Cannot convert ${value::class.java} to OffsetDateTime")
        }
    }
}
