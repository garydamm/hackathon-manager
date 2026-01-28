import { api } from "./api"
import type {
  ScheduleEvent,
  CreateScheduleEventRequest,
  UpdateScheduleEventRequest,
  EventAttendee,
  RsvpRequest,
  MarkAttendanceRequest,
  BulkMarkAttendanceRequest,
} from "@/types"

export const scheduleService = {
  // Schedule retrieval
  async getSchedule(hackathonId: string): Promise<ScheduleEvent[]> {
    return api.get<ScheduleEvent[]>(`/schedule/hackathon/${hackathonId}`)
  },

  async getEvent(eventId: string): Promise<ScheduleEvent> {
    return api.get<ScheduleEvent>(`/schedule/${eventId}`)
  },

  // Event management (organizer only)
  async createEvent(data: CreateScheduleEventRequest): Promise<ScheduleEvent> {
    return api.post<ScheduleEvent>("/schedule", data)
  },

  async updateEvent(eventId: string, data: UpdateScheduleEventRequest): Promise<ScheduleEvent> {
    return api.put<ScheduleEvent>(`/schedule/${eventId}`, data)
  },

  async deleteEvent(eventId: string): Promise<void> {
    return api.delete(`/schedule/${eventId}`)
  },

  // RSVP operations
  async rsvpToEvent(eventId: string, data: RsvpRequest): Promise<ScheduleEvent> {
    return api.post<ScheduleEvent>(`/schedule/${eventId}/rsvp`, data)
  },

  async updateRsvp(eventId: string, data: RsvpRequest): Promise<ScheduleEvent> {
    return api.put<ScheduleEvent>(`/schedule/${eventId}/rsvp`, data)
  },

  async removeRsvp(eventId: string): Promise<void> {
    return api.delete(`/schedule/${eventId}/rsvp`)
  },

  // Attendance tracking (organizer only)
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    return api.get<EventAttendee[]>(`/schedule/${eventId}/attendees`)
  },

  async markAttendance(eventId: string, data: MarkAttendanceRequest): Promise<void> {
    return api.post(`/schedule/${eventId}/attendance`, data)
  },

  async bulkMarkAttendance(eventId: string, data: BulkMarkAttendanceRequest): Promise<void> {
    return api.post(`/schedule/${eventId}/attendance/bulk`, data)
  },
}
