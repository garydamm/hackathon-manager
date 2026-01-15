package com.hackathon.manager.repository

import com.hackathon.manager.entity.Announcement
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface AnnouncementRepository : JpaRepository<Announcement, UUID> {
    fun findByHackathonIdOrderByIsPinnedDescPublishedAtDesc(hackathonId: UUID): List<Announcement>
}
