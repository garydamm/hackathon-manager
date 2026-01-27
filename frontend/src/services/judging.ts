import { api } from "./api"
import type {
  JudgingCriteria,
  CreateJudgingCriteriaRequest,
  UpdateJudgingCriteriaRequest,
  JudgeInfo,
  AddJudgeRequest,
  JudgeAssignment,
  SubmitScoresRequest,
  LeaderboardEntry,
} from "@/types"

export const judgingService = {
  // Criteria management
  async getCriteria(hackathonId: string): Promise<JudgingCriteria[]> {
    return api.get<JudgingCriteria[]>(`/judging/hackathons/${hackathonId}/criteria`)
  },

  async createCriteria(
    hackathonId: string,
    data: CreateJudgingCriteriaRequest
  ): Promise<JudgingCriteria> {
    return api.post<JudgingCriteria>(`/judging/hackathons/${hackathonId}/criteria`, data)
  },

  async updateCriteria(
    criteriaId: string,
    data: UpdateJudgingCriteriaRequest
  ): Promise<JudgingCriteria> {
    return api.put<JudgingCriteria>(`/judging/criteria/${criteriaId}`, data)
  },

  async deleteCriteria(criteriaId: string): Promise<void> {
    return api.delete(`/judging/criteria/${criteriaId}`)
  },

  // Judge management
  async getJudges(hackathonId: string): Promise<JudgeInfo[]> {
    return api.get<JudgeInfo[]>(`/judging/hackathons/${hackathonId}/judges`)
  },

  async addJudge(hackathonId: string, data: AddJudgeRequest): Promise<JudgeInfo> {
    return api.post<JudgeInfo>(`/judging/hackathons/${hackathonId}/judges`, data)
  },

  async removeJudge(hackathonId: string, userId: string): Promise<void> {
    return api.delete(`/judging/hackathons/${hackathonId}/judges/${userId}`)
  },

  // Scoring
  async getMyAssignments(hackathonId: string): Promise<JudgeAssignment[]> {
    return api.get<JudgeAssignment[]>(`/judging/hackathons/${hackathonId}/assignments`)
  },

  async getAssignment(assignmentId: string): Promise<JudgeAssignment> {
    return api.get<JudgeAssignment>(`/judging/assignments/${assignmentId}`)
  },

  async submitScores(assignmentId: string, data: SubmitScoresRequest): Promise<JudgeAssignment> {
    return api.post<JudgeAssignment>(`/judging/assignments/${assignmentId}/scores`, data)
  },

  // Leaderboard
  async getLeaderboard(hackathonId: string): Promise<LeaderboardEntry[]> {
    return api.get<LeaderboardEntry[]>(`/judging/hackathons/${hackathonId}/leaderboard`)
  },
}
