package com.hackathon.manager.service

import com.hackathon.manager.dto.CreateProjectRequest
import com.hackathon.manager.dto.ProjectResponse
import com.hackathon.manager.dto.UpdateProjectRequest
import com.hackathon.manager.entity.Project
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.exception.*
import com.hackathon.manager.repository.*
import com.hackathon.manager.util.applyIfNotNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime
import java.util.*

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val teamRepository: TeamRepository,
    private val teamMemberRepository: TeamMemberRepository,
    private val hackathonRepository: HackathonRepository,
    private val hackathonService: HackathonService
) {

    @Transactional(readOnly = true)
    fun getProjectsByHackathon(hackathonId: UUID): List<ProjectResponse> {
        return projectRepository.findByHackathonIdAndArchivedAtIsNull(hackathonId)
            .map { project -> ProjectResponse.fromEntity(project) }
    }

    @Transactional(readOnly = true)
    fun getSubmittedProjectsByHackathon(hackathonId: UUID): List<ProjectResponse> {
        return projectRepository.findByHackathonIdAndStatusAndArchivedAtIsNull(hackathonId, SubmissionStatus.submitted)
            .map { project -> ProjectResponse.fromEntity(project) }
    }

    @Transactional(readOnly = true)
    fun getProjectById(id: UUID): ProjectResponse {
        val project = projectRepository.findById(id)
            .orElseThrow { NotFoundException("Project not found") }
        if (project.archivedAt != null) {
            throw NotFoundException("Project not found")
        }
        return ProjectResponse.fromEntity(project)
    }

    @Transactional(readOnly = true)
    fun getProjectByTeam(teamId: UUID): ProjectResponse? {
        val project = projectRepository.findByTeamIdAndArchivedAtIsNull(teamId)
        return project?.let { foundProject -> ProjectResponse.fromEntity(foundProject) }
    }

    @Transactional
    fun createProject(request: CreateProjectRequest, userId: UUID): ProjectResponse {
        val teamId = request.teamId
            ?: throw ValidationException("Team ID is required")

        val team = teamRepository.findById(teamId)
            .orElseThrow { NotFoundException("Team not found") }

        if (team.hackathon.archived) {
            throw ValidationException("Cannot create a project in an archived hackathon")
        }

        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw UnauthorizedException("Must be a team member to create a project")
        }

        if (projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(teamId, team.hackathon.id!!)) {
            throw ConflictException("Team already has a project for this hackathon")
        }

        val project = Project(
            team = team,
            hackathon = team.hackathon,
            createdBy = team.createdBy,
            name = request.name,
            tagline = request.tagline,
            description = request.description,
            demoUrl = request.demoUrl,
            videoUrl = request.videoUrl,
            repositoryUrl = request.repositoryUrl,
            presentationUrl = request.presentationUrl,
            technologies = request.technologies?.toTypedArray()
        )

        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    @Transactional
    fun updateProject(id: UUID, request: UpdateProjectRequest, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(id)
            .orElseThrow { NotFoundException("Project not found") }

        if (!teamMemberRepository.existsByTeamIdAndUserId(project.team!!.id!!, userId)) {
            throw UnauthorizedException("Must be a team member to update the project")
        }

        if (project.status == SubmissionStatus.submitted) {
            throw ValidationException("Cannot update a submitted project")
        }

        request.name.applyIfNotNull { project.name = it }
        request.tagline.applyIfNotNull { project.tagline = it }
        request.description.applyIfNotNull { project.description = it }
        request.demoUrl.applyIfNotNull { project.demoUrl = it }
        request.videoUrl.applyIfNotNull { project.videoUrl = it }
        request.repositoryUrl.applyIfNotNull { project.repositoryUrl = it }
        request.presentationUrl.applyIfNotNull { project.presentationUrl = it }
        request.thumbnailUrl.applyIfNotNull { project.thumbnailUrl = it }
        request.technologies.applyIfNotNull { project.technologies = it.toTypedArray() }

        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    @Transactional
    fun submitProject(id: UUID, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(id)
            .orElseThrow { NotFoundException("Project not found") }

        if (project.hackathon.archived) {
            throw ValidationException("Cannot submit a project in an archived hackathon")
        }

        if (!teamMemberRepository.existsByTeamIdAndUserId(project.team!!.id!!, userId)) {
            throw UnauthorizedException("Must be a team member to submit the project")
        }

        if (project.status == SubmissionStatus.submitted) {
            throw ValidationException("Project already submitted")
        }

        project.status = SubmissionStatus.submitted
        project.submittedAt = OffsetDateTime.now()

        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    @Transactional
    fun unsubmitProject(id: UUID, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(id)
            .orElseThrow { NotFoundException("Project not found") }

        if (project.hackathon.archived) {
            throw ValidationException("Cannot unsubmit a project in an archived hackathon")
        }

        if (!teamMemberRepository.existsByTeamIdAndUserId(project.team!!.id!!, userId)) {
            throw UnauthorizedException("Must be a team member to unsubmit the project")
        }

        if (project.status != SubmissionStatus.submitted) {
            throw ValidationException("Project is not submitted")
        }

        project.status = SubmissionStatus.draft
        project.submittedAt = null

        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    @Transactional
    fun archiveProject(id: UUID, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(id)
            .orElseThrow { NotFoundException("Project not found") }

        if (project.archivedAt != null) {
            throw ValidationException("Project is already archived")
        }

        // Check if user is either a team member OR hackathon organizer
        val isTeamMember = teamMemberRepository.existsByTeamIdAndUserId(project.team!!.id!!, userId)
        val isOrganizer = hackathonService.isUserOrganizer(project.hackathon.id!!, userId)

        if (!isTeamMember && !isOrganizer) {
            throw UnauthorizedException("Must be a team member or hackathon organizer to archive the project")
        }

        project.archivedAt = OffsetDateTime.now()

        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }
}
