import { api } from "./api"
import type { Project, CreateProjectRequest, UpdateProjectRequest } from "@/types"

export const projectService = {
  async getProjectsByHackathon(hackathonId: string): Promise<Project[]> {
    return api.get<Project[]>(`/projects/hackathon/${hackathonId}`)
  },

  async getProjectById(id: string): Promise<Project> {
    return api.get<Project>(`/projects/${id}`)
  },

  async getProjectByTeam(teamId: string): Promise<Project | null> {
    try {
      return await api.get<Project>(`/projects/team/${teamId}`)
    } catch (error) {
      // Return null if team has no project (404)
      if (error instanceof Error && error.message.includes("404")) {
        return null
      }
      throw error
    }
  },

  async createProject(request: CreateProjectRequest): Promise<Project> {
    return api.post<Project>("/projects", request)
  },

  async updateProject(id: string, request: UpdateProjectRequest): Promise<Project> {
    return api.put<Project>(`/projects/${id}`, request)
  },

  async submitProject(id: string): Promise<Project> {
    return api.post<Project>(`/projects/${id}/submit`)
  },

  async unsubmitProject(id: string): Promise<Project> {
    return api.post<Project>(`/projects/${id}/unsubmit`)
  },

  async archiveProject(id: string): Promise<void> {
    return api.post<void>(`/projects/${id}/archive`)
  },
}
