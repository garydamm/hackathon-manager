package com.hackathon.manager.service

import com.hackathon.manager.dto.HackathonSearchResult
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.exception.ValidationException
import com.hackathon.manager.repository.HackathonSearchRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import java.time.OffsetDateTime
import java.util.*

@ExtendWith(MockitoExtension::class)
class HackathonSearchServiceTest {

    @Mock
    lateinit var hackathonSearchRepository: HackathonSearchRepository

    @InjectMocks
    lateinit var hackathonSearchService: HackathonSearchService

    private fun createTestSearchResult(
        name: String = "Test Hackathon",
        status: HackathonStatus = HackathonStatus.registration_open,
        relevanceScore: Double? = null
    ) = HackathonSearchResult(
        id = UUID.randomUUID(),
        name = name,
        slug = "test-hackathon",
        description = "A test hackathon",
        status = status,
        location = "Virtual",
        isVirtual = true,
        timezone = "UTC",
        registrationOpensAt = OffsetDateTime.now().minusDays(1),
        registrationClosesAt = OffsetDateTime.now().plusDays(1),
        startsAt = OffsetDateTime.now().plusDays(7),
        endsAt = OffsetDateTime.now().plusDays(9),
        judgingStartsAt = null,
        judgingEndsAt = null,
        maxTeamSize = 5,
        minTeamSize = 1,
        maxParticipants = 100,
        participantCount = 50,
        bannerUrl = null,
        logoUrl = null,
        relevanceScore = relevanceScore
    )

