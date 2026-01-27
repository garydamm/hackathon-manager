package com.hackathon.manager.dto

import com.hackathon.manager.entity.JudgeAssignment
import com.hackathon.manager.entity.JudgingCriteria
import com.hackathon.manager.entity.Score
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal
import java.time.OffsetDateTime
import java.util.*

data class JudgingCriteriaResponse(
    val id: UUID,
    val hackathonId: UUID,
    val name: String,
    val description: String?,
    val maxScore: Int,
    val weight: BigDecimal,
    val displayOrder: Int
) {
    companion object {
        fun fromEntity(criteria: JudgingCriteria): JudgingCriteriaResponse {
            return JudgingCriteriaResponse(
                id = criteria.id!!,
                hackathonId = criteria.hackathon.id!!,
                name = criteria.name,
                description = criteria.description,
                maxScore = criteria.maxScore,
                weight = criteria.weight,
                displayOrder = criteria.displayOrder
            )
        }
    }
}

data class JudgeAssignmentResponse(
    val id: UUID,
    val hackathonId: UUID,
    val judgeId: UUID,
    val projectId: UUID,
    val projectName: String,
    val assignedAt: OffsetDateTime,
    val completedAt: OffsetDateTime?,
    val scores: List<ScoreResponse>?
) {
    companion object {
        fun fromEntity(assignment: JudgeAssignment, includeScores: Boolean = false): JudgeAssignmentResponse {
            return JudgeAssignmentResponse(
                id = assignment.id!!,
                hackathonId = assignment.hackathon.id!!,
                judgeId = assignment.judge.id!!,
                projectId = assignment.project.id!!,
                projectName = assignment.project.name,
                assignedAt = assignment.assignedAt,
                completedAt = assignment.completedAt,
                scores = if (includeScores) assignment.scores.map { ScoreResponse.fromEntity(it) } else null
            )
        }
    }
}

data class ScoreResponse(
    val id: UUID,
    val criteriaId: UUID,
    val criteriaName: String,
    val score: Int,
    val maxScore: Int,
    val feedback: String?
) {
    companion object {
        fun fromEntity(score: Score): ScoreResponse {
            return ScoreResponse(
                id = score.id!!,
                criteriaId = score.criteria.id!!,
                criteriaName = score.criteria.name,
                score = score.score,
                maxScore = score.criteria.maxScore,
                feedback = score.feedback
            )
        }
    }
}

data class SubmitScoreRequest(
    @field:NotNull(message = "Criteria ID is required")
    val criteriaId: UUID,

    @field:NotNull(message = "Score is required")
    @field:Min(0, message = "Score must be at least 0")
    @field:Max(100, message = "Score must be at most 100")
    val score: Int,

    val feedback: String? = null
)

data class SubmitScoresRequest(
    val scores: List<SubmitScoreRequest>
)

data class CreateJudgingCriteriaRequest(
    @field:NotNull(message = "Name is required")
    val name: String,

    val description: String? = null,

    @field:Min(1, message = "Max score must be at least 1")
    @field:Max(100, message = "Max score must be at most 100")
    val maxScore: Int = 10,

    @field:NotNull(message = "Weight is required")
    val weight: BigDecimal = BigDecimal("1.00"),

    val displayOrder: Int = 0
)

data class UpdateJudgingCriteriaRequest(
    val name: String? = null,
    val description: String? = null,

    @field:Min(1, message = "Max score must be at least 1")
    @field:Max(100, message = "Max score must be at most 100")
    val maxScore: Int? = null,

    val weight: BigDecimal? = null,
    val displayOrder: Int? = null
)

data class AddJudgeRequest(
    @field:NotNull(message = "User ID is required")
    val userId: UUID
)

data class JudgeInfoResponse(
    val userId: UUID,
    val email: String,
    val firstName: String,
    val lastName: String,
    val displayName: String?,
    val projectsScored: Int,
    val totalProjects: Int
)

data class CriteriaAverageResponse(
    val criteriaId: UUID,
    val criteriaName: String,
    val averageScore: Double,
    val maxScore: Int
)

data class LeaderboardEntryResponse(
    val rank: Int,
    val projectId: UUID,
    val projectName: String,
    val teamId: UUID,
    val teamName: String,
    val totalScore: Double,
    val criteriaAverages: List<CriteriaAverageResponse>
)
