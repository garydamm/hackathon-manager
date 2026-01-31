export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string | null
  avatarUrl?: string | null
  bio?: string | null
  skills?: string[] | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  portfolioUrl?: string | null
  createdAt?: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  displayName?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface PasswordResetResponse {
  message: string
}

export type HackathonStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "in_progress"
  | "judging"
  | "completed"
  | "cancelled"

export type UserRole = "organizer" | "admin" | "judge" | "mentor" | "participant"

export interface Hackathon {
  id: string
  name: string
  slug: string
  description?: string | null
  rules?: string | null
  status: HackathonStatus
  bannerUrl?: string | null
  logoUrl?: string | null
  location?: string | null
  isVirtual: boolean
  timezone: string
  registrationOpensAt?: string | null
  registrationClosesAt?: string | null
  startsAt: string
  endsAt: string
  judgingStartsAt?: string | null
  judgingEndsAt?: string | null
  maxTeamSize: number
  minTeamSize: number
  maxParticipants?: number | null
  participantCount?: number | null
  createdAt?: string | null
  userRole?: UserRole | null
}

export interface CreateHackathonRequest {
  name: string
  slug: string
  description?: string
  rules?: string
  status?: HackathonStatus
  bannerUrl?: string
  logoUrl?: string
  location?: string
  isVirtual?: boolean
  timezone?: string
  registrationOpensAt?: string
  registrationClosesAt?: string
  startsAt: string
  endsAt: string
  judgingStartsAt?: string
  judgingEndsAt?: string
  maxTeamSize?: number
  minTeamSize?: number
  maxParticipants?: number
}

export interface UpdateHackathonRequest {
  name?: string
  description?: string
  rules?: string
  status?: HackathonStatus
  bannerUrl?: string
  logoUrl?: string
  location?: string
  isVirtual?: boolean
  timezone?: string
  registrationOpensAt?: string
  registrationClosesAt?: string
  startsAt?: string
  endsAt?: string
  judgingStartsAt?: string
  judgingEndsAt?: string
  maxTeamSize?: number
  minTeamSize?: number
  maxParticipants?: number
}

// Team types
export interface TeamMember {
  id: string
  user: User
  isLeader: boolean
  joinedAt: string
}

export interface Team {
  id: string
  hackathonId: string
  name: string
  description?: string | null
  avatarUrl?: string | null
  inviteCode?: string | null
  isOpen: boolean
  memberCount: number
  members?: TeamMember[] | null
  createdAt?: string | null
}

export interface CreateTeamRequest {
  hackathonId: string
  name: string
  description?: string
  isOpen?: boolean
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  isOpen?: boolean
}

export interface JoinTeamRequest {
  inviteCode: string
}

// Project types
export type ProjectStatus = "draft" | "submitted" | "under_review" | "accepted" | "rejected"

export interface Project {
  id: string
  teamId: string
  teamName: string
  hackathonId: string
  name: string
  tagline?: string | null
  description?: string | null
  status: ProjectStatus
  demoUrl?: string | null
  videoUrl?: string | null
  repositoryUrl?: string | null
  presentationUrl?: string | null
  thumbnailUrl?: string | null
  technologies?: string[] | null
  submittedAt?: string | null
  createdAt?: string | null
}

export interface CreateProjectRequest {
  teamId: string
  name: string
  tagline?: string
  description?: string
  demoUrl?: string
  videoUrl?: string
  repositoryUrl?: string
  presentationUrl?: string
  technologies?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  tagline?: string
  description?: string
  demoUrl?: string
  videoUrl?: string
  repositoryUrl?: string
  presentationUrl?: string
  thumbnailUrl?: string
  technologies?: string[]
}

// Judging types
export interface JudgingCriteria {
  id: string
  hackathonId: string
  name: string
  description?: string | null
  maxScore: number
  weight: number
  displayOrder: number
}

export interface CreateJudgingCriteriaRequest {
  name: string
  description?: string
  maxScore?: number
  weight?: number
  displayOrder?: number
}

export interface UpdateJudgingCriteriaRequest {
  name?: string
  description?: string
  maxScore?: number
  weight?: number
  displayOrder?: number
}

export interface Score {
  id: string
  criteriaId: string
  criteriaName: string
  score: number
  maxScore: number
  feedback?: string | null
}

export interface JudgeAssignment {
  id: string
  hackathonId: string
  judgeId: string
  projectId: string
  projectName: string
  assignedAt: string
  completedAt?: string | null
  scores?: Score[] | null
}

export interface SubmitScoreRequest {
  criteriaId: string
  score: number
  feedback?: string
}

export interface SubmitScoresRequest {
  scores: SubmitScoreRequest[]
}

export interface JudgeInfo {
  userId: string
  email: string
  firstName: string
  lastName: string
  displayName?: string | null
  projectsScored: number
  totalProjects: number
  isOrganizer: boolean
}

export interface AddJudgeRequest {
  userId: string
}

export interface CriteriaAverage {
  criteriaId: string
  criteriaName: string
  averageScore: number
  maxScore: number
}

export interface LeaderboardEntry {
  rank: number
  projectId: string
  projectName: string
  teamId: string
  teamName: string
  totalScore: number
  criteriaAverages: CriteriaAverage[]
}

// Schedule and Events types
export type EventType =
  | "workshop"
  | "presentation"
  | "meal"
  | "deadline"
  | "ceremony"
  | "networking"
  | "other"

export type RsvpStatus = "attending" | "maybe" | "not_attending"

export interface ScheduleEvent {
  id: string
  hackathonId: string
  name: string
  description?: string | null
  eventType: EventType
  location?: string | null
  virtualLink?: string | null
  startsAt: string
  endsAt: string
  isMandatory: boolean
  attendingCount: number
  maybeCount: number
  notAttendingCount: number
  userRsvpStatus?: string | null
  userAttended?: boolean | null
}

export interface EventAttendee {
  id: string
  eventId: string
  userId: string
  firstName: string
  lastName: string
  email: string
  rsvpStatus?: string | null
  attended: boolean
}

export interface CreateScheduleEventRequest {
  hackathonId: string
  name: string
  description?: string
  eventType: EventType
  location?: string
  virtualLink?: string
  startsAt: string
  endsAt: string
  isMandatory?: boolean
}

export interface UpdateScheduleEventRequest {
  name?: string
  description?: string
  eventType?: EventType
  location?: string
  virtualLink?: string
  startsAt?: string
  endsAt?: string
  isMandatory?: boolean
}

export interface RsvpRequest {
  rsvpStatus: RsvpStatus
}

export interface MarkAttendanceRequest {
  userId: string
  attended: boolean
}

export interface BulkMarkAttendanceRequest {
  userIds: string[]
  attended: boolean
}

// Organizer types
export interface OrganizerInfo {
  userId: string
  email: string
  firstName: string
  lastName: string
  displayName?: string | null
  avatarUrl?: string | null
}

// Participant types
export interface Participant {
  name: string
  email: string
  registeredAt: string
  teamName?: string | null
  isTeamLeader: boolean
}

// Session types
export interface SessionResponse {
  id: string
  deviceInfo: string | null
  ipAddress: string | null
  lastActivityAt: string
  createdAt: string
  isCurrent: boolean
}
