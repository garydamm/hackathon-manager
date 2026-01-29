package com.hackathon.manager.service

import com.hackathon.manager.dto.CriteriaAverageResponse
import com.hackathon.manager.dto.LeaderboardEntryResponse
import com.hackathon.manager.entity.enums.HackathonStatus
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.repository.HackathonRepository
import com.hackathon.manager.repository.JudgeAssignmentRepository
import com.hackathon.manager.repository.JudgingCriteriaRepository
import com.hackathon.manager.repository.ProjectRepository
import com.hackathon.manager.repository.ScoreRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class LeaderboardService(
    private val judgingCriteriaRepository: JudgingCriteriaRepository,
    private val hackathonRepository: HackathonRepository,
    private val hackathonService: HackathonService,
    private val projectRepository: ProjectRepository,
    private val judgeAssignmentRepository: JudgeAssignmentRepository,
    private val scoreRepository: ScoreRepository
) {

    @Transactional(readOnly = true)
    fun getLeaderboard(hackathonId: UUID, userId: UUID): List<LeaderboardEntryResponse> {
        val hackathon = hackathonRepository.findById(hackathonId)
            .orElseThrow { ApiException("Hackathon not found", HttpStatus.NOT_FOUND) }

        // Check authorization: organizers can view anytime, participants only when completed
        validateLeaderboardAccess(hackathonId, userId, hackathon.status)

        // Get all criteria for this hackathon
        val criteria = judgingCriteriaRepository.findByHackathonIdOrderByDisplayOrder(hackathonId)
        if (criteria.isEmpty()) {
            return emptyList()
        }

        // Get all submitted projects
        val submittedProjects = projectRepository.findByHackathonIdAndStatus(hackathonId, SubmissionStatus.submitted)
        if (submittedProjects.isEmpty()) {
            return emptyList()
        }

        // Calculate scores for each project
        val projectScores = calculateProjectScores(submittedProjects, criteria)

        // Sort by total score descending and assign ranks
        return buildLeaderboardEntries(projectScores)
    }

    private fun validateLeaderboardAccess(hackathonId: UUID, userId: UUID, status: HackathonStatus) {
        val isOrganizer = hackathonService.isUserOrganizer(hackathonId, userId)

        if (!isOrganizer && status != HackathonStatus.completed) {
            throw ApiException("Results are only available after the hackathon is completed", HttpStatus.FORBIDDEN)
        }
    }

    private fun calculateProjectScores(
        projects: List<com.hackathon.manager.entity.Project>,
        criteria: List<com.hackathon.manager.entity.JudgingCriteria>
    ): List<ProjectScoreData> {
        return projects.map { project ->
            val projectAssignments = judgeAssignmentRepository.findByProjectId(project.id!!)
            val criteriaAverages = calculateCriteriaAverages(projectAssignments, criteria)
            val totalScore = calculateTotalWeightedScore(criteriaAverages)

            ProjectScoreData(
                project = project,
                totalScore = totalScore,
                criteriaAverages = criteriaAverages.map { it.first }
            )
        }
    }

    private fun calculateCriteriaAverages(
        projectAssignments: List<com.hackathon.manager.entity.JudgeAssignment>,
        criteria: List<com.hackathon.manager.entity.JudgingCriteria>
    ): List<Pair<CriteriaAverageResponse, Double>> {
        return criteria.map { criterion ->
            val scoresForCriteria = projectAssignments.flatMap { assignment ->
                scoreRepository.findByJudgeAssignmentId(assignment.id!!)
                    .filter { it.criteria.id == criterion.id }
            }

            val averageScore = if (scoresForCriteria.isNotEmpty()) {
                scoresForCriteria.map { it.score }.average()
            } else {
                0.0
            }

            val criteriaAverage = CriteriaAverageResponse(
                criteriaId = criterion.id!!,
                criteriaName = criterion.name,
                averageScore = averageScore,
                maxScore = criterion.maxScore
            )

            criteriaAverage to criterion.weight.toDouble()
        }
    }

    private fun calculateTotalWeightedScore(
        criteriaAverages: List<Pair<CriteriaAverageResponse, Double>>
    ): Double {
        val totalWeightedScore = criteriaAverages.sumOf { (avg, weight) ->
            avg.averageScore * weight
        }
        val totalWeight = criteriaAverages.sumOf { (_, weight) -> weight }
        return if (totalWeight > 0) totalWeightedScore / totalWeight else 0.0
    }

    private fun buildLeaderboardEntries(projectScores: List<ProjectScoreData>): List<LeaderboardEntryResponse> {
        val sortedProjects = projectScores.sortedByDescending { it.totalScore }

        return sortedProjects.mapIndexed { index, data ->
            LeaderboardEntryResponse(
                rank = index + 1,
                projectId = data.project.id!!,
                projectName = data.project.name,
                teamId = data.project.team.id!!,
                teamName = data.project.team.name,
                totalScore = data.totalScore,
                criteriaAverages = data.criteriaAverages
            )
        }
    }

    private data class ProjectScoreData(
        val project: com.hackathon.manager.entity.Project,
        val totalScore: Double,
        val criteriaAverages: List<CriteriaAverageResponse>
    )
}