    @Test
    fun `search with no parameters returns all results`() {
        val results = listOf(createTestSearchResult())
        val page = PageImpl(results, PageRequest.of(0, 20), 1)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )).thenReturn(page)

        val response = hackathonSearchService.search(
            query = null, timeFrame = null, startDate = null,
            endDate = null, status = null, page = 0, size = 20
        )

        assertThat(response.results).hasSize(1)
        assertThat(response.page).isEqualTo(0)
        assertThat(response.size).isEqualTo(20)
        assertThat(response.totalElements).isEqualTo(1)
        assertThat(response.totalPages).isEqualTo(1)
    }

    @Test
    fun `search with query passes query to repository`() {
        val results = listOf(createTestSearchResult(relevanceScore = 0.8))
        val page = PageImpl(results, PageRequest.of(0, 20), 1)

        whenever(hackathonSearchRepository.search(
            query = eq("hackathon"),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )).thenReturn(page)

        val response = hackathonSearchService.search(
            query = "hackathon", timeFrame = null, startDate = null,
            endDate = null, status = null, page = 0, size = 20
        )

        assertThat(response.results).hasSize(1)
        assertThat(response.results[0].relevanceScore).isEqualTo(0.8)
    }

    @Test
    fun `search with blank query treats as null`() {
        val page = PageImpl(emptyList<HackathonSearchResult>(), PageRequest.of(0, 20), 0)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )).thenReturn(page)

        hackathonSearchService.search(
            query = "   ", timeFrame = null, startDate = null,
            endDate = null, status = null, page = 0, size = 20
        )

        verify(hackathonSearchRepository).search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )
    }

    @Test
    fun `search with status passes parsed status to repository`() {
        val page = PageImpl(emptyList<HackathonSearchResult>(), PageRequest.of(0, 20), 0)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = eq(HackathonStatus.registration_open),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )).thenReturn(page)

        hackathonSearchService.search(
            query = null, timeFrame = null, startDate = null,
            endDate = null, status = "registration_open", page = 0, size = 20
        )

        verify(hackathonSearchRepository).search(
            query = isNull(),
            status = eq(HackathonStatus.registration_open),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )
    }

    @Test
    fun `search with timeFrame passes it to repository`() {
        val page = PageImpl(emptyList<HackathonSearchResult>(), PageRequest.of(0, 20), 0)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = isNull(),
            timeFrame = eq("upcoming"),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )).thenReturn(page)

        hackathonSearchService.search(
            query = null, timeFrame = "upcoming", startDate = null,
            endDate = null, status = null, page = 0, size = 20
        )

        verify(hackathonSearchRepository).search(
            query = isNull(),
            status = isNull(),
            timeFrame = eq("upcoming"),
            startDate = isNull(),
            endDate = isNull(),
            pageable = any()
        )
    }

    @Test
    fun `search with date range parses dates correctly`() {
        val page = PageImpl(emptyList<HackathonSearchResult>(), PageRequest.of(0, 20), 0)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = any(),
            endDate = any(),
            pageable = any()
        )).thenReturn(page)

        hackathonSearchService.search(
            query = null, timeFrame = null, startDate = "2024-01-15",
            endDate = "2024-06-30", status = null, page = 0, size = 20
        )

        verify(hackathonSearchRepository).search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = argThat<OffsetDateTime> { this.year == 2024 && this.monthValue == 1 && this.dayOfMonth == 15 },
            endDate = argThat<OffsetDateTime> { this.year == 2024 && this.monthValue == 6 && this.dayOfMonth == 30 },
            pageable = any()
        )
    }

    @Test
    fun `search with endDate only is allowed`() {
        val page = PageImpl(emptyList<HackathonSearchResult>(), PageRequest.of(0, 20), 0)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = any(),
            pageable = any()
        )).thenReturn(page)

        hackathonSearchService.search(
            query = null, timeFrame = null, startDate = null,
            endDate = "2024-06-30", status = null, page = 0, size = 20
        )

        verify(hackathonSearchRepository).search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = any(),
            pageable = any()
        )
    }

    @Test
    fun `search with custom pagination`() {
        val page = PageImpl(emptyList<HackathonSearchResult>(), PageRequest.of(2, 10), 25)

        whenever(hackathonSearchRepository.search(
            query = isNull(),
            status = isNull(),
            timeFrame = isNull(),
            startDate = isNull(),
            endDate = isNull(),
            pageable = eq(PageRequest.of(2, 10))
        )).thenReturn(page)

        val response = hackathonSearchService.search(
            query = null, timeFrame = null, startDate = null,
            endDate = null, status = null, page = 2, size = 10
        )

        assertThat(response.page).isEqualTo(2)
        assertThat(response.size).isEqualTo(10)
        assertThat(response.totalElements).isEqualTo(25)
        assertThat(response.totalPages).isEqualTo(3)
    }

    @Test
    fun `search throws ValidationException when size exceeds max`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = null, startDate = null,
                endDate = null, status = null, page = 0, size = 101
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("must not exceed 100")
    }

    @Test
    fun `search throws ValidationException when size is less than 1`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = null, startDate = null,
                endDate = null, status = null, page = 0, size = 0
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("at least 1")
    }

    @Test
    fun `search throws ValidationException for negative page`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = null, startDate = null,
                endDate = null, status = null, page = -1, size = 20
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("not be negative")
    }

    @Test
    fun `search throws ValidationException for invalid timeFrame`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = "invalid", startDate = null,
                endDate = null, status = null, page = 0, size = 20
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("Invalid timeFrame")
    }

    @Test
    fun `search throws ValidationException for invalid status`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = null, startDate = null,
                endDate = null, status = "invalid_status", page = 0, size = 20
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("Invalid status")
    }

    @Test
    fun `search throws ValidationException for invalid date format`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = null, startDate = "not-a-date",
                endDate = null, status = null, page = 0, size = 20
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("Invalid startDate format")
    }

    @Test
    fun `search throws ValidationException for invalid endDate format`() {
        assertThatThrownBy {
            hackathonSearchService.search(
                query = null, timeFrame = null, startDate = null,
                endDate = "bad-date", status = null, page = 0, size = 20
            )
        }.isInstanceOf(ValidationException::class.java)
            .hasMessageContaining("Invalid endDate format")
    }
}
