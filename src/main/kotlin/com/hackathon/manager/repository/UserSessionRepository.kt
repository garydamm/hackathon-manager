package com.hackathon.manager.repository

import com.hackathon.manager.entity.UserSession
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserSessionRepository : JpaRepository<UserSession, UUID> {
    fun findByRefreshTokenHash(refreshTokenHash: String): Optional<UserSession>
    fun findByUserId(userId: UUID): List<UserSession>
}
