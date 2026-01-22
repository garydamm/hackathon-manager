import { api } from "./api"
import type { Team, CreateTeamRequest, UpdateTeamRequest } from "@/types"

export const teamService = {
  async getTeamsByHackathon(hackathonId: string): Promise<Team[]> {
    return api.get<Team[]>(`/teams/hackathon/${hackathonId}`)
  },

  async getTeam(teamId: string): Promise<Team> {
    return api.get<Team>(`/teams/${teamId}`)
  },

  async getMyTeam(hackathonId: string): Promise<Team | null> {
    return api.get<Team | null>(`/teams/hackathon/${hackathonId}/my-team`)
  },

  async createTeam(data: CreateTeamRequest): Promise<Team> {
    return api.post<Team>("/teams", data)
  },

  async updateTeam(teamId: string, data: UpdateTeamRequest): Promise<Team> {
    return api.put<Team>(`/teams/${teamId}`, data)
  },

  async joinTeamByCode(inviteCode: string): Promise<Team> {
    return api.post<Team>("/teams/join", { inviteCode })
  },

  async joinTeam(teamId: string): Promise<Team> {
    return api.post<Team>(`/teams/${teamId}/join`, {})
  },

  async leaveTeam(teamId: string): Promise<void> {
    return api.post<void>(`/teams/${teamId}/leave`)
  },

  async regenerateInviteCode(teamId: string): Promise<string> {
    const response = await api.post<{ inviteCode: string }>(`/teams/${teamId}/regenerate-invite`)
    return response.inviteCode
  },
}
