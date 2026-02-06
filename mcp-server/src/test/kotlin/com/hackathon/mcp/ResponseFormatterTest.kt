package com.hackathon.mcp

import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertTrue

class ResponseFormatterTest {

    @Test
    fun `formats empty results`() {
        val response = HackathonSearchResponse(
            results = emptyList(),
            page = 0,
            size = 20,
            totalElements = 0,
            totalPages = 0
        )

        val formatted = ResponseFormatter.formatSearchResponse(response)

        assertContains(formatted, "No hackathons found")
        assertContains(formatted, "Page 1 of 0")
        assertContains(formatted, "0 total results")
    }

    @Test
    fun `formats single result with all fields`() {
        val hackathon = HackathonSearchResult(
            id = "abc-123",
            name = "AI Hackathon 2025",
            slug = "ai-hackathon-2025",
            description = "Build cool AI stuff",
            status = "registration_open",
            location = "San Francisco",
            isVirtual = false,
            timezone = "America/Los_Angeles",
            registrationOpensAt = "2025-01-01T00:00:00Z",
            registrationClosesAt = "2025-01-15T00:00:00Z",
            startsAt = "2025-02-01T09:00:00Z",
            endsAt = "2025-02-03T18:00:00Z",
            judgingStartsAt = "2025-02-03T18:00:00Z",
            judgingEndsAt = "2025-02-04T18:00:00Z",
            maxTeamSize = 5,
            minTeamSize = 1,
            maxParticipants = 200,
            participantCount = 42,
            bannerUrl = null,
            logoUrl = null,
            relevanceScore = 0.95
        )

        val response = HackathonSearchResponse(
            results = listOf(hackathon),
            page = 0,
            size = 20,
            totalElements = 1,
            totalPages = 1
        )

        val formatted = ResponseFormatter.formatSearchResponse(response)

        assertContains(formatted, "Found 1 hackathon(s)")
        assertContains(formatted, "## AI Hackathon 2025")
        assertContains(formatted, "Status: registration_open")
        assertContains(formatted, "2025-02-01T09:00:00Z")
        assertContains(formatted, "2025-02-03T18:00:00Z")
        assertContains(formatted, "Location: San Francisco")
        assertContains(formatted, "Participants: 42 / 200")
        assertContains(formatted, "Team size: 1 - 5")
        assertContains(formatted, "Description: Build cool AI stuff")
        assertContains(formatted, "Page 1 of 1")
    }

    @Test
    fun `formats virtual hackathon with no location`() {
        val hackathon = createMinimalHackathon(
            location = null,
            isVirtual = true
        )

        val formatted = ResponseFormatter.formatHackathon(hackathon)

        assertContains(formatted, "Location: Virtual")
    }

    @Test
    fun `formats hackathon with location and virtual flag`() {
        val hackathon = createMinimalHackathon(
            location = "New York",
            isVirtual = true
        )

        val formatted = ResponseFormatter.formatHackathon(hackathon)

        assertContains(formatted, "Location: New York (Virtual)")
    }

    @Test
    fun `formats hackathon without max participants`() {
        val hackathon = createMinimalHackathon(
            maxParticipants = null,
            participantCount = 10
        )

        val formatted = ResponseFormatter.formatHackathon(hackathon)

        assertContains(formatted, "Participants: 10")
        assertTrue(!formatted.contains("Participants: 10 /"))
    }

    @Test
    fun `truncates long descriptions`() {
        val longDescription = "A".repeat(300)
        val hackathon = createMinimalHackathon(description = longDescription)

        val formatted = ResponseFormatter.formatHackathon(hackathon)

        assertContains(formatted, "A".repeat(200) + "...")
    }

    @Test
    fun `formats pagination for multiple pages`() {
        val response = HackathonSearchResponse(
            results = listOf(createMinimalHackathon()),
            page = 2,
            size = 10,
            totalElements = 35,
            totalPages = 4
        )

        val formatted = ResponseFormatter.formatSearchResponse(response)

        assertContains(formatted, "Page 3 of 4")
        assertContains(formatted, "35 total results")
    }

    private fun createMinimalHackathon(
        name: String = "Test Hackathon",
        description: String? = null,
        location: String? = null,
        isVirtual: Boolean = false,
        maxParticipants: Int? = null,
        participantCount: Long = 0
    ) = HackathonSearchResult(
        id = "test-id",
        name = name,
        slug = "test-hackathon",
        description = description,
        status = "registration_open",
        location = location,
        isVirtual = isVirtual,
        timezone = "UTC",
        registrationOpensAt = null,
        registrationClosesAt = null,
        startsAt = "2025-01-01T00:00:00Z",
        endsAt = "2025-01-02T00:00:00Z",
        judgingStartsAt = null,
        judgingEndsAt = null,
        maxTeamSize = 5,
        minTeamSize = 1,
        maxParticipants = maxParticipants,
        participantCount = participantCount,
        bannerUrl = null,
        logoUrl = null,
        relevanceScore = null
    )
}
