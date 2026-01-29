package com.hackathon.manager.scheduler

import com.hackathon.manager.repository.PasswordResetTokenRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*
import java.time.OffsetDateTime

@ExtendWith(MockitoExtension::class)
class ScheduledTasksTest {

    @Mock
    private lateinit var mockPasswordResetTokenRepository: PasswordResetTokenRepository

    private lateinit var scheduledTasks: ScheduledTasks

    @BeforeEach
    fun setUp() {
        scheduledTasks = ScheduledTasks(mockPasswordResetTokenRepository)
    }

    @Test
    fun `cleanupExpiredPasswordResetTokens should delete expired tokens older than 7 days`() {
        // Given
        val expectedDeletedCount = 5
        whenever(mockPasswordResetTokenRepository.deleteByExpiresAtBefore(any())).thenReturn(expectedDeletedCount)

        // When
        scheduledTasks.cleanupExpiredPasswordResetTokens()

        // Then
        verify(mockPasswordResetTokenRepository).deleteByExpiresAtBefore(argThat { cutoffTime ->
            // Verify the cutoff time is approximately 7 days ago (allow 1 minute tolerance)
            val expectedCutoffTime = OffsetDateTime.now().minusDays(7)
            cutoffTime.isAfter(expectedCutoffTime.minusMinutes(1)) &&
                cutoffTime.isBefore(expectedCutoffTime.plusMinutes(1))
        })
    }

    @Test
    fun `cleanupExpiredPasswordResetTokens should handle no expired tokens`() {
        // Given
        whenever(mockPasswordResetTokenRepository.deleteByExpiresAtBefore(any())).thenReturn(0)

        // When
        scheduledTasks.cleanupExpiredPasswordResetTokens()

        // Then
        verify(mockPasswordResetTokenRepository).deleteByExpiresAtBefore(any())
        // No exception should be thrown, and the method should complete successfully
    }

    @Test
    fun `cleanupExpiredPasswordResetTokens should handle single expired token`() {
        // Given
        val expectedDeletedCount = 1
        whenever(mockPasswordResetTokenRepository.deleteByExpiresAtBefore(any())).thenReturn(expectedDeletedCount)

        // When
        scheduledTasks.cleanupExpiredPasswordResetTokens()

        // Then
        verify(mockPasswordResetTokenRepository).deleteByExpiresAtBefore(argThat { cutoffTime ->
            cutoffTime != null
        })
    }

    @Test
    fun `cleanupExpiredPasswordResetTokens should handle batch deletion of multiple expired tokens`() {
        // Given
        val expectedDeletedCount = 100
        whenever(mockPasswordResetTokenRepository.deleteByExpiresAtBefore(any())).thenReturn(expectedDeletedCount)

        // When
        scheduledTasks.cleanupExpiredPasswordResetTokens()

        // Then
        verify(mockPasswordResetTokenRepository).deleteByExpiresAtBefore(argThat { cutoffTime ->
            // Verify the cutoff time calculation is correct
            val expectedCutoffTime = OffsetDateTime.now().minusDays(7)
            cutoffTime.isAfter(expectedCutoffTime.minusMinutes(1)) &&
                cutoffTime.isBefore(expectedCutoffTime.plusMinutes(1))
        })
    }

    @Test
    fun `cleanupExpiredPasswordResetTokens should call repository method exactly once`() {
        // Given
        whenever(mockPasswordResetTokenRepository.deleteByExpiresAtBefore(any())).thenReturn(3)

        // When
        scheduledTasks.cleanupExpiredPasswordResetTokens()

        // Then
        verify(mockPasswordResetTokenRepository, times(1)).deleteByExpiresAtBefore(any())
        verifyNoMoreInteractions(mockPasswordResetTokenRepository)
    }

    @Test
    fun `cleanupExpiredPasswordResetTokens should use correct cutoff time calculation`() {
        // Given
        val testStartTime = OffsetDateTime.now()
        whenever(mockPasswordResetTokenRepository.deleteByExpiresAtBefore(any())).thenReturn(10)

        // When
        scheduledTasks.cleanupExpiredPasswordResetTokens()

        // Then
        verify(mockPasswordResetTokenRepository).deleteByExpiresAtBefore(argThat { cutoffTime ->
            val testEndTime = OffsetDateTime.now()

            // The cutoff time should be approximately 7 days before the test execution time
            val expectedMinCutoffTime = testStartTime.minusDays(7).minusMinutes(1)
            val expectedMaxCutoffTime = testEndTime.minusDays(7).plusMinutes(1)

            cutoffTime.isAfter(expectedMinCutoffTime) &&
                cutoffTime.isBefore(expectedMaxCutoffTime)
        })
    }
}
