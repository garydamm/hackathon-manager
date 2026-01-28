import { api } from "./api"
import type { Hackathon, CreateHackathonRequest, UpdateHackathonRequest, OrganizerInfo } from "@/types"

export const hackathonService = {
  async getAll(): Promise<Hackathon[]> {
    return api.get<Hackathon[]>("/hackathons")
  },

  async getMyDrafts(): Promise<Hackathon[]> {
    return api.get<Hackathon[]>("/hackathons/my-drafts")
  },

  async getBySlug(slug: string): Promise<Hackathon> {
    return api.get<Hackathon>(`/hackathons/${slug}`)
  },

  async getById(id: string): Promise<Hackathon> {
    return api.get<Hackathon>(`/hackathons/id/${id}`)
  },

  async create(data: CreateHackathonRequest): Promise<Hackathon> {
    return api.post<Hackathon>("/hackathons", data)
  },

  async update(id: string, data: UpdateHackathonRequest): Promise<Hackathon> {
    return api.put<Hackathon>(`/hackathons/${id}`, data)
  },

  async register(hackathonId: string): Promise<Hackathon> {
    return api.post<Hackathon>(`/hackathons/${hackathonId}/register`)
  },

  async unregister(hackathonId: string): Promise<Hackathon> {
    return api.delete<Hackathon>(`/hackathons/${hackathonId}/register`)
  },

  async getOrganizers(hackathonId: string): Promise<OrganizerInfo[]> {
    return api.get<OrganizerInfo[]>(`/hackathons/${hackathonId}/organizers`)
  },
}
