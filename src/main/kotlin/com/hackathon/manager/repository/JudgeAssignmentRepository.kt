package com.hackathon.manager.repository

import com.hackathon.manager.entity.JudgeAssignment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface JudgeAssignmentRepository : JpaRepository<JudgeAssignment, UUID> {
    fun findByHackathonId(hackathonId: UUID): List<JudgeAssignment>
    fun findByJudgeId(judgeId: UUID): List<JudgeAssignment>
    fun findByProjectId(projectId: UUID): List<JudgeAssignment>
    fun findByJudgeIdAndProjectId(judgeId: UUID, projectId: UUID): JudgeAssignment?
    fun existsByJudgeIdAndProjectId(judgeId: UUID, projectId: UUID): Boolean
    fun findByJudgeIdAndHackathonId(judgeId: UUID, hackathonId: UUID): List<JudgeAssignment>
}
