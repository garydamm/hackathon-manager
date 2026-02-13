package com.hackathon.manager.controller

import com.hackathon.manager.dto.CreateProjectRequest
import com.hackathon.manager.dto.ProjectResponse
import com.hackathon.manager.dto.UpdateProjectRequest
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.ProjectService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/projects")
class ProjectController(
    private val projectService: ProjectService
) {

    @GetMapping("/hackathon/{hackathonId}")
    fun getProjectsByHackathon(@PathVariable hackathonId: UUID): ResponseEntity<List<ProjectResponse>> {
        val projects = projectService.getProjectsByHackathon(hackathonId)
        return ResponseEntity.ok(projects)
    }

    @GetMapping("/hackathon/{hackathonId}/submitted")
    fun getSubmittedProjects(@PathVariable hackathonId: UUID): ResponseEntity<List<ProjectResponse>> {
        val projects = projectService.getSubmittedProjectsByHackathon(hackathonId)
        return ResponseEntity.ok(projects)
    }

    @GetMapping("/{id}")
    fun getProjectById(@PathVariable id: UUID): ResponseEntity<ProjectResponse> {
        val project = projectService.getProjectById(id)
        return ResponseEntity.ok(project)
    }

    @GetMapping("/team/{teamId}")
    fun getProjectByTeam(@PathVariable teamId: UUID): ResponseEntity<ProjectResponse?> {
        val project = projectService.getProjectByTeam(teamId)
        return ResponseEntity.ok(project)
    }

    @PostMapping
    fun createProject(
        @Valid @RequestBody request: CreateProjectRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.createProject(request, principal.id)
        return ResponseEntity.status(HttpStatus.CREATED).body(project)
    }

    @PutMapping("/{id}")
    fun updateProject(
        @PathVariable id: UUID,
        @RequestBody request: UpdateProjectRequest,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.updateProject(id, request, principal.id)
        return ResponseEntity.ok(project)
    }

    @PostMapping("/{id}/submit")
    fun submitProject(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.submitProject(id, principal.id)
        return ResponseEntity.ok(project)
    }

    @PostMapping("/{id}/unsubmit")
    fun unsubmitProject(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.unsubmitProject(id, principal.id)
        return ResponseEntity.ok(project)
    }

    @PostMapping("/{id}/archive")
    fun archiveProject(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.archiveProject(id, principal.id)
        return ResponseEntity.ok(project)
    }

    @PostMapping("/{id}/link-team/{teamId}")
    fun linkProjectToTeam(
        @PathVariable id: UUID,
        @PathVariable teamId: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.linkProjectToTeam(id, teamId, principal.id)
        return ResponseEntity.ok(project)
    }

    @PostMapping("/{id}/unlink-team")
    fun unlinkProjectFromTeam(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserPrincipal
    ): ResponseEntity<ProjectResponse> {
        val project = projectService.unlinkProjectFromTeam(id, principal.id)
        return ResponseEntity.ok(project)
    }
}
