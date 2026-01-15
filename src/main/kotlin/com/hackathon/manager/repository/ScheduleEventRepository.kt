package com.hackathon.manager.repository

import com.hackathon.manager.entity.ScheduleEvent
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ScheduleEventRepository : JpaRepository<ScheduleEvent, UUID> {
    fun findByHackathonIdOrderByStartsAt(hackathonId: UUID): List<ScheduleEvent>
}
