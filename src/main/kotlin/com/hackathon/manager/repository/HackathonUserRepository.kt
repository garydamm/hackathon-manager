package com.hackathon.manager.repository

import com.hackathon.manager.entity.HackathonUser
import com.hackathon.manager.entity.enums.UserRole
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface HackathonUserRepository : JpaRepository<HackathonUser, UUID> {
    fun findByHackathonIdAndUserId(hackathonId: UUID, userId: UUID): HackathonUser?
    fun existsByHackathonIdAndUserId(hackathonId: UUID, userId: UUID): Boolean
    fun findByHackathonId(hackathonId: UUID): List<HackathonUser>
    fun findByUserId(userId: UUID): List<HackathonUser>
    fun findByHackathonIdAndRole(hackathonId: UUID, role: UserRole): List<HackathonUser>

    @Query("SELECT hu.role FROM HackathonUser hu WHERE hu.hackathon.id = :hackathonId AND hu.user.id = :userId")
    fun findRoleByHackathonIdAndUserId(hackathonId: UUID, userId: UUID): UserRole?
}
