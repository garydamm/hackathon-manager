package com.hackathon.manager.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.hackathon.manager.dto.CreateProjectRequest
import com.hackathon.manager.dto.ProjectResponse
import com.hackathon.manager.dto.UpdateProjectRequest
import com.hackathon.manager.entity.enums.SubmissionStatus
import com.hackathon.manager.exception.ApiException
import com.hackathon.manager.security.JwtAuthenticationFilter
import com.hackathon.manager.security.JwtTokenProvider
import com.hackathon.manager.security.UserPrincipal
import com.hackathon.manager.service.ProjectService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.ComponentScan
import org.springframework.context.annotation.FilterType
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.OffsetDateTime
import java.util.*

@WebMvcTest(
    controllers = [ProjectController::class],
    excludeFilters = [ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = [JwtAuthenticationFilter::class])]
)
class ProjectControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var projectService: ProjectService

    @MockBean
    lateinit var jwtTokenProvider: JwtTokenProvider

    private val testUserId = UUID.randomUUID()
    private val testProjectId = UUID.randomUUID()
    private val testTeamId = UUID.randomUUID()
    private val testHackathonId = UUID.randomUUID()

    private fun createUserPrincipal(id: UUID = testUserId) = UserPrincipal(
        id = id,
        email = "test@example.com",
        passwordHash = "hashedpassword",
        authorities = emptyList(),
        isActive = true
    )

    private fun createProjectResponse(
        id: UUID = testProjectId,
        status: SubmissionStatus = SubmissionStatus.draft
    ) = ProjectResponse(
        id = id,
        teamId = testTeamId,
        teamName = "Test Team",
        hackathonId = testHackathonId,
        createdById = testUserId,
        createdByName = "Test User",
        name = "Test Project",
        tagline = "A test project",
        description = "Project description",
        status = status,
        demoUrl = "https://demo.example.com",
        videoUrl = null,
        repositoryUrl = "https://github.com/example",
        presentationUrl = null,
        thumbnailUrl = null,
        technologies = listOf("Kotlin", "Spring Boot"),
        submittedAt = if (status == SubmissionStatus.submitted) OffsetDateTime.now() else null,
        createdAt = OffsetDateTime.now()
    )

    @Test
    fun `getProjectsByHackathon should return projects`() {
        whenever(projectService.getProjectsByHackathon(testHackathonId))
            .thenReturn(listOf(createProjectResponse()))

        mockMvc.perform(
            get("/api/projects/hackathon/$testHackathonId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$[0].name").value("Test Project"))
    }

    @Test
    fun `getSubmittedProjects should return only submitted projects`() {
        whenever(projectService.getSubmittedProjectsByHackathon(testHackathonId))
            .thenReturn(listOf(createProjectResponse(status = SubmissionStatus.submitted)))

        mockMvc.perform(
            get("/api/projects/hackathon/$testHackathonId/submitted")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].status").value("submitted"))
    }

    @Test
    fun `getProjectById should return project`() {
        whenever(projectService.getProjectById(testProjectId))
            .thenReturn(createProjectResponse())

        mockMvc.perform(
            get("/api/projects/$testProjectId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(testProjectId.toString()))
            .andExpect(jsonPath("$.name").value("Test Project"))
    }

    @Test
    fun `getProjectById should return 404 when not found`() {
        whenever(projectService.getProjectById(testProjectId))
            .thenThrow(ApiException("Project not found", HttpStatus.NOT_FOUND))

        mockMvc.perform(
            get("/api/projects/$testProjectId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `getProjectByTeam should return project when exists`() {
        whenever(projectService.getProjectByTeam(testTeamId))
            .thenReturn(createProjectResponse())

        mockMvc.perform(
            get("/api/projects/team/$testTeamId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.teamId").value(testTeamId.toString()))
    }

    @Test
    fun `getProjectByTeam should return null when no project`() {
        whenever(projectService.getProjectByTeam(testTeamId))
            .thenReturn(null)

        mockMvc.perform(
            get("/api/projects/team/$testTeamId")
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(content().string(""))
    }

    @Test
    fun `createProject should return 401 without authentication`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        mockMvc.perform(
            post("/api/projects")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `createProject should return 201 when successful`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project",
            tagline = "A new project"
        )

        whenever(projectService.createProject(any(), eq(testUserId)))
            .thenReturn(createProjectResponse().copy(name = "New Project"))

        mockMvc.perform(
            post("/api/projects")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("New Project"))
    }

    @Test
    fun `createProject should return 403 when not team member`() {
        val request = CreateProjectRequest(
            teamId = testTeamId,
            name = "New Project"
        )

        whenever(projectService.createProject(any(), eq(testUserId)))
            .thenThrow(ApiException("Must be a team member to create a project", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            post("/api/projects")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `updateProject should return 200 when successful`() {
        val request = UpdateProjectRequest(name = "Updated Project")

        whenever(projectService.updateProject(eq(testProjectId), any(), eq(testUserId)))
            .thenReturn(createProjectResponse().copy(name = "Updated Project"))

        mockMvc.perform(
            put("/api/projects/$testProjectId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Updated Project"))
    }

    @Test
    fun `updateProject should return 400 when project is submitted`() {
        val request = UpdateProjectRequest(name = "Updated Project")

        whenever(projectService.updateProject(eq(testProjectId), any(), eq(testUserId)))
            .thenThrow(ApiException("Cannot update a submitted project", HttpStatus.BAD_REQUEST))

        mockMvc.perform(
            put("/api/projects/$testProjectId")
                .with(csrf())
                .with(user(createUserPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `submitProject should return 200 when successful`() {
        whenever(projectService.submitProject(testProjectId, testUserId))
            .thenReturn(createProjectResponse(status = SubmissionStatus.submitted))

        mockMvc.perform(
            post("/api/projects/$testProjectId/submit")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("submitted"))
    }

    @Test
    fun `submitProject should return 400 when already submitted`() {
        whenever(projectService.submitProject(testProjectId, testUserId))
            .thenThrow(ApiException("Project already submitted", HttpStatus.BAD_REQUEST))

        mockMvc.perform(
            post("/api/projects/$testProjectId/submit")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `unsubmitProject should return 200 when successful`() {
        whenever(projectService.unsubmitProject(testProjectId, testUserId))
            .thenReturn(createProjectResponse(status = SubmissionStatus.draft))

        mockMvc.perform(
            post("/api/projects/$testProjectId/unsubmit")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("draft"))
    }

    @Test
    fun `unsubmitProject should return 400 when not submitted`() {
        whenever(projectService.unsubmitProject(testProjectId, testUserId))
            .thenThrow(ApiException("Project is not submitted", HttpStatus.BAD_REQUEST))

        mockMvc.perform(
            post("/api/projects/$testProjectId/unsubmit")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `archiveProject should return 200 when successful`() {
        whenever(projectService.archiveProject(testProjectId, testUserId))
            .thenReturn(createProjectResponse())

        mockMvc.perform(
            post("/api/projects/$testProjectId/archive")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isOk)
    }

    @Test
    fun `archiveProject should return 401 without authentication`() {
        mockMvc.perform(
            post("/api/projects/$testProjectId/archive")
                .with(csrf())
        )
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `archiveProject should return 403 when not a team member`() {
        whenever(projectService.archiveProject(testProjectId, testUserId))
            .thenThrow(ApiException("Must be a team member to archive the project", HttpStatus.FORBIDDEN))

        mockMvc.perform(
            post("/api/projects/$testProjectId/archive")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isForbidden)
    }

    @Test
    fun `archiveProject should return 400 when already archived`() {
        whenever(projectService.archiveProject(testProjectId, testUserId))
            .thenThrow(ApiException("Project is already archived", HttpStatus.BAD_REQUEST))

        mockMvc.perform(
            post("/api/projects/$testProjectId/archive")
                .with(csrf())
                .with(user(createUserPrincipal()))
        )
            .andExpect(status().isBadRequest)
    }

    private fun ProjectResponse.copy(
        name: String = this.name
    ) = ProjectResponse(
        id = this.id,
        teamId = this.teamId,
        teamName = this.teamName,
        hackathonId = this.hackathonId,
        createdById = this.createdById,
        createdByName = this.createdByName,
        name = name,
        tagline = this.tagline,
        description = this.description,
        status = this.status,
        demoUrl = this.demoUrl,
        videoUrl = this.videoUrl,
        repositoryUrl = this.repositoryUrl,
        presentationUrl = this.presentationUrl,
        thumbnailUrl = this.thumbnailUrl,
        technologies = this.technologies,
        submittedAt = this.submittedAt,
        createdAt = this.createdAt
    )
}
