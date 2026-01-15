package com.hackathon.manager.dto

import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.enums.SubmissionStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.OffsetDateTime
import java.util.*

data class ProjectResponse(
    val id: UUID,
    val teamId: UUID,
    val teamName: String,
    val hackathonId: UUID,
    val name: String,
    val tagline: String?,
    val description: String?,
    val status: SubmissionStatus,
    val demoUrl: String?,
    val videoUrl: String?,
    val repositoryUrl: String?,
    val presentationUrl: String?,
    val thumbnailUrl: String?,
    val technologies: List<String>?,
    val submittedAt: OffsetDateTime?,
    val createdAt: OffsetDateTime?
) {
    companion object {
        fun fromEntity(project: Project): ProjectResponse {
            return ProjectResponse(
                id = project.id!!,
                teamId = project.team.id!!,
                teamName = project.team.name,
                hackathonId = project.hackathon.id!!,
                name = project.name,
                tagline = project.tagline,
                description = project.description,
                status = project.status,
                demoUrl = project.demoUrl,
                videoUrl = project.videoUrl,
                repositoryUrl = project.repositoryUrl,
                presentationUrl = project.presentationUrl,
                thumbnailUrl = project.thumbnailUrl,
                technologies = project.technologies?.toList(),
                submittedAt = project.submittedAt,
                createdAt = project.createdAt
            )
        }
    }
}

data class CreateProjectRequest(
    @field:NotNull(message = "Team ID is required")
    val teamId: UUID,

    @field:NotBlank(message = "Project name is required")
    val name: String,

    val tagline: String? = null,
    val description: String? = null,
    val demoUrl: String? = null,
    val videoUrl: String? = null,
    val repositoryUrl: String? = null,
    val presentationUrl: String? = null,
    val technologies: List<String>? = null
)

data class UpdateProjectRequest(
    val name: String? = null,
    val tagline: String? = null,
    val description: String? = null,
    val demoUrl: String? = null,
    val videoUrl: String? = null,
    val repositoryUrl: String? = null,
    val presentationUrl: String? = null,
    val thumbnailUrl: String? = null,
    val technologies: List<String>? = null
)
