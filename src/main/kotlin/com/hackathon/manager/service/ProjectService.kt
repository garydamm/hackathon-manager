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
    private val hackathonService: HackathonService,
    private val userRepository: UserRepository
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
        val user = userRepository.findById(userId)
            .orElseThrow { NotFoundException("User not found") }

        if (request.teamId != null) {
            // Team-context creation flow
            val team = teamRepository.findById(request.teamId)
                .orElseThrow { NotFoundException("Team not found") }

            if (team.hackathon.archived) {
                throw ValidationException("Cannot create a project in an archived hackathon")
            }

            if (request.hackathonId != null && request.hackathonId != team.hackathon.id) {
                throw ValidationException("Hackathon ID does not match the team's hackathon")
            }

            if (!teamMemberRepository.existsByTeamIdAndUserId(request.teamId, userId)) {
                throw UnauthorizedException("Must be a team member to create a project")
            }

            if (projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(request.teamId, team.hackathon.id!!)) {
                throw ConflictException("Team already has a project for this hackathon")
            }

            val project = Project(
                team = team,
                hackathon = team.hackathon,
                createdBy = user,
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
        } else {
            // Independent project creation flow (no team)
            val hackathonId = request.hackathonId
                ?: throw ValidationException("Hackathon ID is required when creating a project without a team")

            val hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow { NotFoundException("Hackathon not found") }

            if (hackathon.archived) {
                throw ValidationException("Cannot create a project in an archived hackathon")
            }

            if (!hackathonService.isUserRegistered(hackathonId, userId)) {
                throw UnauthorizedException("Must be registered in the hackathon to create a project")
            }

            val project = Project(
                team = null,
                hackathon = hackathon,
                createdBy = user,
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
    }

    @Transactional
    fun updateProject(id: UUID, request: UpdateProjectRequest, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(id)
            .orElseThrow { NotFoundException("Project not found") }

        if (!isUserAuthorized(project, userId)) {
            throw UnauthorizedException("Must be the project creator or a team member to update the project")
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

        if (!isUserAuthorized(project, userId)) {
            throw UnauthorizedException("Must be the project creator or a team member to submit the project")
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

        if (!isUserAuthorized(project, userId)) {
            throw UnauthorizedException("Must be the project creator or a team member to unsubmit the project")
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

        val isCreatorOrTeamMember = isUserAuthorized(project, userId)
        val isOrganizer = hackathonService.isUserOrganizer(project.hackathon.id!!, userId)

        if (!isCreatorOrTeamMember && !isOrganizer) {
            throw UnauthorizedException("Must be the project creator, a team member, or hackathon organizer to archive the project")
        }

        project.archivedAt = OffsetDateTime.now()

        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    @Transactional
    fun linkProjectToTeam(projectId: UUID, teamId: UUID, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(projectId)
            .orElseThrow { NotFoundException("Project not found") }

        val team = teamRepository.findById(teamId)
            .orElseThrow { NotFoundException("Team not found") }

        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw UnauthorizedException("Must be a member of the target team to link a project")
        }

        if (project.hackathon.id != team.hackathon.id) {
            throw ValidationException("Project and team must be in the same hackathon")
        }

        if (project.team != null) {
            throw ConflictException("Project is already linked to a team")
        }

        if (projectRepository.existsByTeamIdAndHackathonIdAndArchivedAtIsNull(teamId, team.hackathon.id!!)) {
            throw ConflictException("Team already has an active project")
        }

        project.team = team
        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    @Transactional
    fun unlinkProjectFromTeam(projectId: UUID, userId: UUID): ProjectResponse {
        val project = projectRepository.findById(projectId)
            .orElseThrow { NotFoundException("Project not found") }

        val team = project.team
            ?: throw ValidationException("Project is not linked to a team")

        if (!teamMemberRepository.existsByTeamIdAndUserId(team.id!!, userId)) {
            throw UnauthorizedException("Must be a member of the linked team to unlink a project")
        }

        project.team = null
        val savedProject = projectRepository.save(project)
        return ProjectResponse.fromEntity(savedProject)
    }

    private fun isUserAuthorized(project: Project, userId: UUID): Boolean {
        if (project.createdBy.id == userId) return true
        val team = project.team ?: return false
        return teamMemberRepository.existsByTeamIdAndUserId(team.id!!, userId)
    }
}
