package com.hackathon.manager.dto

import com.hackathon.manager.entity.enums.HackathonStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.OffsetDateTime
import java.util.*

class HackathonSearchDtosTest {

    @Test
    fun `HackathonSearchResult should contain all public fields`() {
        val id = UUID.randomUUID()
        val now = OffsetDateTime.now()

        val result = HackathonSearchResult(
            id = id,
            name = "Test Hackathon",
            slug = "test-hackathon",
            description = "A test description",
            status = HackathonStatus.registration_open,
            location = "San Francisco",
            isVirtual = false,
            timezone = "America/Los_Angeles",
            registrationOpensAt = now.minusDays(1),
            registrationClosesAt = now.plusDays(1),
            startsAt = now.plusDays(2),
            endsAt = now.plusDays(4),
            judgingStartsAt = now.plusDays(4),
            judgingEndsAt = now.plusDays(5),
            maxTeamSize = 5,
            minTeamSize = 2,
            maxParticipants = 100,
            participantCount = 42,
            bannerUrl = "https://example.com/banner.png",
            logoUrl = "https://example.com/logo.png",
            relevanceScore = 0.85
        )

        assertThat(result.id).isEqualTo(id)
        assertThat(result.name).isEqualTo("Test Hackathon")
        assertThat(result.slug).isEqualTo("test-hackathon")
        assertThat(result.description).isEqualTo("A test description")
        assertThat(result.status).isEqualTo(HackathonStatus.registration_open)
        assertThat(result.location).isEqualTo("San Francisco")
        assertThat(result.isVirtual).isFalse()
        assertThat(result.timezone).isEqualTo("America/Los_Angeles")
        assertThat(result.registrationOpensAt).isEqualTo(now.minusDays(1))
        assertThat(result.registrationClosesAt).isEqualTo(now.plusDays(1))
        assertThat(result.startsAt).isEqualTo(now.plusDays(2))
        assertThat(result.endsAt).isEqualTo(now.plusDays(4))
        assertThat(result.judgingStartsAt).isEqualTo(now.plusDays(4))
        assertThat(result.judgingEndsAt).isEqualTo(now.plusDays(5))
        assertThat(result.maxTeamSize).isEqualTo(5)
        assertThat(result.minTeamSize).isEqualTo(2)
        assertThat(result.maxParticipants).isEqualTo(100)
        assertThat(result.participantCount).isEqualTo(42)
        assertThat(result.bannerUrl).isEqualTo("https://example.com/banner.png")
        assertThat(result.logoUrl).isEqualTo("https://example.com/logo.png")
        assertThat(result.relevanceScore).isEqualTo(0.85)
    }

    @Test
    fun `HackathonSearchResult should handle nullable fields`() {
        val result = HackathonSearchResult(
            id = UUID.randomUUID(),
            name = "Minimal Hackathon",
            slug = "minimal-hackathon",
            description = null,
            status = HackathonStatus.in_progress,
            location = null,
            isVirtual = true,
            timezone = "UTC",
            registrationOpensAt = null,
            registrationClosesAt = null,
            startsAt = OffsetDateTime.now(),
            endsAt = OffsetDateTime.now().plusDays(1),
            judgingStartsAt = null,
            judgingEndsAt = null,
            maxTeamSize = 5,
            minTeamSize = 1,
            maxParticipants = null,
            participantCount = 0,
            bannerUrl = null,
            logoUrl = null,
            relevanceScore = null
        )

        assertThat(result.description).isNull()
        assertThat(result.location).isNull()
        assertThat(result.registrationOpensAt).isNull()
        assertThat(result.registrationClosesAt).isNull()
        assertThat(result.judgingStartsAt).isNull()
        assertThat(result.judgingEndsAt).isNull()
        assertThat(result.maxParticipants).isNull()
        assertThat(result.bannerUrl).isNull()
        assertThat(result.logoUrl).isNull()
        assertThat(result.relevanceScore).isNull()
        assertThat(result.participantCount).isEqualTo(0)
    }

    @Test
    fun `HackathonSearchResult should not contain createdBy or userRole fields`() {
        val fields = HackathonSearchResult::class.java.declaredFields.map { it.name }

        assertThat(fields).doesNotContain("createdBy")
        assertThat(fields).doesNotContain("userRole")
        assertThat(fields).doesNotContain("createdAt")
        assertThat(fields).doesNotContain("updatedAt")
        assertThat(fields).doesNotContain("rules")
        assertThat(fields).doesNotContain("archived")
    }

    @Test
    fun `HackathonSearchResponse should wrap results with pagination`() {
        val result1 = HackathonSearchResult(
            id = UUID.randomUUID(),
            name = "Hackathon 1",
            slug = "hackathon-1",
            description = null,
            status = HackathonStatus.registration_open,
            location = null,
            isVirtual = true,
            timezone = "UTC",
            registrationOpensAt = null,
            registrationClosesAt = null,
            startsAt = OffsetDateTime.now(),
            endsAt = OffsetDateTime.now().plusDays(1),
            judgingStartsAt = null,
            judgingEndsAt = null,
            maxTeamSize = 5,
            minTeamSize = 1,
            maxParticipants = null,
            participantCount = 10,
            bannerUrl = null,
            logoUrl = null,
            relevanceScore = 0.9
        )

        val response = HackathonSearchResponse(
            results = listOf(result1),
            page = 0,
            size = 20,
            totalElements = 1,
            totalPages = 1
        )

        assertThat(response.results).hasSize(1)
        assertThat(response.results[0].name).isEqualTo("Hackathon 1")
        assertThat(response.page).isEqualTo(0)
        assertThat(response.size).isEqualTo(20)
        assertThat(response.totalElements).isEqualTo(1)
        assertThat(response.totalPages).isEqualTo(1)
    }

    @Test
    fun `HackathonSearchResponse should handle empty results`() {
        val response = HackathonSearchResponse(
            results = emptyList(),
            page = 0,
            size = 20,
            totalElements = 0,
            totalPages = 0
        )

        assertThat(response.results).isEmpty()
        assertThat(response.totalElements).isEqualTo(0)
        assertThat(response.totalPages).isEqualTo(0)
    }
}
