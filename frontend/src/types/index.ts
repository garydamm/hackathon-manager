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
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  displayName?: string
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
