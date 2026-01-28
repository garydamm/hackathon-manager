package com.hackathon.manager.repository

import com.hackathon.manager.entity.PasswordResetToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime
import java.util.Optional
import java.util.UUID

@Repository
interface PasswordResetTokenRepository : JpaRepository<PasswordResetToken, UUID> {
    fun findByToken(token: String): Optional<PasswordResetToken>

    fun findByUserIdAndUsedAtIsNullAndExpiresAtAfter(
        userId: UUID,
        currentTime: OffsetDateTime
    ): List<PasswordResetToken>

    fun deleteByExpiresAtBefore(cutoffTime: OffsetDateTime): Int
}
