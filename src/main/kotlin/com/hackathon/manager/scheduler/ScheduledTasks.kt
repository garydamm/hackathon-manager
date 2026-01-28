package com.hackathon.manager.scheduler

import com.hackathon.manager.repository.PasswordResetTokenRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.OffsetDateTime

@Component
class ScheduledTasks(
    private val passwordResetTokenRepository: PasswordResetTokenRepository
) {
    private val logger = LoggerFactory.getLogger(ScheduledTasks::class.java)

    /**
     * Cleans up expired password reset tokens older than 7 days.
     * Runs daily at midnight.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    fun cleanupExpiredPasswordResetTokens() {
        val cutoffTime = OffsetDateTime.now().minusDays(7)
        val deletedCount = passwordResetTokenRepository.deleteByExpiresAtBefore(cutoffTime)
        logger.info("Cleaned up $deletedCount expired password reset tokens older than 7 days")
    }
}
