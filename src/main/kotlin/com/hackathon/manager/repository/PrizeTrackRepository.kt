package com.hackathon.manager.repository

import com.hackathon.manager.entity.PrizeTrack
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface PrizeTrackRepository : JpaRepository<PrizeTrack, UUID> {
    fun findByHackathonIdOrderByDisplayOrder(hackathonId: UUID): List<PrizeTrack>
}
