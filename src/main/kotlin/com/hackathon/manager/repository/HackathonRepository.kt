package com.hackathon.manager.repository

import com.hackathon.manager.entity.Hackathon
import com.hackathon.manager.entity.enums.HackathonStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface HackathonRepository : JpaRepository<Hackathon, UUID> {
    fun findBySlug(slug: String): Hackathon?
    fun existsBySlug(slug: String): Boolean
    fun findByStatusIn(statuses: List<HackathonStatus>): List<Hackathon>

    @Query("SELECT h FROM Hackathon h WHERE h.status IN :statuses ORDER BY h.startsAt DESC")
    fun findActiveHackathons(statuses: List<HackathonStatus> = listOf(
        HackathonStatus.registration_open,
        HackathonStatus.registration_closed,
        HackathonStatus.in_progress,
        HackathonStatus.judging
    )): List<Hackathon>
}
