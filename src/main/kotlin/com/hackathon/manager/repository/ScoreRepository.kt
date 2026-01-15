package com.hackathon.manager.repository

import com.hackathon.manager.entity.Score
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ScoreRepository : JpaRepository<Score, UUID> {
    fun findByJudgeAssignmentId(judgeAssignmentId: UUID): List<Score>
    fun findByJudgeAssignmentIdAndCriteriaId(judgeAssignmentId: UUID, criteriaId: UUID): Score?

    @Query("""
        SELECT s FROM Score s
        JOIN s.judgeAssignment ja
        WHERE ja.project.id = :projectId
    """)
    fun findByProjectId(projectId: UUID): List<Score>
}
