package com.hackathon.manager.repository

import com.hackathon.manager.entity.JudgingCriteria
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface JudgingCriteriaRepository : JpaRepository<JudgingCriteria, UUID> {
    fun findByHackathonIdOrderByDisplayOrder(hackathonId: UUID): List<JudgingCriteria>
}
