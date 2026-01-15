package com.hackathon.manager.repository

import com.hackathon.manager.entity.Prize
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface PrizeRepository : JpaRepository<Prize, UUID> {
    fun findByHackathonIdOrderByDisplayOrder(hackathonId: UUID): List<Prize>
    fun findByTrackId(trackId: UUID): List<Prize>
}
